import axios from "axios"
import sqlite3 from "sqlite3"
import { MysInfo, Button } from "#index"

const db = new sqlite3.Database(process.cwd() + "/data/db/data.db")
init()

export class Handler extends plugin {
  constructor () {
    super({
      name: "[genshin/device_fp.js]设备信息",
      priority: -Infinity,
      handler: [
        { key: "mys.req.err", fn: "mysReqErrHandler" }
      ],
      rule: [
        { reg: "^#*(星铁)?绑定设备(id)?(帮助|说明)?$", fnc: "LoginHelp" },
        { reg: /^#(星铁)?绑定设备(id)?([\s\S]*)$/i, fnc: "Login" }
      ]
    })
  }

  /** handler请求 */
  async mysReqErrHandler (e, args, reject) {
    let { data, mysApi, type } = args
    if (![1034, 5003, 10035, 10041].includes(Number(args?.res?.retcode))) {
      return reject()
    }
    const match = args.mysApi.cookie.match(/ltuid=(\d+)/)
    let fp = await this.getdb(match[1])
    let _fp
    if (fp) {
      _fp = JSON.parse(fp)
      logger.debug(_fp)
    } else {
      return reject()
    }
    try {
      if (data?.headers) {
        data.headers = {
          ...data.headers,
          "x-rpc-device_fp": _fp.data.device_fp
        }
      } else {
        if (!data) data = {}
        data.headers = { "x-rpc-device_fp": _fp.data.device_fp }
      }
      let res = await mysApi.getData(type, data)
      if (![1034, 5003, 10035, 10041].includes(Number(res?.retcode))) {
        logger.debug(res)
        return res
      }
      return reject()
    } catch (err) {
      logger.info(err)
    }
    return reject()
  }

  /** 绑定设备id */
  async Login (e) {
    let message = e.msg.replace(/^#(星铁)?绑定设备(id)?/i, "")
    let uid = await MysInfo.getUid(e, false)
    if (!uid) return false
    let ck = await MysInfo.checkUidBing(uid, e)
    if (!ck) {
      e.reply([`UID:${uid}请【#扫码登录】绑定Cookie`, new Button(this.e).bingStoken()])
      return true
    }
    return await this.bindDevice(e, message, ck)
  }

  async bindDevice (e, message, cookie) {
    let uid = await MysInfo.getUid(e, false)
    let info
    try {
      info = JSON.parse(message)
    } catch (err) {
      const match = message.trim().match(/^([a-fA-F0-9\-]+):([a-zA-Z0-9]+)$/)
      if (match) {
        const [, device_id, device_fp] = match
        info = { device_id, device_fp }
        const parse = { data: { device_fp, device_id } }
        await this.rundb(e, cookie.ltuid, JSON.stringify(parse))
        return true
      }
      e.reply(`UID:${uid}设备信息格式错误`, false, { at: true, recallMsg: 100 })
      return false
    }
    if (info.device_fp && info.device_id && Object.keys(info).length === 2) {
      const parse = { data: { device_fp: info.device_fp, device_id: info.device_id } }
      await this.rundb(e, cookie.ltuid, JSON.stringify(parse))
      return true
    }
    try {
      if (!this.validateDeviceInfo(info)) {
        e.reply(`UID:${uid}设备信息格式错误`, false, { at: true, recallMsg: 100 })
        return false
      }
      const { deviceName, deviceModel, oaid, deviceFingerprint, deviceBoard } = info
      const deviceBrand = deviceFingerprint.split("/")[0]
      const headers = this.getCommonHeaders(cookie, deviceName, deviceModel, deviceBrand)
      const fpResponse = await axios.post("https://public-data-api.mihoyo.com/device-fp/api/getFp", {
        app_name: "bbs_cn",
        bbs_device_id: `${this.getDeviceGuid()}`,
        device_fp: "38d7faa51d2b6",
        device_id: "35315696b7071100",
        ext_fields: `{"proxyStatus":1,"isRoot":1,"romCapacity":"512","deviceName":"Xperia 1","productName":"${deviceModel}","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.getDeviceGuid()}","model":"${deviceModel}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceName}","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"${deviceFingerprint}","vaid":"${this.getDeviceGuid()}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"${deviceModel}","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":76,"hasKeyboard":0,"board":"${deviceBoard}"}`,
        platform: "2",
        seed_id: `${this.getDeviceGuid()}`,
        seed_time: new Date().getTime() + ""
      }, { headers })
      if (!fpResponse.data.data) {
        throw new Error("Failed to get device fingerprint")
      }
      const { device_fp } = fpResponse.data.data
      const updatedHeaders = { ...headers, "x-rpc-device_fp": device_fp }
      const commonParams = this.getCommonParams(deviceBrand, deviceModel)
      const Login = await axios.post("https://bbs-api.miyoushe.com/apihub/api/deviceLogin", commonParams, { headers: updatedHeaders })
      const Device = await axios.post("https://bbs-api.miyoushe.com/apihub/api/saveDevice", commonParams, { headers: updatedHeaders })
      const result = await Promise.all([Login.data, Device.data])
      logger.debug(`[米游社][设备登录]${JSON.stringify(result)}`)
      await this.rundb(e, cookie.ltuid, JSON.stringify(fpResponse.data))
    } catch (error) {
      logger.error("Error binding device:", error)
      e.reply(`UID:${uid}绑定失败，请稍后再试`)
    }
  }

  validateDeviceInfo (info) {
    /** 验证设备信息逻辑 */
    return (
      info &&
      info.deviceName &&
      info.deviceModel &&
      info.oaid &&
      info.deviceFingerprint &&
      info.deviceProduct &&
      info.deviceBoard ||
      (info.device_id && info.device_fp)
    )
  }

  getCommonParams (deviceBrand, deviceModel) {
    return {
      app_version: "2.73.1",
      device_id: `${this.getDeviceGuid()}`,
      device_name: `${deviceBrand}${deviceModel}`,
      os_version: "33",
      platform: "Android",
      registration_id: this.getSeed_id(19)
    }
  }

  getCommonHeaders (cookie, deviceName, deviceModel, deviceBrand) {
    return {
      "x-rpc-app_version": "2.73.1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; J9110 Build/55.2.A.4.332; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 miHoYoBBS/2.73.1",
      "x-rpc-sys_version": "12",
      "x-rpc-client_type": "2",
      "x-rpc-channel": "mihoyo",
      Referer: "https://act.mihoyo.com/",
      Origin: "https://act.mihoyo.com",
      cookie: cookie.ck,
      "x-rpc-device_id": `${this.getDeviceGuid()}`,
      "x-rpc-device_name": `${deviceName}`,
      "x-rpc-device_model": `${deviceModel}`,
      "x-rpc-csm_source": "myself"
    }
  }

  /** 绑定设备帮助 */
  async LoginHelp () {
    const msgs = [
      "PS: 绑定前请先查看当前绑定UID",
      "无原神UID使用*绑定设备id+复制内容",
      "请扫描二维码查看安卓&IOS绑定说明"
    ]
    await this.e.reply([segment.image("./plugins/genshin/resources/Mys/img/other/绑定设备.png"), msgs.join("\n"), new Button(this.e).device_id()])
  }

  getDeviceGuid () {
    function S4 () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }

    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4())
  }

