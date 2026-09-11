import _ from "lodash"
import path from "path"
import md5 from "md5"
import fs from "node:fs"
import YAML from "yaml"
import { Button, MysInfo } from "#index"
import NoteUser from "../model/mys/NoteUser.js"
import { PayData, SrPayData, ZzzPayData, normalizePayMonthData, renderImgData } from "../model/other/payLog.js"

const dirPath = {
  gs: path.resolve("./data/payLog/gs/"),
  sr: path.resolve("./data/payLog/sr/"),
  zzz: path.resolve("./data/payLog/zzz/")
}

export class payLog extends plugin {
  constructor () {
    super({
      name: "[genshin/payLog.js]充值记录",
      dsc: "原神星铁绝区零充值记录,消费记录,充值统计,消费统计",
      event: "message",
      priority: 29,
      rule: [
        { reg: "^#(原神)?(充值|消费)(记录|统计|查询)$", fnc: "gsPayLog" },
        { reg: "^#星铁(充值|消费)(记录|统计|查询)$", fnc: "srPayLog" },
        { reg: "^#绝区零(充值|消费)(记录|统计|查询)$", fnc: "zzzPayLog" }
      ]
    })
  }

  /** 原神充值记录 */
  async gsPayLog (e) {
    return this.payLog(e, "gs")
  }

  /** 星铁充值记录 */
  async srPayLog (e) {
    return this.payLog(e, "sr")
  }

  /** 绝区零充值记录 */
  async zzzPayLog (e) {
    return this.payLog(e, "zzz")
  }

  /** 通用充值记录处理 */
  async payLog (e, game) {
    this.game = game
    e.noTips = true
    let authkey = await this.getAuthKeyFromUpdateLog(e)
    if (authkey) {
      this.authKey = authkey
      this.uid = await MysInfo.getSelfUid(e)
      if (!this.uid) {
        let gameName = game === "gs" ? "" : (game === "sr" ? "星铁" : "绝区零")
        this.reply([`1.请【 #扫码登录 】完成绑定\n2.发送【 #${gameName}充值记录 】即可`, new Button(e).payLog()])
        return false
      }
      if (!fs.existsSync(dirPath[game])) fs.mkdirSync(dirPath[game], { recursive: true })
      const hasData = fs.existsSync(dirPath[game] + `/${this.uid}.json`)
      let gameName = game === "gs" ? "原神" : (game === "sr" ? "星铁" : "绝区零")
      this.reply(`UID:${this.uid}${hasData ? "正在更新" : "正在获取"}${gameName}消费数据，请稍候...`)
      let payData
      if (game === "gs") {
        payData = new PayData(this.authKey, this.uid)
      } else if (game === "sr") {
        payData = new SrPayData(this.authKey, this.uid)
      } else {
        payData = new ZzzPayData(this.authKey, this.uid)
      }
      let imgData = await payData.filtrateData()
      if (imgData?.errorMsg) {
        this.reply(imgData.errorMsg)
        return false
      }
      const mergedData = await this.mergeData(imgData, game)
      let dataImg = await renderImgData(mergedData, game)
      if (!dataImg) {
        let gameName = game === "gs" ? "原神" : (game === "sr" ? "星铁" : "绝区零")
        this.reply(`UID:${this.uid}获取${gameName}充值记录失败`)
        return false
      }
      this.reply([await this.renderImg("genshin", "Mys/html/payLog/payLog", { ...dataImg, game, uid: this.uid, saveId: this.uid }, { retType: "base64", e }), new Button(e).payLog()])
      await this.writeData(imgData, e, game)
      await redis.setEx(`Yz:${game}:mys:qq-uid:${e.user_id}`, 3600 * 24 * 30, imgData.uid)
      await redis.setEx(`Yz:${game}:payLog:${imgData.uid}`, 3600 * 24, this.authKey)
      return true
    }
    let uid = this.uid || await redis.get(`Yz:${game}:mys:qq-uid:${e.user_id}`)
    if (!fs.existsSync(dirPath[game])) fs.mkdirSync(dirPath[game], { recursive: true })
    if (uid && fs.existsSync(dirPath[game] + `/${uid}.json`)) {
      let data = JSON.parse(fs.readFileSync(dirPath[game] + `/${uid}.json`, "utf-8"))
      let dataImg = await renderImgData(data, game)
      if (dataImg) {
        const renderUid = data.uid || uid
        this.game = game
        this.reply([await this.renderImg("genshin", "Mys/html/payLog/payLog", { ...dataImg, game, uid: renderUid, saveId: renderUid }, { retType: "base64", e }), new Button(e).payLog()])
        return true
      }
    }
    let gameName = game === "gs" ? "" : (game === "sr" ? "星铁" : "绝区零")
    this.reply([`1.请【 #扫码登录 】完成绑定\n2.发送【 #${gameName}充值记录 】即可`, new Button(e).payLog()])
    return false
  }

