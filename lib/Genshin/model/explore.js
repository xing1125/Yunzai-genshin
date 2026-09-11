import _ from "lodash"
import { base, gsCfg, MysInfo, Character } from "#index"
import { saveGameData } from "../../../model/gameData.js"

export default class explore extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "gs_index")
    this.area = {
      蒙德: 1,
      璃月: 2,
      龙脊雪山: 3,
      稻妻: 4,
      渊下宫: 5,
      层岩巨渊: 6,
      层岩地下: 7,
      须弥: 8,
      枫丹: 9,
      沉玉谷: 10,
      来歆山: 11,
      旧日之海: 14,
      纳塔: 15,
      远古圣山: 16,
      挪德卡莱: 17,
      风息山: 18,
      空之神殿: 19,
      至冬: 20
    }
    this.all_chest = 0
    _.forEach(this.lable, (v, i) => {
      if (i.includes("_chest")) this.all_chest += v
    })
    this.areaName = _.invert(this.area)
  }

  async roleExplore () {
    let ApiData = {
      index: "",
      basicInfo: ""
    }
    let res = await MysInfo.get(this.e, ApiData)
    if (!res || res[0].retcode !== 0) return false
    let ret = []
    res.forEach((v) => ret.push(v.data))
    return await this.roleExploreData(ret)
  }

  async roleExploreData (res) {
    let [resIndex, basicInfo] = res
    let stats = resIndex.stats
    let all_chest = 0
    _.forEach(stats, (v, i) => {
      if (i.includes("_chest") && typeof v === "number") all_chest += v
    })
    const percentage = _.round((all_chest / this.all_chest) * 100, 2)
    let afterPercentage =
      (percentage < 60
        ? "D"
        : percentage < 70
          ? "C"
          : percentage < 80
            ? "B"
            : percentage < 90
              ? "A"
              : "S") + `[${percentage}%]`
    resIndex.world_explorations = _.orderBy(resIndex.world_explorations, ["id"], ["desc"])
    let explor = []
    let worldExplorations = []
    for (let val of resIndex.world_explorations) {
      if (!Object.values(this.area).includes(val.id)) continue
      val.name = this.areaName[val.id] ? this.areaName[val.id] : _.truncate(val.name, { length: 6 })
      if (val.id == 10) {
        let children = resIndex.world_explorations.filter(o => [11, 12, 13].includes(o.id))
        val.exploration_percentage = eval(children.map(v => v.exploration_percentage).join("+")) / 3 | 0
        if (val.exploration_percentage > 1000) {
          val.exploration_percentage = 1000
        }
      }

      const getOfferingDisplayName = (offering) => {
        const name = offering?.name?.trim?.() || ""
        const offeringNameMap = {
          终夜长茔: "终夜长茔",
          叮铃哐啷蛋卷工坊: "蛋卷工坊",
          霜月之坊: "霜月之坊",
          魔女的花园: "魔女花园",
          西风戍垒: "西风戍垒",
          望崖营壁: "望崖营壁",
          努尔寂石阵列: "寂石阵列",
          幕形态黑体物: "幕形黑体",
          影域解析装置: "影域解析",
          科洛列夫茨基剧院: "科洛剧院"
        }
        if (offeringNameMap[name]) return offeringNameMap[name]
        const matchedName = Object.keys(offeringNameMap).find(key => name.includes(key))
        return matchedName ? offeringNameMap[matchedName] : name.slice(0, 6)
      }
      let regionData = {
        id: val.id,
        name: val.name,
        exploration_percentage: val.exploration_percentage,
        level: val.level || 0,
        seven_statue_level: val.seven_statue_level || 0,
        offerings: (val.offerings || []).map(offering => ({
          ...offering,
          display_name: getOfferingDisplayName(offering)
        })),
        icon: val.icon || "",
        background_image: val.background_image || "",
        area_exploration_list: [],
        boss_list: val.boss_list || [],
        natan_reputation: val.natan_reputation || null,
        sub_explorations: []
      }
      // 处理boss名称显示
      const processBossList = (bossList) => {
        if (!bossList || !bossList.length) return bossList
        return bossList.map(boss => {
          const bossNameMap = {
            秘源机兵·构型械: "构型械",
            秘源机兵·统御械: "统御械",
            守望者·堕天: "堕天"
          }
          return {
            ...boss,
            display_name: bossNameMap[boss.name] || boss.name.split("·").pop() || boss.name.slice(0, 4)
          }
        })
      }
      // 处理初始boss_list
      regionData.boss_list = processBossList(regionData.boss_list)
      // 处理蒙德+雪山+风息山的数据
      if (val.id == 1) {
        let dragonspine = _.find(resIndex.world_explorations, function (o) {
          return o.id == 3
        })
        let windbreathMountain = _.find(resIndex.world_explorations, function (o) {
          return o.id == 18
        })
        // 先添加蒙德主区域的探索度
        if (val.area_exploration_list && val.area_exploration_list.length > 0) {
          regionData.area_exploration_list = [...val.area_exploration_list]
        }
        if (dragonspine) {
          // 添加雪山的独立探索度条
          regionData.sub_explorations.push({
            name: "雪山",
            exploration_percentage: dragonspine.exploration_percentage
          })
          // 合并雪山的BOSS
          if (dragonspine.boss_list) {
            regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(dragonspine.boss_list)]
          }
          // 合并雪山的offerings
          if (dragonspine.offerings && dragonspine.offerings.length > 0) {
            regionData.offerings = [...(regionData.offerings || []), ...dragonspine.offerings.map(offering => ({
              ...offering,
              display_name: getOfferingDisplayName(offering)
            }))]
          }
        }
        if (windbreathMountain) {
          // 添加风息山的独立探索度条
          regionData.sub_explorations.push({
            name: "风息山",
            exploration_percentage: windbreathMountain.exploration_percentage
          })
          // 合并风息山的BOSS
          if (windbreathMountain.boss_list) {
            regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(windbreathMountain.boss_list)]
          }
          // 合并风息山的offerings
          if (windbreathMountain.offerings && windbreathMountain.offerings.length > 0) {
            regionData.offerings = [...(regionData.offerings || []), ...windbreathMountain.offerings.map(offering => ({
              ...offering,
              display_name: getOfferingDisplayName(offering)
            }))]
          }
        }
      }
      // 处理璃月+沉玉谷+层岩巨渊的数据
      if (val.id == 2) {
        let chenYuVale = _.find(resIndex.world_explorations, function (o) {
          return o.id == 10
        })
        let chasm = _.find(resIndex.world_explorations, function (o) {
          return o.id == 6
        })
        // 先添加璃月主区域的探索度
        if (val.area_exploration_list && val.area_exploration_list.length > 0) {
          regionData.area_exploration_list = [...val.area_exploration_list]
        }
        if (chenYuVale) {
          // 处理沉玉谷的子区域数据，添加为独立探索度条
          let children = resIndex.world_explorations.filter(o => [11, 12, 13].includes(o.id))
          children.forEach(child => {
            let childName = child.name
            if (child.id == 12) childName = "沉玉谷·南陵"
            if (child.id == 13) childName = "沉玉谷·上谷"
            if (child.id == 11) childName = "来歆山"
            regionData.sub_explorations.push({
              name: childName,
              exploration_percentage: child.exploration_percentage
            })
          })
          // 合并沉玉谷相关的BOSS
          if (chenYuVale.boss_list) {
            regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(chenYuVale.boss_list)]
          }
          // 合并子区域的BOSS
          children.forEach(child => {
            if (child.boss_list) {
              regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(child.boss_list)]
            }
          })
          // 合并沉玉谷的offerings
          if (chenYuVale.offerings && chenYuVale.offerings.length > 0) {
            regionData.offerings = [...(regionData.offerings || []), ...chenYuVale.offerings]
          }
        }
        if (chasm) {
          // 添加层岩巨渊的独立探索度条
          regionData.sub_explorations.push({
            name: "层岩巨渊",
            exploration_percentage: chasm.exploration_percentage
          })
          // 添加层岩地下矿区的独立探索度条
          let underground = _.find(resIndex.world_explorations, function (o) {
            return o.id == 7
          })
          if (underground) {
            regionData.sub_explorations.push({
              name: "层岩巨渊·地下矿区",
              exploration_percentage: underground.exploration_percentage
            })
            // 合并地下矿区的BOSS
            if (underground.boss_list) {
              regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(underground.boss_list)]
            }
          }
          // 合并层岩巨渊的BOSS
          if (chasm.boss_list) {
            regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(chasm.boss_list)]
          }
          // 合并层岩巨渊的offerings
          if (chasm.offerings && chasm.offerings.length > 0) {
            regionData.offerings = [...(regionData.offerings || []), ...chasm.offerings]
          }
        }
      }
      // 处理稻妻+渊下宫的数据
      if (val.id == 4) {
        let enkanomiya = _.find(resIndex.world_explorations, function (o) {
          return o.id == 5
        })
        // 先添加稻妻主区域的探索度
        if (val.area_exploration_list && val.area_exploration_list.length > 0) {
          regionData.area_exploration_list = [...val.area_exploration_list]
        }
        if (enkanomiya) {
          // 添加渊下宫的独立探索度条
          regionData.sub_explorations.push({
            name: "渊下宫",
            exploration_percentage: enkanomiya.exploration_percentage
          })
          // 合并渊下宫的BOSS
          if (enkanomiya.boss_list) {
            regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(enkanomiya.boss_list)]
          }
          // 合并渊下宫的offerings
          if (enkanomiya.offerings && enkanomiya.offerings.length > 0) {
            regionData.offerings = [...(regionData.offerings || []), ...enkanomiya.offerings]
          }
        }
      }
      // 处理枫丹+旧日之海的数据
      if (val.id == 9) {
        let oldSea = _.find(resIndex.world_explorations, function (o) {
          return o.id == 14
        })
        // 先添加枫丹主区域的探索度
        if (val.area_exploration_list && val.area_exploration_list.length > 0) {
          regionData.area_exploration_list = [...val.area_exploration_list]
        }
        if (oldSea) {
          // 添加旧日之海的独立探索度条
          regionData.sub_explorations.push({
            name: "旧日之海",
            exploration_percentage: oldSea.exploration_percentage
          })
          // 合并旧日之海的BOSS
          if (oldSea.boss_list) {
            regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(oldSea.boss_list)]
          }
          // 合并旧日之海的offerings
          if (oldSea.offerings && oldSea.offerings.length > 0) {
            regionData.offerings = [...(regionData.offerings || []), ...oldSea.offerings]
          }
        }
      }
      // 处理纳塔+远古圣山的数据
      if (val.id == 15) {
        let ancientMount = _.find(resIndex.world_explorations, function (o) {
          return o.id == 16
        })
        // 先添加纳塔主区域的探索度
        if (val.area_exploration_list && val.area_exploration_list.length > 0) {
          regionData.area_exploration_list = [...val.area_exploration_list]
        }
        if (ancientMount) {
          // 添加远古圣山的独立探索度条
          regionData.sub_explorations.push({
            name: "远古圣山",
            exploration_percentage: ancientMount.exploration_percentage
          })
          // 合并远古圣山的BOSS
          if (ancientMount.boss_list) {
            regionData.boss_list = [...(regionData.boss_list || []), ...processBossList(ancientMount.boss_list)]
          }
          // 合并远古圣山的offerings
          if (ancientMount.offerings && ancientMount.offerings.length > 0) {
            regionData.offerings = [...(regionData.offerings || []), ...ancientMount.offerings]
          }
        }
      }
      // 处理挪德卡莱的数据
      if (val.id == 17) {
        // 为挪德卡莱添加新月神像标识
        regionData.seven_statue_name = "新月神像"
      }
      // 处理空之神殿的数据 (ID: 19)
      if (val.id == 19) {
        if (val.offerings && val.offerings.length > 0) {
          regionData.offerings = val.offerings.map(offering => ({
            ...offering,
            display_name: offering.name.includes("·") ? offering.name.split("·").pop() : offering.name.slice(0, 4),
            use_local_icon: true
          }))
        }
      }
      // 处理风息山 (ID: 18)
      if (val.id == 18) {
        // 风息山是子区域，不需要额外处理
      }
      // // 处理风息山 (ID: 18)
      // if (val.id == 18) {
      //   regionData.seven_statue_name = "某种神像名称" // 根据实际游戏设定修改
      //   if (val.area_exploration_list) {
      //     regionData.area_exploration_list = val.area_exploration_list
      //   }
      // }

      // // 处理空之神殿 (ID: 19)
      // if (val.id == 19) {
      //   regionData.seven_statue_name = "某种神像名称"
      //   if (val.area_exploration_list) {
      //     regionData.area_exploration_list = val.area_exploration_list
      //   }
      // }
      // 如果没有特殊处理且有area_exploration_list，直接使用
      if (![1, 2, 4, 9, 15].includes(val.id) && val.area_exploration_list) {
        regionData.area_exploration_list = val.area_exploration_list
      }
      // 只显示主要区域（排除子区域）
      if (![3, 5, 6, 7, 10, 11, 12, 13, 14, 16, 18].includes(val.id)) {
        worldExplorations.push(regionData)
      }

      let tmp = {
        name: val.name,
        line: [
          {
            name: val.name,
            text: `${val.exploration_percentage / 10}%`
          }
        ]
      }
      if (["蒙德", "璃月", "稻妻", "须弥", "枫丹"].includes(val.name)) { tmp.line.push({ name: "声望", text: `${val.level}级` }) }
      if (val.id == 6) {
        let underground = _.find(resIndex.world_explorations, function (o) {
          return o.id == 7
        })
        if (underground) {
          tmp.line.push({
            name: this.areaName[underground.id],
            text: `${underground.exploration_percentage / 10}%`
          })
        }
      } else if (val.id == 11) {
        let children = resIndex.world_explorations.filter(o => [12, 13].includes(o.id))
        children.forEach(o => {
          tmp.line.push({
            name: o.name.replace("\u8c37\u00b7", ""),
            text: `${o.exploration_percentage / 10}%`
          })
        })
      }
      if (["雪山", "稻妻", "层岩巨渊", "须弥", "枫丹", "沉玉谷", "纳塔", "挪德卡莱", "空之神殿", "至冬"].includes(val.name)) {
        let offering = regionData.offerings?.[0] || val.offerings[0]
        let offeringName = offering.display_name || offering.name
        tmp.line.push({
          name: offeringName,
          text: `${offering.level}级`
        })
      }
      explor.push(tmp)
    }
    const exploreInfo = {}
    exploreInfo.role = resIndex.role
    await saveGameData("gs", this.e.uid || resIndex.role?.game_uid || resIndex.role?.uid, {
      avatar: resIndex.role?.game_head_icon || resIndex.role?.AvatarUrl || resIndex.role?.avatar || resIndex.role?.image || "",
      name: resIndex.role?.nickname || basicInfo?.nickname || "",
      level: resIndex.role?.level || basicInfo?.level || 0
    })
    exploreInfo.avatars = resIndex.avatars.filter(i => i.is_chosen)
    if (exploreInfo.avatars.length < 11) {
      exploreInfo.avatars = resIndex.avatars.splice(0, 11)
    }
    let explores = {
      line: [
        { lable: "活跃天数", num: stats.active_day_number, extra: Math.floor((new Date() - new Date("2020-09-15")) / (1000 * 60 * 60 * 24)) + 1 },
        { lable: "深境螺旋", num: stats.spiral_abyss },
        { lable: "幻想真境剧诗", num: !stats.role_combat.is_unlock ? "未解锁" : !stats.role_combat.has_detail_data ? "-" : `第${stats.role_combat.max_round_id}幕${stats.role_combat.tarot_finished_cnt > 0 ? ` 圣牌${stats.role_combat.tarot_finished_cnt}` : ""}` },
        { lable: "宝箱获取率", num: afterPercentage }
      ],
      other: [
        { lable: "获得角色数", num: stats.avatar_number, extra: this.lable.avatar },
        { lable: "满好感角色数", num: stats.full_fetter_avatar_num, extra: this.lable.avatar - 3 },
        { lable: "成就达成数", num: stats.achievement_number, extra: this.lable.achievement },
        { lable: "幽境危战", num: gsCfg.roman[stats.hard_challenge?.difficulty] || "-" },
        { lable: "解锁传送点", num: stats.way_point_number, extra: this.lable.way_point },
        { lable: "解锁秘境", num: stats.domain_number, extra: this.lable.domain },
        { lable: "冰神瞳", num: stats.iceculus_number, extra: this.lable.iceculus },
        { lable: "月神瞳", num: stats.moonoculus_number, extra: this.lable.moonoculus },
        { lable: "风神瞳", num: stats.anemoculus_number, extra: this.lable.anemoculus },
        { lable: "岩神瞳", num: stats.geoculus_number, extra: this.lable.geoculus },
        { lable: "雷神瞳", num: stats.electroculus_number, extra: this.lable.electroculus },
        { lable: "草神瞳", num: stats.dendroculus_number, extra: this.lable.dendroculus },
        { lable: "水神瞳", num: stats.hydroculus_number, extra: this.lable.hydroculus },
        { lable: "火神瞳", num: stats.pyroculus_number, extra: this.lable.pyroculus },
        { lable: "华丽宝箱数", num: stats.luxurious_chest_number, extra: this.lable.luxurious_chest },
        { lable: "珍贵宝箱数", num: stats.precious_chest_number, extra: this.lable.precious_chest },
        { lable: "精致宝箱数", num: stats.exquisite_chest_number, extra: this.lable.exquisite_chest },
        { lable: "普通宝箱数", num: stats.common_chest_number, extra: this.lable.common_chest },
        { lable: "奇馈宝箱数", num: stats.magic_chest_number, extra: this.lable.magic_chest },
        { lable: "总宝箱数", num: all_chest, extra: this.all_chest }
      ]
    }
    const bgImage = await gsCfg.gsBgImage()
    return {
      stats,
      lablenumber: this.lable,
      basicInfo,
      ...this.screenData,
      homeindex: resIndex?.homes[_.random(0, resIndex.homes.length - 1)],
      role: resIndex?.role,
      ...exploreInfo,
      explores,
      explor,
      worldExplorations,
      bgImage
    }
  }

  get roleSum () {
    let chars = gsCfg.getdefSet("role", "role")
    chars = Object.keys(chars).filter(v => Character.get(v).isRelease)
    return chars.length
  }
}
