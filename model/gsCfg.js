import _ from "lodash"
import fs from "node:fs"
import YAML from "yaml"
import chokidar from "chokidar"
import NoteUser from "./mys/NoteUser.js"
import { MysInfo, Character, Weapon, MysApi } from "#index"
class YamlReader {
  constructor (filePath) {
    this.filePath = filePath
  }

  get (key) {
    let data = YAML.parse(fs.readFileSync(this.filePath, "utf8"))
    return data[key]
  }

  set (key, value) {
    let data = YAML.parse(fs.readFileSync(this.filePath, "utf8"))
    data[key] = value
    fs.writeFileSync(this.filePath, YAML.stringify(data), "utf8")
  }
}
/** 配置文件 */
class GsCfg {
  constructor () {
    this.isSr = false
    this.oldConfig = {}
    /** 默认设置 */
    this.defSetPath = "./plugins/genshin/config/defSet/"
    /** 用户设置 */
    this.configPath = "./plugins/genshin/config/config/"
    this.config = {}
    this.defSet = {} /** 添加 defSet 初始化 */
    /** 监听文件 */
    this.watcher = { config: {}, defSet: {} }
    this.ignore = ["mys.pubCk", "gacha.set", "bot.help", "role.name"]
    /** 罗马数字映射 */
    this.roman = {
      1: "I",
      2: "II",
      3: "III",
      4: "IV",
      5: "V",
      6: "VI",
      7: "VII",
      8: "VIII",
      9: "IX",
      10: "X"
    }
    this.initPaths()
  }

