import _ from "lodash"
import fs from "node:fs"
import YAML from "yaml"
import sqlite3 from "sqlite3"
import { promisify } from "node:util"
import MysUser from "./mys/MysUser.js"
import NoteUser from "./mys/NoteUser.js"
import { getGameData } from "./gameData.js"
import { UserGameDB, sequelize, UserDB } from "#index.db"
import { base, Button, MysInfo, common, Player, Data, gsCfg } from "#index"

const db = new sqlite3.Database(process.cwd() + "/data/db/data.db")

export default class User extends base {
  constructor (e) {
    super(e)
    /** 绑定的uid */
    this.uidKey = `Yz:genshin:mys:qq-uid:${this.userId}`
    /** 多角色uid */
    this.allUid = []
    if (this.e.isSr) {
      /** 绑定的uid */
      this.uidKey = `Yz:srJson:mys:qq-uid:${this.userId}`
    }
    /** 未绑定uid提示 */
    this.name = "原神"
    this.mark = "#"
    if (this.e.game == "sr") {
      this.name = "星铁"
      this.mark = "*"
    } else if (this.e.game == "zzz") {
      this.name = "绝区零"
      this.mark = "%"
    } else if (this.e.game == "wd") {
      this.name = "未定事件簿"
      this.mark = "&"
    }
  }

  /** 获取当前user实例 */
  async user () {
    return await NoteUser.create(this.e)
  }

  async resetCk () {
    let user = await this.user()
    await user.initCache()
  }

