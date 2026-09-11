import _ from "lodash"
import { Character, gsCfg, MysApi, MysInfo, base } from "#index"

export default class Calculator extends base {
  constructor (e) {
    super(e)
    this.model = "calculator"
    this.checkMsg = `设置角色、武器、技能等级有误\n指令：${e.isSr ? "*克拉拉养成\n示例：*克拉拉养成75 80 6 9 9 9\n参数为角色、光锥、普攻、战技、终结技、天赋" : "#刻晴养成\n示例：#刻晴养成81 90 9 9 9\n参数为角色、武器、技能等级"}`
    this.gameApi = {
      gs: {
        list: "avatars",
        defSkill: [90, 90, 10, 10, 10]
      },
      sr: {
        list: "avatar_list",
        defSkill: [80, 80, 6, 10, 10, 10, 6, 6]
      }
    }[this.game]
  }

  async get (role) {
    this.role = role
    /** 获取绑定uid */
    let uid = await MysInfo.getUid(this.e)
    if (!uid) return false
    /** 判断是否绑定了ck */
    let ck = await MysInfo.checkUidBing(uid, this.e)
    if (!ck) {
      await this.e.reply(MysInfo.tips)
      return false
    }
    this.mysApi = new MysApi(uid, ck.ck, { game: this.game, log: true })
    let deviceFp = await MysInfo.get(this.e, "getFp")
    this.headers = { "x-rpc-device_fp": deviceFp?.data?.device_fp }
    /** 获取角色数据 */
    let character = await MysInfo.get(this.e, "character", { headers: this.headers })
    if (!character || character.retcode !== 0) return false
    character = character.data
    /** 获取设置参数 */
    await this.getSet()
    /** 获取计算角色 */
    this.calc = character[this.gameApi.list].find(item => item.id == role.roleId)
    /** 计算 */
    let computes = await this[`${this.game}Compute`]()
    if (!computes) return false
    /** 角色头像与背景 */
    this.calc.icon = this.getIcon(this.calc.icon)
    if (this.game === "gs") {
      const rarity = this.calc.rarity || 5
      this.calc.bg = gsCfg.getRoleBg(this.calc.id || role.roleId, rarity)
    } else {
      this.calc.bg = this.calc.rarity
    }
    return {
      dataCharacter: this.calc,
      setSkill: this.setSkill,
      skillList: this.skillList,
      computes,
      ...this.screenData,
      abbr: gsCfg.getdefSet("role", "sortName").sortName
    }
  }

