import _ from "lodash"
import { base, MysApi, MysInfo, gsCfg, common, Weapon, Material } from "#index"

export default class RoleList extends base {
  constructor (e) {
    super(e)
    /** 缓存时间，单位分钟 */
    this.cacheCd = 30
  }

  static async get (e) {
    let roleList = new RoleList(e)
    return await roleList.getData(false)
  }

  static async getWeapon (e) {
    let roleList = new RoleList(e)
    return await roleList.getData(true)
  }

  async getRoleGameInfo (e) {
    let resIndex = await MysInfo.get(this.e, "index")
    return {
      gamefwq: resIndex.data.role.region,
      gamelevel: resIndex.data.role.level,
      gamename: resIndex.data.role.nickname,
      avatar: resIndex.data.role.game_head_icon
    }
  }

  async getData (isWeapon = false) {
    let uid = await MysInfo.getUid(this.e)
    /** 判断是否绑定了ck */
    this.ck = await MysInfo.checkUidBing(uid, this.e)
    let res = await MysInfo.get(this.e, "character")
    if (!res || res.retcode !== 0) return false
    let list = await MysInfo.get(this.e, "characterDetail", { character_ids: _.map(res.data.avatars || res.data.list, "id"), cached: true, isTask: true })
    if (!list || list.retcode !== 0) return false
    let avatars = list.data.list.map(msg => ({
      ...msg.base,
      weapon: msg.weapon,
      skills: msg.skills,
      reliquaries: msg.relics,
      costumes: msg.costumes,
      constellations: msg.constellations
    }))
    if (avatars.length <= 0) return false
    let skill = []
    if (this.ck) {
      await this.e.reply("正在获取角色信息，请稍候...")
      this.mysApi = new MysApi(uid, this.ck.ck, { log: false })
      this.mysApi.cacheCd = 1800
      skill = await this.getAllSkill(avatars)
    }
    const info = await this.getRoleGameInfo(this.e)
    const bgImage = await gsCfg.gsBgImage()
    let dealFn = isWeapon ? this.dealWeaponData.bind(this) : this.dealRoleData.bind(this)
    let dealRet = dealFn(avatars, skill)
    return {
      ...this.screenData,
      ...dealRet,
      ...info,
      bgImage
    }
  }

  async getAllSkill (avatars) {
    let skillRet = []; let skill = []
    /** 批量获取技能数据，分组10个id一次，延迟100ms */
    let num = 10; let ms = 100
    let avatarArr = _.chunk(avatars, num)
    let start = Date.now()
    for (let val of avatarArr) {
      for (let avatar of val) {
        skillRet.push(this.getSkill(avatar))
      }
      skillRet = await Promise.all(skillRet)
      /** 过滤没有获取成功的 */
      skillRet = skillRet.filter(item => item && item.id)
      await common.sleep(ms)
    }
    skill = _.keyBy(skillRet, "id")
    logger.mark(`[米游社接口][detail][${this.ck.uid}] ${Date.now() - start}ms`)
    return skill
  }

  async getSkill (avatar) {
    let force = !this.e.msg.includes("force")
    let res = await this.mysApi.getData("detail", { avatar_id: avatar.id }, force)
    if (!res || res.retcode !== 0) return false
    let skill = {
      id: avatar.id
    }
    // 确保有技能列表数据
    if (!res.data.skill_list) return false
    // 获取角色的三个技能数据
    let normalAttack = res.data.skill_list.find(s => s.max_level === 10) // 普通攻击
    let elementalSkill = res.data.skill_list.find(s => s.max_level === 10 && s.id !== normalAttack?.id) // 元素战技
    let elementalBurst = res.data.skill_list.find(s => s.max_level === 10 && s.id !== normalAttack?.id && s.id !== elementalSkill?.id) // 元素爆发
    // 设置技能等级
    if (normalAttack) {
      skill.a = {
        level_current: normalAttack.level_current,
        level_original: normalAttack.level_current,
        name: normalAttack.name
      }
    }
    if (elementalSkill) {
      skill.e = {
        level_current: elementalSkill.level_current,
        level_original: elementalSkill.level_current,
        name: elementalSkill.name
      }
    }
    if (elementalBurst) {
      skill.q = {
        level_current: elementalBurst.level_current,
        level_original: elementalBurst.level_current,
        name: elementalBurst.name
      }
    }
    // 处理命座加成
    if (avatar.actived_constellation_num >= 3) {
      if (skill.e && avatar.constellations[2].effect.includes(skill.e.name)) {
        skill.e.level_current += 3
      } else if (skill.q && avatar.constellations[2].effect.includes(skill.q.name)) {
        skill.q.level_current += 3
      }
    }
    if (avatar.actived_constellation_num >= 5) {
      if (skill.e && avatar.constellations[4].effect.includes(skill.e.name)) {
        skill.e.level_current += 3
      } else if (skill.q && avatar.constellations[4].effect.includes(skill.q.name)) {
        skill.q.level_current += 3
      }
    }

    return skill
  }

