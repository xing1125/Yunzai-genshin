import _ from "lodash"
import fs from "node:fs"
import { MysInfo, base, gsCfg } from "#index"
import { saveGameData } from "../../../model/gameData.js"

export default class explore extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "sr_index")
  }

  /** 探索数据 */
  async get () {
    let ApiData = {
      index: "",
      character: "",
      basicInfo: "",
      grid_fight: ""
    }
    let res = await MysInfo.get(this.e, ApiData, {}, {}, true)
    if (!res || res[0].retcode !== 0 || res[2].retcode !== 0) return false
    let ret = []
    res.forEach(v => ret.push(v.data))
    let data = {
      ...this.screenData,
      ...this.dealData(ret)
    }
    return data
  }

  dealData (data) {
    let [resIndex, resDetail, roleIndex, resGrid] = data
    saveGameData("sr", this.e.uid || roleIndex?.game_uid || roleIndex?.uid, {
      avatar: resIndex.cur_head_icon_url || roleIndex?.game_head_icon || roleIndex?.avatar || "",
      name: roleIndex?.nickname || resIndex.role?.nickname || "",
      level: roleIndex?.level || resIndex.role?.level || 0
    })
    let currencyLevel = resGrid.grid_fight_brief.division.name_with_num || "-"
    let avatars = resDetail.avatar_list || []
    for (let avatar of avatars) {
      let rarity = avatar.rarity
      let liveNum = avatar.rank
      let level = avatar.level
      let id = avatar.id - 1000
      if (rarity >= 5) rarity = 5
      avatar.sortLevel = level
      /** id倒序，最新出的角色排前面 */
      avatar.sort = rarity * 100000 + liveNum * 10000 + level * 100 + id
      for (let type of ["role", "weapon"]) {
        if (type == "weapon" && !avatar.equip) continue
        avatar[`${type}Img`] = `${this.screenData.genshinPath}StarRail/img/${type}/${type == "role" ? avatar.name : avatar.equip.name}.webp`
        if (!fs.existsSync(avatar[`${type}Img`])) { avatar[`${type}Img`] = type == "role" ? avatar.icon : avatar.equip.icon }
      }
    }
    let stats = resIndex.stats || {}
    let line = [
      [
        { lable: "活跃天数", num: stats.active_days, extra: Math.floor((new Date() - new Date("2023-04-25")) / (1000 * 60 * 60 * 24)) },
        { lable: "已解锁角色", num: stats.avatar_num, extra: this.lable.avatar },
        { lable: "战利品开启", num: stats.chest_num, extra: this.lable.chest }
      ]
    ]
    if (avatars.length > 0) {
      /** 重新排序 */
      avatars = _.chain(avatars).orderBy(["sortLevel"], ["desc"])
      avatars = avatars.orderBy(["sort"], ["desc"]).value()
    }
    let abyssflore = stats?.abyss_process || "-"
    let other = [
      [
        { lable: "达成成就数", num: stats.achievement_num, extra: this.lable.achievement },
        { lable: "逐光捡金", num: abyssflore || "-" },
        { lable: "差分宇宙", num: stats.season_title || "-" },
        { lable: "货币战争", num: currencyLevel },
        { lable: "梦境护照贴纸", num: stats.dream_paster_num, extra: this.lable.dream_paster }
      ]
    ]
    if (stats.pet_num !== undefined) {
      other[0].push({ lable: "随宠款式", num: stats.pet_num })
    }
    if (stats.peak_rank_icon) {
      other[0].push({
        lable: "异相仲裁",
        icon: stats.peak_rank_icon
      })
    }
    return {
      line,
      avatars,
      other,
      background_url: resIndex.phone_background_image_url,
      game_head_icon: resIndex.cur_head_icon_url,
      frame_url: resIndex.head_icon_frame_url,
      roleIndex
    }
  }

  /** 战利品数据 */
  async getChest () {
    let res = await MysInfo.get(this.e, "chest")
    if (res?.retcode !== 0) return false
    let totalWorldMax = 0
    let totalWorldCur = 0
    res.data.world_list.forEach((world) => {
      totalWorldMax += parseInt(world.world_max)
      totalWorldCur += parseInt(world.world_cur)
    })
    let chest = await MysInfo.get(this.e, "index")
    if (chest?.retcode !== 0) return false
    return {
      ...this.screenData,
      list: res.data.world_list,
      maxchest: this.lable.chest,
      curchest: chest.data.stats.chest_num,
      totalWorldMax,
      totalWorldCur
    }
  }

  /** 成就数据 */
  async getAchieve () {
    let res = await MysInfo.get(this.e, "achievement")
    if (res?.retcode !== 0) return false
    let achData = res.data
    let list = achData.list
    let achievementCur = +res.data.gold_num + +res.data.silver_num + +res.data.copper_num
    let data = {
      ...this.screenData,
      list,
      achData,
      achievementCur,
      achievementmax: this.lable.achievement
    }
    return data
  }
}