  /** 从 updateLog 逻辑中获取充值 authkey */
  async getAuthKeyFromUpdateLog (e) {
    let authkey = ""
    let headers = {
      Cookie: await this.getCookie(e),
      DS: this.Ds,
      Referer: "https://webstatic.mihoyo.com",
      Origin: "https://webstatic.mihoyo.com",
      "x-rpc-app_version": "2.63.1",
      "x-rpc-client_type": 5,
      "x-rpc-device_id": this.uuid,
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 miHoYoBBS/2.63.1",
      "X-Requested-With": "com.mihoyo.hyperion",
      "x-rpc-platform": "ios",
      "x-rpc-device_model": this.uuid,
      "x-rpc-device_name": this.uuid,
      "x-rpc-channel": "miyousheluodi",
      "x-rpc-sys_version": "13"
    }
    if (headers.Cookie) {
      let res = await MysInfo.get(e, "AuthKey", { headers, auth_appid: "csc" })
      if (res.retcode !== 0) {
        logger.error(res)
        return ""
      }
      authkey = res.data.authkey
    }
    return authkey
  }

  async getCookie (e) {
    try {
      this.uid = await MysInfo.getSelfUid(e)
      if (!this.uid) return ""
      let yamlPath = `./plugins/xiaoyao-cvs-plugin/data/yaml/${e.user_id}.yaml`
      if (!fs.existsSync(yamlPath)) return ""
      let data = YAML.parse(fs.readFileSync(yamlPath, "utf8"))
      if (data[this.uid] && data[this.uid].stoken && data[this.uid].stuid) {
        let { stoken, stuid, mid = "" } = data[this.uid]
        this.ltuid = stuid
        logger.mark(`[payLog] UID:${this.uid} 使用自身UID:${this.uid}的stoken数据 (stuid:${stuid})`)
        return `stoken=${stoken}; stuid=${stuid}; mid=${mid}`
      }
      let targetLtuid = null
      try {
        let user = await NoteUser.create(e.user_id)
        if (user) {
          let game = this.game || e.game || "gs"
          let uidData = user.getUidData(this.uid, game)
          if (uidData && uidData.ltuid) {
            targetLtuid = uidData.ltuid
          }
        }
      } catch (err) {
        logger.debug(`[payLog] 无法通过NoteUser获取ltuid: ${err.message}`)
      }
      if (targetLtuid) {
        logger.mark(`[payLog] UID:${this.uid} 未找到直接数据，尝试查找相同stuid(${targetLtuid})的其他UID`)
        for (let uid in data) {
          if (uid === "undefined" || !data[uid]) continue
          let item = data[uid]
          if (item && item.stuid && String(item.stuid) === String(targetLtuid) && item.stoken) {
            let { stoken, stuid, mid = "" } = item
            this.ltuid = stuid
            logger.mark(`[payLog] UID:${this.uid} 使用相同stuid(${stuid})的UID:${uid}的stoken数据`)
            return `stoken=${stoken}; stuid=${stuid}; mid=${mid}`
          }
        }
        logger.error(`[payLog] UID:${this.uid} 未找到stuid(${targetLtuid})对应的stoken数据`)
      } else {
        logger.error(`[payLog] UID:${this.uid} 无法获取对应的ltuid，无法查找相同stuid的其他UID`)
      }
      logger.error(`[payLog] 无法为UID:${this.uid}找到对应的stoken数据`)
      return ""
    } catch (err) {
      logger.error(err)
      return ""
    }
  }

  get Ds () {
    /** @Womsxd */
    const n = "9ttJY72HxbjwWRNHJvn0n2AYue47nYsK"
    const t = Math.round(new Date().getTime() / 1000)
    const r = _.sampleSize("abcdefghijklmnopqrstuvwxyz0107607077", 6).join("")
    const DS = md5(`salt=${n}&t=${t}&r=${r}`)
    return `${t},${r},${DS}`
  }

