import _ from "lodash"
import fs from "node:fs"
import { gsCfg, MysInfo, base, Character } from "#index"

export default class srRoleIndex extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "sr_index")
  }

  /** 练度统计 */
  static async get (e) {
    let roleList = new srRoleIndex(e)
    return await roleList.getData()
  }

  /** *角色 */
  async getIndex () {
    let ApiData = {
      index: "",
      brief: ""
    }
    let res = await MysInfo.get(this.e, ApiData)
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) return false
    return {
      ...this.screenData,
      ...this.dealData(res)
    }
  }

  dealData (res) {
    let avatars = res[0].data.avatar_list || []
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
        if (type === "weapon" && !avatar.equip) continue
        avatar[`${type}Img`] = `${this.screenData.genshinPath}StarRail/img/${type}/${type === "role" ? avatar.name : avatar.equip.name}.webp`
        if (!fs.existsSync(avatar[`${type}Img`])) avatar[`${type}Img`] = type === "role" ? avatar.icon : avatar.equip.icon
      }
    }
    if (avatars.length > 0) {
      /** 重新排序 */
      avatars = _.chain(avatars).orderBy(["sortLevel"], ["desc"])
      avatars = avatars.orderBy(["sort"], ["desc"]).value()
    }
    let stats = res[0].data.stats || {}
    let line = [
      [
        { lable: "角色数", num: stats.avatar_num, extra: this.roleSum },
        { lable: "成就", num: stats.achievement_num, extra: this.lable.achievement },
        { lable: "战利品", num: stats.chest_num, extra: this.lable.chest },
        { lable: "梦境贴纸", num: stats.dream_paster_num, extra: this.lable.dream_paster }
      ]
    ]
    let challengeType = {
      Chasm: "忘却之庭",
      Story: "虚构叙事",
      Boss: "末日幻影"
    }
    let list = res[1].data.list || []
    let schedule = [
      [
        { lable: challengeType[list[0].challenge_type], num: list[0].cur_schedule.finish_star_count, extra: list[0].cur_schedule.total_star_count },
        { lable: challengeType[list[1].challenge_type], num: list[1].cur_schedule.finish_star_count, extra: list[1].cur_schedule.total_star_count },
        { lable: challengeType[list[2].challenge_type], num: list[2].cur_schedule.finish_star_count, extra: list[2].cur_schedule.total_star_count }
      ]
    ]
    return {
      activeDay: this.dayCount(stats.active_days),
      line,
      schedule,
      avatars,
      abbr: gsCfg.getdefSet("role", "sortName").sortName
    }
  }

  dayCount (num) {
    let daysDifference = Math.floor((new Date() - new Date("2023-04-25")) / (1000 * 60 * 60 * 24))
    return ("活跃天数：" + Math.floor(num) + `/${daysDifference}天`)
  }

  get roleSum () {
    let chars = gsCfg.getdefSet("role", "sr_name")
    chars = _.keys(chars).filter(v => Character.get(v, "sr").isRelease)
    return chars.length + 1
  }
}