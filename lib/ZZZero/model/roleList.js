import _ from "lodash"
import { MysInfo, MysApi, gsCfg, base } from "#index"

export default class RoleList extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "zzz_index")
    this.rarityMap = { S: 5, A: 4, B: 3 }
  }

  static async get (e) {
    let roleList = new RoleList(e)
    return await roleList.getData(false)
  }

  static async getWeapon (e) {
    let roleList = new RoleList(e)
    return await roleList.getData(true)
  }

  async getData (isWeapon = false) {
    let res = await MysInfo.get(this.e, "character", {}, { log: false })
    if (!res || res.retcode !== 0) return false
    let uid = await MysInfo.getUid(this.e)
    let avatars = res.data.avatar_list
    if (!avatars.length) return false
    /** 判断是否绑定了ck */
    this.ck = await MysInfo.checkUidBing(uid, this.e.game || "zzz")
    if (this.ck) {
      const option = { log: false, game: this.e.game || "zzz" }
      this.mysApi = new MysApi(uid, this.ck.ck, option)
      this.mysApi.cacheCd = 1800
      avatars = await this.getAvatarDetails(avatars)
    }
    const dealt = isWeapon ? this.dealWeaponData(avatars) : this.dealStatisticsData(avatars)
    return {
      ...this.screenData,
      ...dealt,
      abbr: gsCfg.getdefSet("role", "sortName").sortName
    }
  }

  /** 获取角色详细信息 */
  async getAvatarDetails (avatars) {
    const detailPromises = avatars.map(async (avatar) => {
      try {
        let detailRes = await MysInfo.get(this.e, "characterDetail", { id: avatar.id }, { log: false })
        if (detailRes && detailRes.retcode === 0 && detailRes.data.avatar_list.length > 0) {
          const detailData = detailRes.data.avatar_list[0]
          return {
            ...avatar,
            skills: this.formatSkills(detailData.skills),
            weapon: this.formatWeapon(detailData.weapon),
            equip: detailData.equip || []
          }
        }
        return avatar
      } catch (error) {
        logger.error(`获取角色 ${avatar.id} 详细信息失败:`, error)
        return avatar
      }
    })
    const detailedAvatars = await Promise.all(detailPromises)
    return detailedAvatars
  }

  /** 格式化技能数据 */
  formatSkills (skills) {
    if (!skills || !Array.isArray(skills)) return []
    return skills.map(skill => ({
      level: skill.level,
      skill_type: skill.skill_type,
      plus: skill.level > 10 ? "plus" : "",
      lvl: this.getSkillLevelClass(skill.level)
    }))
  }

  /** 获取技能等级样式类 */
  getSkillLevelClass (level) {
    if (level >= 12) return "lv5"
    if (level >= 10) return "lv4"
    if (level >= 7) return "lv3"
    if (level >= 4) return "lv2"
    return "lv1"
  }

  /** 格式化武器数据 */
  formatWeapon (weapon) {
    if (!weapon) return null
    return {
      name: weapon.name,
      level: weapon.level,
      star: weapon.star,
      rarity: weapon.rarity,
      icon: weapon.icon
    }
  }

  /** 处理统计数据（角色视图） */
  dealStatisticsData (avatars) {
    return {
      uid: this.e.uid,
      avatars,
      skillName: ["普攻", "闪避", "特殊", "连携", "核心", "支援"],
      talentNotice: "数据来源：绝区零战绩"
    }
  }

  /** 武器视图排序：星级 → 等级 → life */
  dealWeaponData (avatars) {
    const sortedAvatars = _.orderBy(
      avatars,
      [
        a => a.weapon ? (this.rarityMap[a.weapon.rarity] || 0) : 0,
        a => a.weapon ? (a.weapon.level || 0) : 0,
        a => a.weapon ? (a.weapon.star || 0) : 0
      ],
      ["desc", "desc", "desc"]
    )
    return {
      uid: this.e.uid,
      avatars: sortedAvatars,
      skillName: ["普攻", "闪避", "特殊", "连携", "核心", "支援"],
      talentNotice: "数据来源：绝区零战绩"
    }
  }
}