  get uuid () {
    function S4 () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4())
  }

  async mergeData (imgData, game) {
    const uid = this.uid || imgData.uid
    if (!uid) {
      return imgData
    }
    const userPath = dirPath[game] + "/" + uid + ".json"
    try {
      let mergedData = { ...imgData, uid }
      if (fs.existsSync(userPath)) {
        const old = JSON.parse(fs.readFileSync(userPath, "utf-8")) || {}
        const getKey = (m) => (m && typeof m.ym !== "undefined" ? String(m.ym) : String(m?.month || ""))
        const newKeys = new Set((imgData.monthData || []).map(getKey))
        const preservedOldMonths = (old.monthData || []).filter(m => !newKeys.has(getKey(m)))
        const mergedMonths = normalizePayMonthData([...preservedOldMonths, ...(imgData.monthData || [])])
        mergedData.monthData = mergedMonths.sort((a, b) => {
          const aHas = typeof a.ym !== "undefined"
          const bHas = typeof b.ym !== "undefined"
          if (aHas && bHas) return Number(a.ym) - Number(b.ym)
          if (aHas && !bHas) return -1
          if (!aHas && bHas) return 1
          const ma = parseInt(String(a.month).replace("月", "")) || 0
          const mb = parseInt(String(b.month).replace("月", "")) || 0
          return ma - mb
        })
        const oldBP = Array.isArray(old.battlePassData) ? old.battlePassData : []
        const newBP = Array.isArray(imgData.battlePassData) ? imgData.battlePassData : []
        const bpMap = new Map()
        ;[...oldBP, ...newBP].forEach(item => {
          if (!item) return
          const key = `${item.time || ""}__${item.type || ""}`
          if (!bpMap.has(key)) bpMap.set(key, item)
        })
        mergedData.battlePassData = Array.from(bpMap.values()).sort((a, b) => {
          const ta = new Date(a.time || 0).getTime()
          const tb = new Date(b.time || 0).getTime()
          return ta - tb
        })
        const oldCrystal = Number(old.crystal || 0)
        const newCrystal = Number(imgData.crystal || 0)
        mergedData.crystal = Math.max(oldCrystal, newCrystal)
      }
      return mergedData
    } catch (err) {
      logger.error(err)
      return imgData
    }
  }

  /** 存储数据 */
  async writeData (imgData, e, game) {
    const uid = this.uid || imgData.uid
    if (!uid) {
      logger.error("[充值记录] 无法获取uid，存储失败")
      return false
    }
    const userPath = dirPath[game] + "/" + uid + ".json"
    try {
      let mergedData = { ...imgData, uid }
      if (fs.existsSync(userPath)) {
        const old = JSON.parse(fs.readFileSync(userPath, "utf-8")) || {}
        const getKey = (m) => (m && typeof m.ym !== "undefined" ? String(m.ym) : String(m?.month || ""))
        const newKeys = new Set((imgData.monthData || []).map(getKey))
        const preservedOldMonths = (old.monthData || []).filter(m => !newKeys.has(getKey(m)))
        const mergedMonths = normalizePayMonthData([...preservedOldMonths, ...(imgData.monthData || [])])
        mergedData.monthData = mergedMonths.sort((a, b) => {
          const aHas = typeof a.ym !== "undefined"
          const bHas = typeof b.ym !== "undefined"
          if (aHas && bHas) return Number(a.ym) - Number(b.ym)
          if (aHas && !bHas) return -1
          if (!aHas && bHas) return 1
          const ma = parseInt(String(a.month).replace("月", "")) || 0
          const mb = parseInt(String(b.month).replace("月", "")) || 0
          return ma - mb
        })
        const oldBP = Array.isArray(old.battlePassData) ? old.battlePassData : []
        const newBP = Array.isArray(imgData.battlePassData) ? imgData.battlePassData : []
        const bpMap = new Map()
        ;[...oldBP, ...newBP].forEach(item => {
          if (!item) return
          const key = `${item.time || ""}__${item.type || ""}`
          if (!bpMap.has(key)) bpMap.set(key, item)
        })
        mergedData.battlePassData = Array.from(bpMap.values()).sort((a, b) => {
          const ta = new Date(a.time || 0).getTime()
          const tb = new Date(b.time || 0).getTime()
          return ta - tb
        })
        const oldCrystal = Number(old.crystal || 0)
        const newCrystal = Number(imgData.crystal || 0)
        mergedData.crystal = Math.max(oldCrystal, newCrystal)
      }
      fs.writeFileSync(userPath, JSON.stringify(mergedData, null, 2), "utf-8")
    } catch (err) {
      logger.error(err)
      return false
    }
    return true
  }
}