  initPaths () {
    /** 确保目录存在 */
    if (!fs.existsSync(this.defSetPath)) {
      fs.mkdirSync(this.defSetPath, { recursive: true })
    }
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath, { recursive: true })
    }
  }

  /** 原神角色武器元素属性 */
  get element () {
    let data = {}
    const elemTypeNames = {
      pyro: "火",
      hydro: "水",
      cryo: "冰",
      electro: "雷",
      anemo: "风",
      geo: "岩",
      phy: "物理",
      dendro: "草"
    }
    const weaponTypeNames = {
      bow: "弓",
      catalyst: "法器",
      claymore: "大剑",
      polearm: "枪",
      sword: "单手剑"
    }
    try {
      const gsData = JSON.parse(fs.readFileSync(process.cwd() + "/plugins/miao-plugin/resources/meta-gs/character/data.json", "utf8"))
      for (let id in gsData) {
        data[gsData[id].name] = elemTypeNames[gsData[id].elem] || gsData[id].elem
      }
      const weaponTypes = ["bow", "catalyst", "claymore", "polearm", "sword"]
      for (let type of weaponTypes) {
        const weaponData = JSON.parse(fs.readFileSync(process.cwd() + `/plugins/miao-plugin/resources/meta-gs/weapon/${type}/data.json`, "utf8"))
        for (let id in weaponData) {
          data[weaponData[id].name] = weaponTypeNames[type]
        }
      }
      let role = this.getdefSet("role", "element")
      for (let type in role) {
        for (let name of role[type]) {
          if (!data[name]) {
            data[name] = type
          }
        }
      }
    } catch (e) {
      let role = this.getdefSet("role", "element")
      for (let type in role) {
        for (let name of role[type]) {
          data[name] = type
        }
      }
      logger.error(`[角色武器数据] 读取失败 ${e}`)
    }
    return data
  }

  /**
   * @param app  功能
   * @param name 配置文件名称
   */
  getdefSet (app, name) {
    return this.getYaml(app, name, "defSet")
  }

  /** 用户配置 */
  getConfig (app, name) {
    if (this.ignore.includes(`${app}.${name}`)) {
      return this.getYaml(app, name, "config")
    }

    return { ...this.getdefSet(app, name), ...this.getYaml(app, name, "config") }
  }

  getDefOrConfig (app, name) {
    let def = this.getdefSet(app, name)
    let config = this.getConfig(app, name)
    return { ...def, ...config }
  }

  /**
   * 获取配置yaml
   * @param app 功能
   * @param name 名称
   * @param type 默认跑配置-defSet，用户配置-config
   */
  getYaml (app, name, type) {
    let file = this.getFilePath(app, name, type)
    let key = `${app}.${name}`
    const configMap = {
      config: this.config,
      defSet: this.defSet
    }
    const currentConfig = configMap[type]
    if (currentConfig[key]) return currentConfig[key]
    try {
      currentConfig[key] = YAML.parse(
        fs.readFileSync(file, "utf8")
      )
    } catch (error) {
      logger.error(`[${app}][${name}] 格式错误 ${error}`)
      return false
    }
    this.watch(file, app, name, type)
    return currentConfig[key]
  }

  /** 是否五星 */
  getRole5 () {
    let five = []
    try {
      const gsData = JSON.parse(fs.readFileSync(process.cwd() + "/plugins/miao-plugin/resources/meta-gs/character/data.json", "utf8"))
      const srData = JSON.parse(fs.readFileSync(process.cwd() + "/plugins/miao-plugin/resources/meta-sr/character/data.json", "utf8"))
      for (let id in gsData) {
        if (gsData[id].star === 5) {
          five.push(Number(id))
        }
      }
      for (let id in srData) {
        if (srData[id].star === 5) {
          five.push(Number(id))
        }
      }
    } catch (e) {
      const fiveData = this.getdefSet("role", "other").five || []
      five = fiveData.map(id => Number(id))
    }
    return five
  }

  /**
   * 获取特殊背景编号（目前用于旅行者等特殊角色的 bg105）
   * @param {number|string} id 角色ID
   * @param {number} rarity 默认使用的稀有度背景（如 4、5）
   * @returns {number} 背景编号（普通角色返回 rarity，特殊角色返回 105）
   */
  getRoleBg (id, rarity = 5) {
    if (!this._bg105Set) {
      const otherCfg = this.getdefSet("role", "other") || {}
      const bg105Ids = otherCfg.bg105 || []
      this._bg105Set = new Set(bg105Ids.map(v => Number(v)))
    }
    if (this._bg105Set.has(Number(id))) {
      return 105
    }
    return rarity
  }

  getFilePath (app, name, type) {
    if (type == "defSet") {
      return `${this.defSetPath}${app}/${name}.yaml`
    } else {
      return `${this.configPath}${app}.${name}.yaml`
    }
  }

  modify (name, key, value) {
    let path = `${this.configPath}${name}.yaml`
    new YamlReader(path).set(key, value)
    this.oldConfig[key] = _.cloneDeep(this.config[key])
    delete this.config[name]
  }

  /** 监听配置文件 */
  watch (file, app, name, type = "defSet") {
    let key = `${app}.${name}`
    if (this.watcher[type][key]) return
    const watcher = chokidar.watch(file)
    watcher.on("change", path => {
      delete this[type][key]
      logger.mark(`[修改配置文件][${type}][${app}][${name}]`)
      if (this[`change_${app}${name}`]) {
        this[`change_${app}${name}`]()
      }
    })
    this.watcher[type][key] = watcher
  }

  /** 读取所有用户绑定的ck */
  async getBingCk (game = "gs") {
    let ck = {}
    let ckQQ = {}
    let noteCk = {}
    await NoteUser.forEach(async function (user) {
      let qq = user.qq + ""
      let tmp = {}
      _.forEach(user.mysUsers, (mys) => {
        let uids = mys.getUids(game)
        _.forEach(uids, (uid) => {
          let ckData = mys.getCkInfo(game)
          ckData.qq = qq
          if (!ck[uid]) {
            ck[uid] = ckData
            ckQQ[qq] = ckData
          }
          tmp[uid] = ckData
        })
      })
      noteCk[qq] = tmp
    })
    return { ck, ckQQ, noteCk }
  }

  /**
    * 获取其它游戏信息
    * @returns {Promise<{uid: string, ck: string, game_biz: string, region: string}>}
    */
  async othergame (e) {
    let user = await NoteUser.create(e)
    if (!user.hasCk) {
      await e.reply("当前尚未绑定Cookie")
      return false
    }
    let mys = user.getMysUser(e)
    if (!mys || !mys.ck) {
      await e.reply("当前CK已过期，请重新绑定Cookie")
      return false
    }
    let uid = await MysInfo.getUid(e, false)
    let ck = mys.ck
    let game = e.game
    let res, game_biz, region
    let usergame = JSON.parse(await redis.get(`genshin:usergame:${uid}:${game}_role`))
    if (usergame) {
      game_biz = usergame.game_biz,
      region = usergame.region
    } else {
      let mysApi = new MysApi("", ck, { game })
      if (game == "bh2") {
        res = await mysApi.getData("bh2_cn")
        if (!res || res?.retcode !== 0) {
          await e.reply("用户数据获取失败")
          return false
        }
      } else {
        res = await mysApi.getData("bh3_cn")
        if (!res || res?.retcode !== 0) res = await mysApi.getData("bh3_global")
        if (!res || res?.retcode !== 0) {
          await e.reply("用户数据获取失败")
          return false
        }
      }
      let data = res.data.list.find(item => item.game_uid === uid)
      if (data) {
        game_biz = data.game_biz,
        region = data.region
      } else {
        await e.reply("用户数据获取失败")
        return false
      }
      let usergame = {
        game_biz,
        region
      }
      await redis.set(`genshin:usergame:${uid}:${game}_role`, JSON.stringify(usergame))
    }
    return { uid, ck, game_biz, region }
  }

  /**
   * 原神角色id转换角色名字
   */
  roleIdToName (id) {
    let name = this.getdefSet("role", this.isSr ? "sr_name" : "name")
    if (name[id]) {
      return name[id][0]
    }
    return ""
  }

  /** 原神角色别名转id */
  roleNameToID (keyword, isSr) {
    if (isSr) this.isSr = isSr
    if (!isNaN(keyword)) keyword = Number(keyword)
    this.getAbbr()
    let roelId = this[this.isSr ? "sr_nameID" : "nameID"].get(String(keyword))
    return roelId || false
  }

  /**
   * 原神角色武器长名称缩写
   * @param name 名称
   * @param isWeapon 是否武器
   */
  shortName (name, isWeapon = false) {
    let obj = (isWeapon ? Weapon : Character).get(name)
    return obj.abbr || obj.name || ""
  }

  /** 公共配置ck文件修改hook */
  async change_myspubCk () {
    await MysInfo.initCache()
    await MysInfo.initPubCk()
  }

  getGachaSet (groupId = "") {
    let config = this.getYaml("gacha", "set", "config")
    let def = config.default
    if (config[groupId]) {
      return { ...def, ...config[groupId] }
    }
    return def
  }

  getMsgUid (msg) {
    let ret = /(18|[1-9])[0-9]{8}/g.exec(msg)
    if (!ret) return false
    return ret[0]
  }

  /**
   * 获取消息内原神角色名称，uid
   * @param msg 判断消息
   * @param filterMsg 过滤消息
   * @return roleId 角色id
   * @return name 角色名称
   * @return alias 当前别名
   * @return uid 游戏uid
   */
  getRole (msg, filterMsg = "", isSr = false) {
    let alias = msg.replace(/#|老婆|老公|(18|[1-9])[0-9]{8}/g, "").trim()
    if (filterMsg) {
      alias = alias.replace(new RegExp(filterMsg, "g"), "").trim()
    }

    this.isSr = isSr
    /** 判断是否命中别名 */
    let roleId = this.roleNameToID(alias)
    if (!roleId) return false
    /** 获取uid */
    let uid = this.getMsgUid(msg) || ""
    let game = this.isSr ? "sr" : "gs"
    return {
      roleId,
      uid,
      alias,
      game,
      name: this.roleIdToName(roleId)
    }
  }

  cpCfg (app, name) {
    if (!fs.existsSync("./plugins/genshin/config/config")) {
      fs.mkdirSync("./plugins/genshin/config/config", { recursive: true })
    }
    let set = `./plugins/genshin/config/config/${app}.${name}.yaml`
    if (!fs.existsSync(set)) {
      fs.copyFileSync(`./plugins/genshin/config/defSet/${app}/${name}.yaml`, set)
    }
  }

  /** 仅供内部调用 */
  _getAbbr () {
    if (this[this.isSr ? "sr_nameID" : "nameID"]) return
    this.nameID = new Map()
    this.sr_nameID = new Map()
    let nameArr = this.getdefSet("role", "name") || []
    let sr_nameArr = this.getdefSet("role", "sr_name") || []
    let nameArrUser = this.getConfig("role", "name") || []
    let nameID = {}
    for (let i in nameArr) {
      if (!nameArr[i] || nameArr[i].length === 0) continue
      nameID[nameArr[i][0]] = i
      for (let abbr of nameArr[i] || []) {
        this.nameID.set(String(abbr), i)
      }
    }
    for (let i in sr_nameArr) {
      if (!sr_nameArr[i] || sr_nameArr[i].length === 0) continue
      nameID[sr_nameArr[i][0]] = i
      for (let abbr of sr_nameArr[i] || []) {
        this.sr_nameID.set(String(abbr), i)
      }
    }
    for (let i in nameArrUser) {
      if (!nameArrUser[i]) continue
      for (let abbr of nameArrUser[i]) {
        if (nameID[i] != null) this.nameID.set(String(abbr), nameID[i])
      }
    }
  }

  /** 仅供内部调用 */
  _roleNameToID (keyword, isSr) {
    if (isSr) this.isSr = isSr
    if (!isNaN(keyword)) keyword = Number(keyword)
    this._getAbbr()
    let roelId = this[this.isSr ? "sr_nameID" : "nameID"].get(String(keyword))
    return roelId || false
  }

  /** 仅供内部调用 */
  _getRole (msg, filterMsg = "", isSr = false) {
    let alias = msg.replace(/#|老婆|老公|(18|[1-9])[0-9]{8}/g, "").trim()
    if (filterMsg) {
      alias = alias.replace(new RegExp(filterMsg, "g"), "").trim()
    }
    /** 判断是否命中别名 */
    let roleId = this._roleNameToID(alias)
    if (!roleId) return false
    /** 获取uid */
    let uid = this.getMsgUid(msg) || ""
    return {
      roleId,
      uid,
      alias,
      name: this.roleIdToName(roleId)
    }
  }

  getAbbr () {
    if (this[this.isSr ? "sr_nameID" : "nameID"]) return
    this.nameID = new Map()
    this.sr_nameID = new Map()
    let nameArr = this.getdefSet("role", "name") || []
    let sr_nameArr = this.getdefSet("role", "sr_name") || []
    let nameArrUser = this.getConfig("role", "name") || []
    let nameID = {}
    for (let i in nameArr) {
      if (!nameArr[i] || nameArr[i].length === 0) continue
      nameID[nameArr[i][0]] = i
      for (let abbr of nameArr[i] || []) {
        this.nameID.set(String(abbr), i)
      }
    }
    for (let i in sr_nameArr) {
      if (!sr_nameArr[i] || sr_nameArr[i].length === 0) continue
      nameID[sr_nameArr[i][0]] = i
      for (let abbr of sr_nameArr[i] || []) {
        this.sr_nameID.set(String(abbr), i)
      }
    }
    for (let i in nameArrUser) {
      if (!nameArrUser[i]) continue
      for (let abbr of nameArrUser[i]) {
        if (nameID[i] != null) this.nameID.set(String(abbr), nameID[i])
      }
    }
  }

  /**
   * 从GitCode获取配置
   * @param {string} app 功能名称
   * @param {string} name 配置名称
   * @returns {Promise<object>} 配置内容
   */
  async getApiSet (app, name) {
    try {
      const gitcodeUrl = `https://raw.gitcode.com/HanaHimeUnica/game_data/raw/main/${app}/${name}.yaml`
      const response = await fetch(gitcodeUrl, {
        method: "GET",
        headers: {
          Accept: "text/yaml,application/yaml,text/plain",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      })
      if (!response.ok) {
        throw new Error(`GitCode请求失败: ${response.status}`)
      }
      const yamlText = await response.text()
      const data = YAML.parse(yamlText)
      logger.mark(`[GitCode数据][${app}][${name}]`)
      const file = this.getFilePath(app, name, "defSet")
      const dir = file.substring(0, file.lastIndexOf("/"))
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(file, yamlText, "utf8")
      const key = `${app}.${name}`
      delete this.defSet[key]
      return this.getdefSet(app, name)
    } catch (error) {
      logger.error(`[getApiSet][${app}][${name}] 获取失败: ${error}`)
      return this.getdefSet(app, name)
    }
  }

  /**
     * 获取本地配置并异步更新远程数据
     * @param {string} app 功能名称
     * @param {string} name 配置名称
     */
  async getSetData (app, name) {
    /** 先获取本地数据 */
    const localData = this.getdefSet(app, name)
    /** 检查更新标记 */
    const updateKey = `Yz:genshin:apiUpdate:${app}:${name}`
    const hasUpdated = await redis.get(updateKey)
    if (!hasUpdated) {
      /** 设置24小时的更新标记 */
      await redis.setEx(updateKey, 86400, "1")
      /** 异步更新远程数据 */
      setTimeout(() => {
        this.getApiSet(app, name).catch(err => {
          logger.debug(`[${app}][${name}] API更新失败：${err}`)
        })
      }, 0)
    }
    return localData
  }

  getWeaponDataByWeaponHash (hash) {
    logger.error("gsCfg.getWeaponDataByWeaponHash() 已废弃")
    return {}
  }

  getAllAbbr () {
    logger.error("gsCfg.getAllAbbr() 已废弃")
    return {}
  }

  getBingCkSingle (userId) {
    logger.error("gsCfg.getBingCkSingle() 已废弃")
    return {}
  }

  saveBingCk (userId, data) {
    logger.error("gsCfg.saveBingCk() 已废弃")
  }

  getElementByRoleName (roleName) {
    logger.error("gsCfg.getElementByRoleName() 已废弃")
    return ""
  }

  getSkillDataByskillId (skillId, roleName) {
    logger.error("gsCfg.getSkillDataByskillId() 已废弃")
    return {}
  }

  fightPropIdToName (propId) {
    logger.error("gsCfg.fightPropIdToName() 已废弃")
    return ""
  }

  getRoleTalentByTalentId (talentId) {
    logger.error("gsCfg.getRoleTalentByTalentId 已废弃")
    return {}
  }

  /**
   * 获取原神背景图
   * 来自米哈游官方数据，并压缩为 webp 格式
   */
  async gsBgImage () {
    try {
      if (this._bgImage) return this._bgImage
      let res = await fetch(
        "https://fastcdn.mihoyo.com/mi18n/hk4e_cn/m20240919hy3a2yr11c/m20240919hy3a2yr11c-zh-cn.json"
      )
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      res = await res.json()
      let headerBg = String(res.header_bg || "").trim()
      if (!headerBg) {
        throw new Error("header_bg is empty")
      }
      // 兼容 Markdown 链接：[文字](https://xxx)
      const markdownMatch = headerBg.match(/\]\((https?:\/\/[^)]+)\)/)
      if (markdownMatch) {
        headerBg = markdownMatch[1]
      }
      // 如果不是 Markdown，再尝试直接提取 URL
      if (!/^https?:\/\//i.test(headerBg)) {
        const urlMatch = headerBg.match(/https?:\/\/[^\s)]+/i)
        if (urlMatch) {
          headerBg = urlMatch[0]
        }
      }
      if (!/^https?:\/\//i.test(headerBg)) {
        throw new Error(`header_bg 不是有效 URL: ${headerBg}`)
      }
      this._bgImage =
      `${headerBg}${headerBg.includes("?") ? "&" : "?"}` +
      "x-oss-process=image/quality,Q_75/format,webp"
      return this._bgImage
    } catch (err) {
      logger.error(`[gsBgImage] 获取失败：${err}`)
      return `file:///${process.cwd().replace(/\\/g, "/")}/plugins/Mys-plugin/lib/Genshin/resources/img/version/bg.png`
    }
  }

  /**
   * 获取游戏前缀配置
   * @param {string} game 游戏标识 (gs|sr|zzz|wd|bh3|bh2)
   * @returns {string} 前缀字符串
   */
  getGamePrefix (game) {
    const prefixMap = {
      gs: "gsPrefix",
      sr: "srPrefix",
      zzz: "zzzPrefix",
      wd: "wdPrefix",
      bh3: "bh3Prefix",
      bh2: "bh2Prefix"
    }
    const configKey = prefixMap[game]
    if (!configKey) return ""
    return this.getConfig("config", "admin")[configKey] || ""
  }

  /**
   * 获取所有游戏前缀配置（取第一个前缀用于显示）
   * @returns {object} 包含所有游戏前缀的对象
   */
  getAllGamePrefixes () {
    const adminConfig = this.getConfig("config", "admin")
    const preferred = {
      gs: "#",
      sr: "*",
      zzz: "%",
      wd: "&",
      bh3: "!",
      bh2: "￥"
    }
    const pickPrefix = (raw, gameKey) => {
      const def = preferred[gameKey] || ""
      if (!raw) return def
      const parts = String(raw).split("|").map(p => p.trim()).filter(p => p)
      if (parts.length === 0) return def
      if (parts.includes(def)) return def
      return parts[0]
    }
    return {
      gsPrefix: pickPrefix(adminConfig.gsPrefix, "gs"),
      srPrefix: pickPrefix(adminConfig.srPrefix, "sr"),
      zzzPrefix: pickPrefix(adminConfig.zzzPrefix, "zzz"),
      wdPrefix: pickPrefix(adminConfig.wdPrefix, "wd"),
      bh3Prefix: pickPrefix(adminConfig.bh3Prefix, "bh3"),
      bh2Prefix: pickPrefix(adminConfig.bh2Prefix, "bh2")
    }
  }
}

export default new GsCfg()