  getSeed_id (length = 16) {
    const characters = "0123456789abcdef"
    let result = ""
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)]
    }
    return result
  }

  async rundb (e, ltuid, fp) {
    let uid = await MysInfo.getUid(e, false)
    db.run("BEGIN TRANSACTION")
    db.run("INSERT INTO MysUsers (ltuid, device_fp, createdAt, updatedAt) " +
    "VALUES (?, ?, datetime('now'), datetime('now')) " +
    "ON CONFLICT(ltuid) DO UPDATE SET device_fp = EXCLUDED.device_fp, updatedAt = datetime('now')", [ltuid, fp], (err) => {
      if (err) {
        logger.error("写入数据时出错", err.message)
        db.run("ROLLBACK") /** 回滚事务 */
      } else {
        e.reply(`UID:${uid}绑定成功`)
        db.run("COMMIT") /** 提交事务 */
        return true
      }
    })
  }

  async getdb (ltuid) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM MysUsers WHERE ltuid = ?", ltuid, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row ? row.device_fp : null)
        }
      })
    })
  }
}

function init () {
  db.all("PRAGMA table_info(MysUsers)", (err, fields) => {
    if (err) {
      logger.error("查询表字段时出错", err.message)
      return
    }
    /** 检查是否存在 'device_fp' 字段 */
    const fieldExists = fields.some(field => field.name === "device_fp")
    if (!fieldExists) {
      /** 添加新字段 */
      db.run("ALTER TABLE MysUsers ADD COLUMN device_fp VARCHAR(255)", (err) => {
        if (err) {
          logger.error("添加字段时出错", err.message)
        } else {
          logger.info("'device_fp' 字段添加成功")
        }
      })
    }
  })
}