  dealRoleData (avatars, skill) {
    /** 四星五星 */
    let star = 0
    let msg = this.e.msg.replace(this.e.uid, "")
    if (/(四|4)/.test(msg)) star = 4
    if (/(五|5)/.test(msg)) star = 5
    /** 天赋等级背景 */
    const talentLvMap = "0,1,1,1,2,2,3,3,3,4,5".split(",")
    /** 根据每日素材构建 角色->素材的映射关系 */
    let charTalentMap = {}
    let avatarRet = []
    for (let idx in avatars) {
      let curr = avatars[idx]
      let avatar = _.pick(curr, "id,name,rarity,level,rarity,fetter,reliquaries,element".split(","))
      let talent = charTalentMap[avatar.name] || {}
      avatar.rarity = avatar.rarity > 5 ? 5 : avatar.rarity
      avatar.bg = gsCfg.getRoleBg(avatar.id, avatar.rarity)
      "name,level,rarity,affix_level".split(",").forEach((idx) => {
        avatar[`weapon_${idx}`] = curr.weapon[idx]
        avatar.reliquaries = curr.reliquaries
      })
      avatar.cons = curr.actived_constellation_num
      avatar.talentIcon = Material.get(talent.name)
      if (avatar.id == 10000007) {
        avatar.name = "荧"
        avatar.fetter = 10
      } else if (avatar.id == 10000005) {
        avatar.name = "空"
        avatar.fetter = 10
      } else {
        avatar.talent = talent.name
        avatar.talentWeek = talent.week
      }
      let skillRet = skill[avatar.id] || {}
      const talentConsCfg = { a: 0, e: 3, q: 5 }
      _.forIn(talentConsCfg, (consLevel, key) => {
        let talent = skillRet[key] || {}
        /** 天赋等级 */
        avatar[key] = talent.level_current || "-"
        /** 是否有命座加成 */
        avatar[`${key}_plus`] = talent.level_current > talent.level_original
        /** 天赋书星级 */
        avatar[`${key}_lvl`] = talentLvMap[talent.level_original * 1]
        avatar[`${key}_original`] = talent.level_original * 1
      })
      avatar.aeq = avatar.a * 1 + avatar.e + avatar.q
      avatar.weapon = Weapon.get(avatar.weapon_name)
      avatarRet.push(avatar)
    }
    /** 超过八个角色才分类四星五星 */
    if (star >= 4 && avatarRet.length > 8) {
      avatarRet = avatarRet.filter(item => item.rarity == star)
    }
    let sortKey = {
      talent: "aeq,rarity,level,star,fetter,talentWeek".split(","),
      weapon: "level,rarity,aeq,cons,weapon_level,weapon_rarity,weapon_affix_level,fetter".split(",")
    }
    avatarRet = _.orderBy(avatarRet, sortKey, _.repeat("desc,", sortKey.length).split(","))
    let noTalent = avatarRet.length == 0 || /^-+$/.test(avatarRet.map((d) => d.a).join(""))
    let talentNotice = `*技能数据会缓存${this.cacheCd}分钟`
    if (noTalent) talentNotice = "【#扫码登录】或【#刷新ck】后可获取技能数据。"
    let week = new Date().getDay()
    if (new Date().getHours() < 4) {
      week--
    }
    return {
      avatars: avatarRet,
      bgType: Math.ceil(Math.random() * 3),
      abbr: gsCfg.getdefSet("role", "sortName").sortName,
      week: [3, 1, 2][week % 3],
      talentNotice
    }
  }

  /** 武器列表用排序（不影响角色排序） */
  dealWeaponData (avatars, skill) {
    // 复用上面构建好的角色数据，但只保留武器相关字段与排序方式
    let { avatars: avatarRet } = this.dealRoleData(avatars, skill)
    // 武器排序：星级 > 等级 > 精炼，其次再用角色信息兜底
    let sortKey = "weapon_rarity,weapon_level,weapon_affix_level,level,rarity,aeq,cons,fetter".split(",")
    avatarRet = _.orderBy(avatarRet, sortKey, Array(sortKey.length).fill("desc"))
    return {
      avatars: avatarRet,
      bgType: Math.ceil(Math.random() * 3),
      abbr: gsCfg.getdefSet("role", "sortName").sortName,
      week: [3, 1, 2][new Date().getDay() % 3],
      talentNotice: `*技能数据会缓存${this.cacheCd}分钟`
    }
  }
}