  /** 原神角色计算 */
  async gsCompute () {
    // 技能
    let skillList = []
    let detail = await MysInfo.get(this.e, this.calc ? "detail" : "avatarSkill", {
      headers: this.headers,
      avatar_id: this.role.roleId
    })
    if (!detail || detail.retcode !== 0) return false
    detail = detail.data
    if (this.calc) skillList = detail.skill_list || detail.skills
    else {
      detail.list.forEach(item => { item.level_current = 1 })
      skillList = detail.list
      if (!skillList) {
        this.e.reply("暂无角色数据,请稍后再试\n星铁角色养成请使用*开头")
        return false
      }
      this.notOwned()
    }
    let body = {
      avatar_id: Number(this.role.roleId),
      avatar_level_current: Number(this.calc.level),
      avatar_level_target: Number(this.setSkill[0]),
      skill_list: []
    }
    skillList = skillList.filter(item => item.max_level !== 1)
    _.each(skillList, (v, k) => {
      body.skill_list.push({
        id: Number(v.group_id),
        level_current: Number(v.level_current),
        level_target: Number(this.setSkill[k + 2])
      })
    })
    if (this.mysApi.getServer().startsWith("os")) body.lang = "zh-cn"
    // 武器
    if (this.calc.weapon) {
      if (Number(this.calc.weapon.rarity) < 3) this.setSkill[1] = 70
      body.weapon = {
        id: Number(this.calc.weapon.id),
        level_current: Number(this.calc.weapon.level),
        level_target: Number(this.setSkill[1])
      }
    }
    body = {
      items: [body],
      uid: this.mysApi.uid,
      region: this.mysApi.server
    }
    this.skillList = skillList
    const computes = await this.getComputes(body)
    let overall = _.keyBy(computes.overall_consume, "id")
    let bag = _.keyBy(computes.available_material, "id")
    let findMerge = this.findMerge(overall, bag)
    let calcMerge = (items, nowKey, lastKey) => {
      let now = items[nowKey]
      let last = items[lastKey]
      if (now) {
        // 无需材料
        if (!now.num) return calcMerge(items, nowKey - 1, lastKey)
        // 缺少材料, 计算低级合成
        if (now.lack_num > 0) {
          let times = 3 ** (lastKey - nowKey)
          let merge = _.floor(Math.abs(last.lack_num) / times)
          merge = merge >= now.lack_num ? now.lack_num : merge
          now.merge = merge
          now.lack_num = merge >= now.lack_num ? 0 : now.lack_num - merge
          last.lack_num = last.lack_num + merge * times
          items[nowKey] = now
          items[lastKey] = last
          let nextKey = nowKey - 1
          let bagNum = Math.abs(last.lack_num)
          // 不够合成+一级 但是还缺
          if (bagNum < 3 && now.lack_num > 0) {
            lastKey--
            if (lastKey > 0) return calcMerge(items, nowKey, lastKey)
          } else if (nextKey >= 0 && bagNum >= 3 ** (lastKey - nextKey)) {
            return calcMerge(items, nextKey, lastKey)
          }
        }
        // 多余材料
        if (now.lack_num < 0 && now.num > 0) return calcMerge(items, nowKey - 1, lastKey)
      }
      return items
    }
    _.each(findMerge, v => {
      let lastKey = _.last(_.keys(v))
      v = calcMerge(v, lastKey, lastKey)
      _.each(v, vi => {
        if (overall[vi.id]) {
          overall[vi.id].lack_num = vi.lack_num
          if (vi.merge) overall[vi.id].merge = vi.merge
        }
      })
    })

    let consume = (type) => {
      for (const key in type) {
        let val = type[key]
        if (_.isEmpty(val)) continue
        if (_.isObjectLike(val)) consume(val)
        if (!_.isNil(val?.lack_num) && overall[val?.id]?.lack_num >= 0) {
          val.lack_num = overall[val.id].lack_num
          val.merge = overall[val.id].merge
        }
        if (val.id === 202) {
          val.num = this.format(val.num)
          val.lack_num = this.format(val.lack_num)
        }
        if (val.name?.includes("「")) val.isTalent = true
        type[key] = val
      }
    }
    let items = computes.items
    _.each(items, role => { consume(role) })
    return items
  }

  /** 星铁角色计算 */
  async srCompute () {
    // 技能
    let skillList = []
    let detail = await MysInfo.get(this.e, "detail", {
      headers: this.headers,
      avatar_id: this.role.roleId,
      tab_from: this.calc ? "TabOwned" : "TabAll"
    })
    if (!detail || detail.retcode !== 0) return false
    detail = detail.data
    if (this.calc) {
      skillList = [...(detail.skills || []), ...(detail.skills_servant || [])]
      if (skillList.length === 0 && detail.skill_list) {
        skillList = detail.skill_list
      }
    } else {
      this.avatar = detail.avatar
      this.isServant = Array.isArray(detail.data?.skills_servant) && detail.data.skills_servant.length > 0
      let skills = Array.isArray(detail.skills) ? detail.skills : []
      let skillsServant = Array.isArray(detail.skills_servant) ? detail.skills_servant : []
      skillList = this.isServant ? [...skills, ...skillsServant] : skills

      if (!skillList || skillList.length === 0) {
        this.e.reply("暂无角色数据,请稍后再试\n星铁角色养成请使用*开头")
        return false
      }
      this.notOwned(detail.avatar?.rarity)
    }

    /** 拼接计算参数 */
    let body = {
      uid: this.mysApi.uid,
      region: this.mysApi.server,
      avatar: {
        item_id: Number(this.role.roleId),
        cur_level: Number(this.calc.level),
        target_level: Number(this.setSkill[0])
      },
      skill_list: []
    }
    let anchor = {
      Point01: "普通攻击",
      Point02: "战技",
      Point03: "终结技",
      Point04: "天赋",
      Point19: "忆灵技",
      Point20: "忆灵天赋"
    }
    _.each(skillList, (v, k) => {
      if (anchor[v.anchor]) v.typeName = anchor[v.anchor]
      body.skill_list.push({
        item_id: v.point_id,
        cur_level: v.cur_level,
        target_level: Number(this.setSkill[k + 2]) || v.target_level
      })
    })
    if (body.region.startsWith("os")) body.lang = "zh-cn"
    if (this.calc.equip) {
      body.equipment = {
        item_id: Number(this.calc.equip.id),
        cur_level: Number(this.calc.equip.level),
        target_level: Number(this.setSkill[1])
      }
    }
    skillList = skillList.filter(item => item.max_level != 1)
    this.skillList = skillList
    let computes = await this.getComputes(body)
    let item = _.pickBy(computes, (v, k) => k.includes("consume"))
    let inNeed = _.keyBy(computes.need_get_materials, "item_id")
    let merge = _.keyBy(computes.can_merge_materials, "item_id")
    _.each(item, type => {
      _.each(type, v => {
        if (inNeed[v.item_id]) v.lack = inNeed[v.item_id].num
        if (merge[v.item_id]) v.merge = merge[v.item_id].num
        if (v.item_id === computes.coin_id) {
          v.num = this.format(v.num)
          v.lack = this.format(v.lack)
        }
      })
    })
    return item
  }

