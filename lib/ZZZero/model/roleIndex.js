import moment from "moment"
import { MysInfo, gsCfg, base } from "#index"
export default class roleIndex extends base {
  constructor (e) {
    super(e)
    this.model = "roleIndex"
    this.lable = gsCfg.getdefSet("index", "zzz_index")
  }

  static async get (e) {
    let role = new this(e)
    return role.getIndex()
  }

  /** 获取角色详情数据 */
  async getIndex () {
    let ApiData = {
      index: "",
      basicInfo: "",
      character: "",
      buddy: "",
      tower: ""
    }
    let res = await MysInfo.get(this.e, ApiData)
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0 || res[2].retcode !== 0 || res[3].retcode !== 0 || res[4].retcode !== 0) return false
    let data = {
      ...this.screenData,
      uid: this.e.uid,
      ...this.formatData(res[0].data, res[1].data, res[2].data, res[3].data, res[4].data)
    }
    return data
  }

  /** 获取邦布数据 */
  async getData () {
    let ApiData = {
      buddy: "",
      basicInfo: ""
    }
    let res = await MysInfo.get(this.e, ApiData)
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) return false
    let buddyData = res[0].data
    let basicInfo = res[1].data
    return {
      ...this.screenData,
      uid: this.e.uid,
      name: basicInfo?.nickname || "代理人",
      list: buddyData?.list || []
    }
  }

  /** 格式化数据 */
  formatData (indexData, basicInfo, characterData, buddyData, towerData) {
    let stats = indexData.stats || {}
    let avatarList = characterData.avatar_list || []
    let buddyList = buddyData.list || []
    let baseInfo = {
      name: indexData.game_data_show?.personal_title || basicInfo?.nickname || "代理人",
      level: stats.world_level_name || "",
      activeDays: stats.active_days || 0,
      avatarNum: stats.avatar_num || 0,
      buddyNum: stats.buddy_num || 0,
      achievementCount: stats.achievement_count || 0,
      memoryBattleScore: stats.memory_battlefield?.total_score || 0,
      climbingTowerLayer: stats.climbing_tower_layer || 0,
      commemorativeCoins: stats.commemorative_coins_list?.[0]?.num || 0,
      curHeadIconUrl: indexData.cur_head_icon_url || basicInfo?.avatar || "",
      medalList: indexData.game_data_show?.all_medal_list || [],
      cardUrl: indexData.game_data_show?.card_url || ""
    }
    const abbreviateNumber = (num) => {
      num = Number(num) || 0
      if (num >= 1000000) {
        const v = (num / 1000000)
        return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "m"
      }
      if (num >= 10000) {
        const v = (num / 10000)
        return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "w"
      }
      if (num >= 1000) {
        const v = (num / 1000)
        return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "k"
      }
      return String(num)
    }
    if (Array.isArray(baseInfo.medalList)) {
      baseInfo.medalList = baseInfo.medalList.map(val => {
        if (val && typeof val === "object" && val.number !== undefined) {
          return { ...val, number: abbreviateNumber(val.number) }
        }
        return val
      })
    }
    let avatars = avatarList.map(avatar => {
      return {
        id: avatar.id,
        name: avatar.name_mi18n,
        fullName: avatar.full_name_mi18n,
        level: avatar.level,
        rarity: avatar.rarity,
        elementType: avatar.element_type,
        elementIcon: this.getElementIcon(avatar.element_type),
        profession: avatar.avatar_profession,
        professionIcon: this.getProfessionIcon(avatar.avatar_profession),
        camp: avatar.camp_name_mi18n,
        rank: avatar.rank,
        roleSquareUrl: avatar.role_square_url,
        groupIconPath: avatar.group_icon_path,
        hollowIconPath: avatar.hollow_icon_path,
        subElementType: avatar.sub_element_type,
        awakenState: avatar.awaken_state
      }
    }, this)
    let buddies = buddyList.map(buddy => {
      return {
        id: buddy.id,
        name: buddy.name,
        rarity: buddy.rarity,
        level: buddy.level,
        star: buddy.star,
        bangbooSquareUrl: buddy.bangboo_square_url
      }
    })
    let coinsTotal = 0
    if (Array.isArray(stats.commemorative_coins_list)) {
      coinsTotal = stats.commemorative_coins_list.reduce((sum, c) => sum + (Number(c?.num) || 0), 0)
    }
    let explores = {
      line: [
        { lable: "活跃天数", num: stats.active_days, extra: moment().diff(moment("2024-07-04"), "days") + 1 },
        { lable: "危局强袭战", num: stats.memory_battlefield?.total_score || "-" },
        { lable: "临界推演", num: stats.void_front_brief?.total_score || "-" }
      ],
      other: [
        { lable: "鏖战试炼·荣耀", num: stats.climbing_tower_s3?.layer_info?.climbing_tower_layer || "-" },
        { lable: "式舆防卫战防线", num: stats.all_change_zone_layer_count ? "第" + stats.all_change_zone_layer_count + "防线" : "-" },
        { lable: "拟真鏖战试炼", num: stats.climbing_tower_layer || stats.climbing_tower_s2?.climbing_tower_layer || "-" },
        { lable: "获得代理人数", num: stats.avatar_num, extra: this.lable.avatar },
        { lable: "获得邦布数", num: stats.buddy_num, extra: this.lable.buddy },
        { lable: "达成成就数", num: stats.achievement_count, extra: this.lable.achievement },
        { lable: "随便观复兴等级", num: stats.temple_data?.level },
        { lable: "断层之谜", num: stats.next_hundred_layer || "-" },
        { lable: "绳网声望", num: stats.world_level_name || "-" },
        { lable: "调查协会纪念币", num: coinsTotal, extra: this.lable.commemorative_coins }
      ]
    }
    let towerBlocks = []
    if (towerData) {
      const s1 = towerData.climbing_tower_s1 || {}
      const s2 = towerData.climbing_tower_s2 || {}
      const s3 = towerData.climbing_tower_s3 || {}
      const s3LayerInfo = s3.layer_info || {}
      const s3MvpInfo = s3.mvp_info || {}
      let formatScore = (score) => {
        if (!score || score === 0) return "-"
        if (score >= 1000) {
          return (score / 1000).toFixed(1) + "K"
        }
        if (score >= 10000) {
          return (score / 10000).toFixed(1) + "W"
        }
        if (score >= 1000000) {
          return (score / 1000000).toFixed(1) + "M"
        }
        return score.toString()
      }
      const isUnlocked = s3LayerInfo.climbing_tower_layer >= 50

      towerBlocks = [
        {
          title: "鏖战试炼·荣耀",
          bgType: "s3",
          icon: s3LayerInfo.medal_icon || "",
          data: [
            { label: "通关层数", value: s3LayerInfo.climbing_tower_layer ?? "-" },
            { label: "累计总分", value: formatScore(s3LayerInfo.total_score) },
            { label: "累计获得", value: isUnlocked ? (s3MvpInfo.floor_mvp_num ?? 0) : "50层后解锁" },
            { label: "奖章排行", value: s3MvpInfo.rank_percent ? (s3MvpInfo.rank_percent / 100).toFixed(1) + "%" : "-" }
          ],
          rank_list: (s3.display_avatar_rank_list || []).map(r => ({
            avatar_icon: r.icon,
            name: r.name,
            score: formatScore(r.score),
            percent: `${Math.round((Number(r.rank_percent) || 0) / 100)}%`
          }))
        },
        {
          title: "拟真鏖战试炼",
          rightIcon: s1.medal_icon || "",
          rightNum: s1.climbing_tower_layer ?? "-",
          bgType: "light"
        },
        {
          title: "鏖战试炼：未路",
          subTitle: "限时玩法： 2025.01.22 - 2025.07.15",
          rightGroup: [
            { icon: "local:climbing", num: s2.floor_mvp_num ?? 0, local: true },
            { icon: s2.medal_icon || "", num: s2.climbing_tower_layer ?? 0 }
          ],
          bgType: "dark"
        }
      ]
    }
    return {
      baseInfo,
      avatars,
      buddies,
      avatarCount: avatars.length,
      buddyCount: buddies.length,
      explores,
      towerBlocks,
      abbr: gsCfg.getdefSet("role", "sortName").sortName
    }
  }

  /** 获取元素类型图标 */
  getElementIcon (elementType) {
    let elementMap = {
      200: "phy", // 物理
      201: "fire", // 火
      202: "ice", // 冰
      203: "elec", // 雷
      205: "ether" // 以太
    }
    return elementMap[elementType] || "phy"
  }

  /** 获取职业图标 */
  getProfessionIcon (profession) {
    let professionMap = {
      1: "attack", // 攻击
      2: "breakthrough", // 强攻
      3: "anomaly", // 异常
      4: "support", // 支援
      5: "defensive", // 防护
      6: "support" // 支援
    }
    return professionMap[profession] || "attack"
  }
}