  /** 绑定ck */
  async bing () {
    let user = await this.user()
    if (this.ck && !this.e.ck) {
      this.e.ck = this.ck
    }
    if (!this.e.ck) {
      await this.e.reply(["请【#扫码登录】绑定Cookie", new Button(this.e).bingStoken()])
      return
    }

    let ckStr = this.e.ck.replace(/#|'|"/g, "")
    let param = {}
    ckStr.split(";").forEach((v) => {
      /** 处理分割特殊cookie_token */
      let tmp = _.trim(v).replace("=", "~").split("~")
      param[tmp[0]] = tmp[1]
    })
    if (!param.cookie_token && !param.cookie_token_v2) {
      await this.e.reply("发送Cookie不完整\n请退出米游社【重新登录】，刷新完整Cookie")
      return
    }
    /** TODO：独立的mys数据，不走缓存ltuid */
    let mys = await MysUser.create(param.ltuid || param.ltuid_v2 || param.account_id_v2 || param.ltmid_v2)
    if (!mys) {
      await this.e.reply("发送Cookie不完整或数据错误")
      return
    }
    let data = {}
    data.ck = `ltoken=${param.ltoken};ltuid=${param.ltuid || param.login_uid};cookie_token=${param.cookie_token || param.cookie_token_v2}; account_id=${param.ltuid || param.login_uid};`
    let flagV2 = false
    if (param.cookie_token_v2 && (param.account_mid_v2 || param.ltmid_v2)) {
      /** account_mid_v2 为版本必须带的字段，不带的话会一直提示绑定cookie失败 请重新登录 */
      flagV2 = true
      data.ck = `ltuid=${param.ltuid || param.login_uid || param.ltuid_v2};account_mid_v2=${param.account_mid_v2};cookie_token_v2=${param.cookie_token_v2};ltoken_v2=${param.ltoken_v2};ltmid_v2=${param.ltmid_v2};`
    }
    if (param.mi18nLang) {
      data.ck += ` mi18nLang=${param.mi18nLang};`
    }
    /** 拼接ck */
    data.ltuid = param.ltuid || param.ltuid_v2 || param.account_id_v2 || param.ltmid_v2
    /** 米游币签到字段 */
    data.login_ticket = param.login_ticket ?? ""
    mys.setCkData(data)
    /** 检查ck是否失效 */
    let uidRet = await mys.reqMysUid()
    if (uidRet.status !== 0) {
      logger.mark(`绑定Cookie错误1：${this.checkMsg || "Cookie错误"}`)
      /** 清除mys数据 */
      mys._delCache()
      return await this.e.reply(`绑定Cookie失败：${this.checkMsg || "Cookie错误"}`)
    }
    /** 判断data.ltuid是否是数字 */
    if (flagV2 && isNaN(data.ltuid)) {
      /** 获取米游社通行证id */
      let userFullInfo = await mys.getUserFullInfo()
      if (userFullInfo?.data?.user_info) {
        let userInfo = userFullInfo?.data?.user_info
        this.ltuid = userInfo.uid || this.ltuid
        this.ck = `${this.ck}ltuid=${this.ltuid};`
      } else {
        logger.mark(`绑定Cookie错误2：${userFullInfo.message || "Cookie错误"}`)
        return await this.e.reply(`绑定Cookie失败：${userFullInfo.message || "Cookie错误"}`)
      }
    }
    logger.mark(`${this.e.logFnc} 检查Cookie正常 [ltuid:${mys.ltuid}]`)
    await user.addMysUser(mys)
    await mys.initCache()
    await user.save()
    logger.mark(`${this.e.logFnc} 保存Cookie成功 [ltuid:${mys.ltuid}]`)
    this.uidInfo = mys.getUidInfo()
    let uidMsg = ["绑定Cookie成功\n", this.uidInfo, "\n使用命令说明#云崽帮助"]
    await this.e.reply(uidMsg)
  }

  /** 删除绑定ck */
  async delCk () {
    let game
    if (this.e.game) {
      game = this.e.game
    } else {
      game = "gs"
    }
    /** 判断是原神还是星铁 */
    let user = await this.user()
    /** 获取当前uid */
    let uidData = user.getUidData("", game, this.e)
    if (!uidData || uidData.type !== "ck" || !uidData.ltuid) {
      return `删除失败：当前的UID${uidData?.uid}无CK信息`
    }
    let mys = await MysUser.create(uidData.ltuid)
    if (!mys) {
      return `删除失败：当前的UID${uidData?.uid}无CK信息`
    }
    let msg = ["绑定Cookie已删除", mys.getUidInfo()]
    await user.delMysUser(uidData.ltuid)
    return msg.join("\n")
  }

  /** 绑定uid，若有ck的话优先使用ck-uid */
  async bingUid () {
    const bh2 = /[1-9][0-9]{5,7}/g
    const bh3 = /[1-9][0-9]{7,9}/g
    const wd = /[1-9][0-9]{7,8}/g
    const zzz = /(1[0-9]|[1-9])[0-9]{8}|[1-9][0-9]{7}/g
    let uid = this.e.msg.match(this.e.game == "bh2" ? bh2 : this.e.game == "bh3" ? bh3 : this.e.game == "wd" ? wd : this.e.game == "zzz" ? zzz : /(18|[1-9])[0-9]{8}/g)
    if (!uid) return
    uid = uid[0]
    let user = await this.user()
    await user.addRegUid(uid, this.e)
    return await this.showUid()
  }

  async delUid (index) {
    let user = await this.user()
    let game = this.e
    let uidList = user.getUidList(game)
    if (index > uidList.length) {
      return await this.e.reply([`${this.name}uid序号输入错误`, segment.button([
        { text: "删除UID", input: `${this.mark}删除uid` }
      ])])
    }
    index = Number(index) - 1
    let uidObj = uidList[index]
    if (uidObj.type === "ck") {
      return await this.e.reply(["CK对应UID无法直接删除，\n请通过【#删除ck】命令来删除", segment.button([
        { text: "删除Cookie", callback: "#删除ck" }
      ])])
    }
    await user.delRegUid(uidObj.uid, game)
    return await this.showUid()
  }

  async delUidByUid (uid) {
    let user = await this.user()
    let game = this.e
    let uidData = user.getUidData(uid, game)
    if (!uidData) {
      return await this.e.reply([`${this.name}暂无此uid: ${uid}`, segment.button([
        { text: "删除UID", input: `${this.mark}删除uid` }
      ])])
    }
    if (uidData.type === "ck") {
      return await this.e.reply(["CK对应UID无法直接删除，\n请通过【#删除ck】命令来删除", segment.button([
        { text: "删除Cookie", callback: "#删除ck" }
      ])])
    }
    await user.delRegUid(uid, game)
    return await this.showUid()
  }

  /** #uid */
  async showUid_bak () {
    let user = await this.user()
    let msg = []
    let typeMap = { ck: "CK Uid", reg: "绑定 Uid" }
    _.forEach({ gs: "原神 (#uid)", sr: "星穹铁道 (*uid)", zzz: "绝区零 (%uid)", wd: "未定事件簿 (&uid)", bh3: "崩坏三 (!uid)", bh2: "崩坏二 (￥uid)" }, (gameName, game) => {
      let uidList = user.getUidList(game)
      let currUid = user.getUid(game)
      msg.push(`【${gameName}】`)
      let mark, text
      switch (game) {
        case "gs":
          mark = "#"
          text = "绑定123456789"
          break
        case "sr":
          mark = "*"
          text = "绑定123456789"
          break
        case "zzz":
          mark = "%"
          text = "绑定12345678"
          break
        case "wd":
          mark = "&"
          text = "绑定12345678"
          break
        case "bh3":
          mark = "!"
          text = "绑定UID"
          break
        case "bh2":
          mark = "￥"
          text = "绑定UID"
          break
        default:
          mark = ""
          text = ""
          break
      }
      if (uidList.length === 0) {
        msg.push(`暂无，通过${mark}${text}来绑定UID`)
        return true
      }
      _.forEach(uidList, (ds, idx) => {
        let tmp = `${++idx}: ${ds.uid} (${typeMap[ds.type]})`
        if (currUid * 1 === ds.uid * 1) {
          tmp += " ☑"
        }
        msg.push(tmp)
      })
    })
    msg.unshift("通过【#uid+序号】来切换uid，\n【#删除uid+序号】删除uid")
    await this.e.reply(msg.join("\n"))
  }

  /** #uid */
  async showUid () {
    let user = await this.user()
    let uids = [{
      key: "gs",
      name: "原神"
    }, {
      key: "sr",
      name: "崩坏：星穹铁道"
    }, {
      key: "zzz",
      name: "绝区零"
    }, {
      key: "wd",
      name: "未定事件簿"
    }, {
      key: "bh3",
      name: "崩坏3"
    }, {
      key: "bh2",
      name: "崩坏学园二"
    }]
    for (const ds of uids) {
      ds.uidList = user.getUidList(ds.key)
      ds.uid = user.getUid(ds.key)
      for (const uidDs of ds.uidList) {
        const cache = getGameData(ds.key, uidDs.uid)
        if (ds.key == "gs" || ds.key == "sr") {
          let player = Player.create(uidDs.uid, ds.key)
          if (player) {
            uidDs.name = player.name
            uidDs.level = player.level
            let imgs = player?.faceImgs || {}
            uidDs.face = imgs.face
            uidDs.banner = imgs.banner
            const deviceFpData = await this.getdb(Number(uidDs.ltuid))
            uidDs.device_fp = deviceFpData ? "yes" : "no"
          }
        } else {
          uidDs.other_face = true
          uidDs.other_banner = true
          if (ds.key === "bh3") {
            uidDs.server_name = await this.getBh3ServerName(uidDs)
          }
          const deviceFpData = await this.getdb(Number(uidDs.ltuid))
          uidDs.device_fp = deviceFpData ? "yes" : "no"
        }
        if (!_.isEmpty(cache)) {
          uidDs.name = cache.name || uidDs.name || `玩家${uidDs.uid || ""}`
          uidDs.level = cache.level || uidDs.level
          uidDs.server = cache.server || uidDs.server_name || uidDs.server
          uidDs.gameFace = this.isValidGameAvatar(cache.avatar) ? cache.avatar : ""
          uidDs.hasGameData = !!(uidDs.name || uidDs.level || uidDs.server || uidDs.gameFace)
        }
      }
    }
    const layoutPath = process.cwd() + "/plugins/genshin/resources/other/layout/"
    const { backgroundimage } = gsCfg.getConfig("config", "uid")
    let elementLayout = layoutPath + "elem.html"
    let elem = backgroundimage
    const elements = ["火", "水", "风", "雷", "冰", "草", "岩", "量子", "虚数", "物理"]
    if (elem === "随机") {
      elem = _.sample(elements)
    }
    let id = this.getSeed_id()
    return this.e.reply([await this.e.runtime.render("genshin", "Mys/html/user/uid-list", { uids, elementLayout, elem, saveId: id }, { retType: "base64" }), new Button(this.e).bingGameUid()])
  }

  isValidGameAvatar (avatar = "") {
    avatar = String(avatar || "")
    return !!avatar && !avatar.includes("/common/item/face.webp")
  }

  async getBh3ServerName (uidDs = {}) {
    let cached = {}
    try {
      cached = JSON.parse(await redis.get(`genshin:usergame:${uidDs.uid}:bh3_role`) || "{}")
    } catch (e) {
      cached = {}
    }
    uidDs = { ...cached, ...uidDs }
    const regionName = uidDs.region_name || uidDs.regionName
    if (regionName) return regionName
    const region = uidDs.region || ""
    const serverMap = {
      android01: "安卓官服",
      bb01: "哔哩哔哩",
      hun01: "渠道1服",
      hun02: "渠道2服",
      pc01: "全平台（桌面）服",
      ios01: "iOS服",
      yyb01: "应用宝服",
      os_usa: "America Server",
      os_euro: "Europe Server",
      os_asia: "Asia Server",
      os_cht: "TW, HK, MO Server"
    }
    return serverMap[region] || region
  }

  getSeed_id (length = 9) {
    const characters = "0123456789abcdef"
    let result = ""
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)]
    }
    return result
  }

  /** 切换uid */
  async toggleUid (index, showList = true) {
    let user = await this.user()
    let game = this.e.game || "gs"
    let uidList = user.getUidList(game)
    if (index > uidList.length) {
      return await this.e.reply([`${this.name}uid序号输入错误`, new Button(this.e).bingGameUid()])
    }
    index = Number(index) - 1
    user.setMainUid(index, game)
    await user.save()
    const newUid = user.getUid(game)
    try {
      if (showList) {
        return await this.showUid()
      } else {
        console.log(`已切换 ${this.name} UID：${newUid}`)
        return true
      }
    } catch (err) {
      try { console.error(err) } catch (_) {}
      return true
    }
  }

  /** 加载V2ck */
  async loadOldDataV2 () {
    let file = [
      "./data/MysCookie/NoteCookie.json",
      "./data/NoteCookie/NoteCookie.json",
      "./data/NoteCookie.json"
    ]
    let json = file.find(v => fs.existsSync(v))
    if (!json) return
    let list = JSON.parse(fs.readFileSync(json, "utf8"))
    let arr = {}
    logger.mark(logger.green("加载用户ck..."))
    _.forEach(list, (ck, qq) => {
      if (ck.qq) qq = ck.qq
      let isMain = false
      if (!arr[qq]) {
        arr[qq] = {}
        isMain = true
      }
      let param = {}
      ck.cookie.split(";").forEach((v) => {
        let tmp = _.trim(v).split("=")
        param[tmp[0]] = tmp[1]
      })
      let ltuid = param.ltuid
      if (!param.cookie_token) return
      arr[qq][String(ck.uid)] = {
        uid: ck.uid,
        qq,
        ck: ck.cookie,
        ltuid,
        isMain
      }
    })
    let count = await this.loadOldData(arr)
    if (count > 0) {
      logger.mark(logger.green(`DB导入V2用户ck${count}个`))
    }
    fs.unlinkSync(json)
  }

  /** 加载V3ck */
  async loadOldDataV3 () {
    let dir = "./data/MysCookie/"
    if (!fs.existsSync(dir)) {
      return false
    }
    Data.createDir("./temp/MysCookieBak")
    let files = fs.readdirSync(dir).filter(file => file.endsWith(".yaml"))
    const readFile = promisify(fs.readFile)
    let promises = []
    if (files.length === 0) {
      fs.rmdirSync("./data/MysCookie/")
      return
    }
    files.forEach((v) => promises.push(readFile(`${dir}${v}`, "utf8")))
    const res = await Promise.all(promises)
    let ret = {}
    for (let v of res) {
      v = YAML.parse(v)
      let qq
      for (let k in v) {
        qq = qq || v[k]?.qq
      }
      if (qq) {
        ret[qq] = v
      }
    }
    let count = await this.loadOldData(ret)
    if (count > 0) {
      logger.mark(logger.green(`DB导入V3用户ck${count}个`))
    }
  }

  async loadOldUid () {
    /** 从DB中导入 */
    await sequelize.query("delete from UserGames where userId is null or data is null", {})
    let games = await UserGameDB.findAll()
    let count = 0
    await Data.forEach(games, async (game) => {
      if (!game.userId) {
        game.destroy()
        return true
      }
      count++
      let user = await NoteUser.create(game.userId)
      if (game.userId && game.data) {
        _.forEach(game.data, (ds) => {
          let { uid } = ds
          user.addRegUid(uid, game.game, false)
        })
      }
      if (game.uid) {
        user.setMainUid(game.uid, game.game, false)
      }
      await user.save()
      await game.destroy()
    })
    /** 从Redis中导入 */
    let keys = await redis.keys("Yz:genshin:mys:qq-uid:*")
    for (let key of keys) {
      let uid = await redis.get(key)
      let qqRet = /Yz:genshin:mys:qq-uid:(\d{5,12})/.exec(key)
      if (qqRet?.[1] && uid) {
        let user = await NoteUser.create(qqRet[1])
        if (!user.getUid("gs")) {
          user.addRegUid(uid, "gs")
        }
      }
      redis.del(key)
    }
    await sequelize.query("delete from Users where (ltuids is null or ltuids='') and games is null", {})
    console.log("load Uid Data Done...")
  }

  /**
   * 清理Users表中无用数据：
   * - 删除 ltuids 为空且 games 为空结构/无有效数据 的记录
   * 返回删除统计
   */
  async cleanupUsersTable () {
    let users = await UserDB.findAll({ attributes: ["id", "ltuids", "games"] })
    let toDelete = []
    const isEmptyGames = (gamesRaw) => {
      if (!gamesRaw) return true
      try {
        const obj = JSON.parse(gamesRaw)
        const keys = ["gs", "sr", "zzz", "wd", "bh3", "bh2"]
        return keys.every(k => {
          const ds = obj?.[k] || {}
          const uidEmpty = !ds.uid
          const dataEmpty = !ds.data || Object.keys(ds.data || {}).length === 0
          return uidEmpty && dataEmpty
        })
      } catch (e) {
        return true
      }
    }
    for (const u of users) {
      const ltuids = (u.ltuids || "").trim()
      const gamesRaw = u.getDataValue("games")
      if (!ltuids && isEmptyGames(gamesRaw)) {
        toDelete.push(String(u.id))
      }
    }
    let deleted = 0
    if (toDelete.length > 0) {
      for (const id of toDelete) {
        await UserDB.destroy({ where: { id } })
        deleted++
      }
    }
    return { deleted, scanned: users.length }
  }

  /** 统计 Users 表行数 */
  async countUsers () {
    try {
      return await UserDB.count()
    } catch (e) {
      return 0
    }
  }

  async loadOldData (data) {
    let count = 0
    if (!_.isPlainObject(data)) {
      return
    }
    for (let u in data) {
      let ltuids = {}
      let v = data[u]
      let qq
      for (let k in v) {
        let data = v[k]
        qq = qq || data?.qq
        let { uid, ck, ltuid, region_name: region, device_id: device } = data
        ltuids[ltuid] = ltuids[ltuid] || {
          ck,
          device,
          ltuid,
          uids: {},
          type: /America Server|Europe Server|Asia Server/.test(region) ? "hoyolab" : "mys"
        }
        let tmp = ltuids[ltuid]
        let game = region === "星穹列车" ? "sr" : "gs"
        tmp.uids[game] = tmp.uids[game] || []
        let gameUids = tmp.uids[game]
        if (!gameUids.includes(uid + "")) {
          gameUids.push(uid + "")
        }
      }
      if (!qq) {
        continue
      }
      let user = await NoteUser.create(qq)
      for (let ltuid in ltuids) {
        let data = ltuids[ltuid]
        let mys = await MysUser.create(data.ltuid)
        if (mys) {
          mys.setCkData(data)
          await mys.save()
          user.addMysUser(mys)
        }
      }
      await user.save()
      if (fs.existsSync(`./data/MysCookie/${qq}.yaml`)) {
        try {
          let src = `./data/MysCookie/${qq}.yaml`
          let dest = `./temp/MysCookieBak/${qq}.yaml`
          await fs.promises.unlink(dest).catch((_) => {
          })
          await fs.promises.copyFile(src, dest)
          await fs.promises.unlink(src)
        } catch (err) {
          console.log(err)
        }
      }
      count++
    }
  }

  /** 我的ck */
  async myCk () {
    let user = await this.user()
    if (!user.hasCk) {
      this.e.reply(["请先绑定Cookie发送【#扫码登录】", new Button(this.e).bingStoken()])
    }
    let mys = user.getMysUser(this.e)
    if (mys) {
      await this.e.reply(`当前绑定Cookie\nuid：${mys.getUid(this.e)}`)
      await this.e.reply(mys.ck)
    }
  }

  async checkCkStatus () {
    let user = await this.user()
    if (!user.hasCk) {
      await this.e.reply(`\n未绑定CK，当前绑定uid：${user.uid || "无"}`, false, { at: true })
      return true
    }
    let uid = user.uid * 1
    let uids = user.ckUids
    let checkRet = await user.checkCk()
    let cks = []
    _.forEach(checkRet, (ds, idx) => {
      let tmp = [`\n#${idx + 1}: [CK:${ds.ltuid}] - 【${ds.status === 0 ? "正常" : "失效"}】`]
      if (ds.uids && ds.uids.length > 0) {
        let dsUids = []
        _.forEach(ds.uids, (u) => {
          dsUids.push(u * 1 === uid ? `☑${u}` : u)
        })
        tmp.push(`绑定UID: [ ${dsUids.join(", ")} ]`)
      }
      if (ds.status !== 0) {
        tmp.push(ds.msg)
      }
      cks.push(tmp.join("\n"))
    })
    if (uids.length > 1) {
      cks.push(`当前生效UID：${uid}\n通过【#uid】命令可查看并切换UID`)
    }
    await this.e.reply([cks.join("\n----\n"), new Button(this.e).bingGameUid()], false, { at: true })
  }

  async userAdmin () {
    await MysInfo.initCache()
    let stat = await MysUser.getStatData()
    return {
      saveId: "user-admin",
      ...stat,
      _plugin: "genshin",
      ...this.screenData
    }
  }

  async bindNoteUser () {
    let user = await this.user()
    let id = user.qq
    let { e } = this
    let { msg, mainUserId, originalUserId } = e
    if (!id) {
      return true
    }
    if (/(删除绑定|取消绑定|解除绑定|解绑|删除|取消)/.test(msg)) {
      /** 删除用户 */
      id = originalUserId || id
      if (/主/.test(msg)) {
        let mainId = await redis.get(`Yz:NoteUser:mainId:${id}`)
        if (!mainId) {
          e.reply("当前用户没有主用户，在主用户中通过【#绑定用户】可进行绑定...")
          return true
        }
        let subIds = await Data.getCacheJSON(`Yz:NoteUser:subIds:${mainId}`)
        delete subIds[id]
        await redis.del(`Yz:NoteUser:mainId:${id}`)
        await Data.setCacheJSON(`Yz:NoteUser:subIds:${mainId}`, subIds)
        e.reply("已经解除与主用户的绑定...")
      } else if (/子/.test(msg)) {
        let subIds = await Data.getCacheJSON(`Yz:NoteUser:subIds:${id}`)
        let count = 0
        for (let key in subIds) {
          await redis.del(`Yz:NoteUser:mainId:${key}`)
          count++
        }
        if (count > 0) {
          e.reply(`已删除${count}个子用户...`)
          await redis.del(`Yz:NoteUser:subIds:${id}`)
        } else {
          e.reply("当前用户没有子用户，通过【#绑定用户】可绑定子用户...")
        }
      }
      return true
    }
    msg = msg.replace(/^#\s*(接受)?绑定(主|子)?(用户|账户|账号)/, "")
    let idRet = /^\[(\w{5,})](?:\[(\w+)])?$/.exec(msg)
    if (idRet && idRet[1]) {
      let mainId = idRet[1]
      let currId = id.toString()
      if (!idRet[2]) {
        /** 子用户绑定 */
        if (currId === mainId) {
          if (originalUserId && originalUserId !== mainId && mainUserId === mainId) {
            e.reply("当前账户已完成绑定...")
          } else {
            e.reply("请切换到需要绑定的子用户并发送绑定命令...")
          }
          return true
        }
        let verify = (Math.floor(100000000 + Math.random() * 100000000)).toString()
        await redis.set(`Yz:NoteUser:verify:${mainId}`, verify + "||" + currId, { EX: 300 })
        e.reply([`此账号将作为子用户，绑定至主用户:${mainId}`,
          "成功绑定后，此用户输入的命令，将视作主用户命令，使用主用户的CK与UID等信息",
          "如需继续绑定，请在5分钟内，使用主账户发送以下命令：", "",
        `#接受绑定子用户[${mainId}][${verify}]`
        ].join("\n"))
        return true
      } else {
        /** 接受绑定 */
        if (currId !== mainId) {
          e.reply("请切换到主用户并发送接受绑定的命令...")
          return true
        }
        let verify = await redis.get(`Yz:NoteUser:verify:${mainId}`) || ""
        verify = verify.split("||")
        if (!verify || verify[0] !== idRet[2] || !verify[1]) {
          e.reply("校验失败，请发送【#绑定用户】重新开始绑定流程")
          await redis.del(`Yz:NoteUser:verify:${mainId}`)
          return true
        }
        let subId = verify[1]
        await redis.del(`Yz:NoteUser:verify:${mainId}`)
        await redis.set(`Yz:NoteUser:mainId:${subId}`, mainId, { EX: 3600 * 24 * 365 })
        let subIds = await Data.getCacheJSON(`Yz:NoteUser:subIds:${mainId}`)
        subIds[subId] = "true"
        await Data.setCacheJSON(`Yz:NoteUser:subIds:${mainId}`, subIds)
        e.reply("绑定成功，绑定的子用户可使用主用户的UID/CK等信息\n请勿接受不是自己用户的绑定，如需解绑可通过【#解绑子用户】进行解绑")
        return true
      }
    } else {
      if (mainUserId && originalUserId && originalUserId !== mainUserId) {
        e.reply("当前账户已有绑定的主账户，请使用主账户发起绑定...")
        return true
      }
      e.reply(["将此账号作为【主用户】，绑定其他子用户。", "",
        "可在多个QQ或频道间打通用户信息，子用户会使用主用户的CK与UID等信息",
        "注意：请勿接受不是自己用户的绑定！",
        "请【切换至需要绑定的子用户】并发送以下命令，获得验证命令...", "",
        `#绑定主用户[${id}]`].join("\n"))
    }
  }

  async getdb (ltuid) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM MysUsers WHERE ltuid = ?", ltuid, (err, row) => {
        if (err) {
          reject(err)
        } else {
          if (row && row.device_fp && row.device_fp.trim().length > 0) {
          } else {
          }
          resolve(row ? row.device_fp : null)
        }
      })
    })
  }
}