  async getSet () {
    let defSetSkill = this.gameApi.defSkill
    let set = this.e.msg.replace(/#|＃|星铁|养成|计算/g, "").trim()
    set = set.replace(/，| /g, ",")
    set = set.replace(this.role.alias, "")
    let setSkill = []
    if (set) {
      setSkill = _.compact(set.split(","))
      for (let i = 0; i < defSetSkill.length; i++) {
        if (!setSkill[i]) setSkill[i] = defSetSkill[i]
      }
    } else setSkill = defSetSkill
    if (setSkill.length != defSetSkill.length) {
      let reMsg = this.checkMsg.replace(/刻晴|克拉拉/g, this.role.alias)
      await this.e.reply(reMsg)
      return false
    }
    /** 检查参数 */
    for (const key in defSetSkill) {
      if (defSetSkill[key] < Number(setSkill[key])) {
        setSkill[key] = defSetSkill[key]
      }
    }
    this.setSkill = setSkill
  }

  notOwned (rarity) {
    let five = gsCfg.getRole5()
    let roleRarity = rarity ? Number(rarity) : (five.includes(Number(this.role.roleId)) ? 5 : 4)
    this.calc = {
      level: 1,
      name: this.role.name,
      icon: this.avatar?.icon_url || "",
      rarity: roleRarity
    }
    this.calc.bg = this.game === "gs" ? gsCfg.getRoleBg(this.role.roleId, this.calc.rarity) : this.calc.rarity
  }

  getIcon (origin) {
    let char = Character.get(this.role.roleId, this.game)?.imgs?.face
    let icon = char ? `${process.cwd().replace(/\\/g, "/")}/plugins/miao-plugin/resources${char}` : origin
    return icon
  }

  format (num) {
    return num > 10000 ? `${(num / 10000).toFixed(1)} w` : num
  }

  async getComputes (body) {
    let computes = await MysInfo.get(this.e, "compute", {
      body,
      headers: this.headers
    })
    if (!computes || computes.retcode !== 0) return false
    return computes.data
  }

  findMerge (overall, bag) {
    let consume = {}
    let usedItem = []
    for (const oid in overall) {
      let ov = overall[oid]
      if ([202, 104319, 104003, 104013].includes(ov.id) || !ov.level) continue
      if (overall[ov.id + 1] || overall[ov.id + 2]) {
        let topItem = overall[ov.id + 2] || overall[ov.id + 1]
        let idGap = topItem.id - ov.id
        let levelGap = topItem.level - ov.level
        if (idGap === levelGap) {
          if (!consume[topItem.id]) consume[topItem.id] = {}
          consume[topItem.id][0] = topItem
          consume[topItem.id][levelGap] = ov
          usedItem.push(oid)
        }
      }
      if (usedItem.includes(oid)) continue
      for (const bid in bag) {
        let item = bag[bid]
        let idGap = oid - item.id
        let levelGap = ov.level - item.level
        if (idGap < 0 || levelGap < 0 || idGap !== levelGap) continue
        if (!consume[oid]) consume[oid] = {}
        consume[oid][0] = ov
        if (!consume[oid]) consume[oid] = {}
        if (!consume[oid][0]) consume[oid][0] = ov
        if (!consume[oid][levelGap]) {
          item.lack_num = -item.num
          item.num = 0
          consume[oid][levelGap] = item
        }
      }
    }
    return consume
  }
}