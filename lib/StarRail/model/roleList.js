import _ from "lodash"
import fs from "node:fs"
import moment from "moment"
import { Player, Character, gsCfg, MysApi, MysInfo, base } from "#index"

export default class srRoleList extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "sr_index")
  }

  static async get (e) {
    let roleList = new srRoleList(e)
    return await roleList.getData(false)
  }

  static async getWeapon (e) {
    let roleList = new srRoleList(e)
    return await roleList.getData(true)
  }

  async getData (isWeapon = false) {
    let res = await MysInfo.get(this.e, "avatarInfo")
    if (!res || res.retcode !== 0) return false
    let uid = await MysInfo.getUid(this.e)
    let avatars = res.data.avatar_list
    if (!avatars.length) return false
    /** 判断是否绑定了ck */
    this.ck = await MysInfo.checkUidBing(uid, this.e)
    if (this.ck) {
      const option = { log: false, game: "sr" }
      this.mysApi = new MysApi(uid, this.ck.ck, option)
      this.mysApi.cacheCd = 1800
    }
    const dealt = isWeapon ? this.dealWeaponData(avatars) : this.dealStatisticsData(avatars)
    return {
      ...this.screenData,
      ...dealt
    }
  }

  /**
     * 获取角色/光锥图片
     * @param {Object} avatar
     * @param {'role'|'side'|'side2'} roleDir 角色图片对应文件夹，默认用side2
     * @returns avatar
     */
  getAvaImg (avatar, roleDir = "side2") {
    const elem = ["", "火", "虚数"]
    for (let type of ["role", "weapon"]) {
      if (type === "weapon" && !avatar.equip) continue
      let { name, icon } = type === "role" ? avatar : avatar.equip
      /** 开拓者特殊处理 */
      if (type === "role" && avatar.id > 8000) {
        avatar.name = avatar.id % 2 ? "穹" : "星"
        name = avatar.name + elem[_.round((avatar.id - 8000) / 2) - 1]
      }
      avatar[`${type}Img`] = `${this.screenData.gameResPath}img/${type === "role" ? roleDir : type}/${name}.webp`
      if (!fs.existsSync(avatar[`${type}Img`])) avatar[`${type}Img`] = icon
    }
    return avatar
  }

  skillData (skill, map, diff) {
    let lvl = skill.level - 1
    if (skill.is_rank_work) {
      skill.plus = "plus"
      lvl -= diff
    }
    if (map[lvl] === 6) skill.crown = "sr_crown"
    skill.lvl = map[lvl]
    return _.pick(skill, "level,plus,lvl,crown".split(","))
  }

  dealStatisticsData (avatars) {
    avatars = avatars.map(ava => {
      let skills = "普攻,战技,终结技,天赋".split(",")
      if (ava.skills?.length) {
        const skillLvl = [1, 2, 3, 4, 4, 4, 5, 5, 6, 6]
        const aLvl = [1, 2, 3, 4, 5, 5]
        for (const skill of ava.skills) {
          let name = skill.remake
          if (!skills.includes(name)) continue
          let idx = skills.findIndex(v => v === name)
          skills[idx] = this.skillData(skill, name === "普攻" ? aLvl : skillLvl, name === "普攻" ? 1 : 2)
        }
      } else skills = skills.map(v => ({ level: "-" }))
      ava = _.pick(ava, "id,name,rarity,level,rank,icon,equip".split(","))
      ava = this.getAvaImg(ava)
      ava.skills = skills
      ava.aeq = _.sumBy(skills, "level")
      ava.miao = this.miao(ava.id)
      return ava
    })
    let sortKey = "level,rarity,aeq,rank".split(",")
    avatars = _.orderBy(avatars, sortKey, Array(sortKey.length).fill("desc"))
    let noTalent = !avatars.length || /^-+$/.test(avatars.map(d => d.skills[0]).join(""))
    let talentNotice = "*技能数据会缓存30分钟"
    if (noTalent) talentNotice = "【#扫码登录】或【#刷新ck】后可获取技能数据。"
    return {
      avatars,
      abbr: gsCfg.getdefSet("role", "sortName").sortName,
      talentNotice
    }
  }

  dealWeaponData (avatars) {
    avatars = this.dealStatisticsData(avatars).avatars
    // 光锥排序：星级 > 等级 > 叠影，其次角色信息兜底
    let sortKey = "equip.rarity,equip.level,equip.rank,level,rarity,aeq,rank".split(",")
    avatars = _.orderBy(avatars, sortKey, Array(sortKey.length).fill("desc"))
    return {
      avatars,
      abbr: gsCfg.getdefSet("role", "sortName").sortName,
      talentNotice: "*技能数据会缓存30分钟"
    }
  }

  miao (id) {
    let player = new Player(this.e, "sr")
    let profile = player.getProfile(id)
    if (!profile) return false
    let Detail = profile.getArtisMark()
    return {
      markClass: Detail.markClass,
      mark: Detail.mark
    }
  }

  dayCount (num) {
    let year = Math.floor(num / 365)
    let month = Math.floor((num % 365) / 30.41)
    let day = Math.floor((num % 365) % 30.41)
    let msg = ""
    if (year > 0) msg += year + "年"
    if (month > 0) msg += month + "个月"
    if (day > 0) msg += day + "天"
    return msg
  }

  chaTimeFM (time) {
    time.month -= 1
    return moment(time).format("YYYY-MM-DD HH:mm")
  }

  get roleSum () {
    let chars = gsCfg.getdefSet("role", "sr_name")
    chars = _.keys(chars).filter(v => Character.get(v, "sr").isRelease)
    return chars.length + 1
  }
}