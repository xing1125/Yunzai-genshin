import _ from "lodash"
import md5 from "md5"
import ApiTool from "./apiTool.js"
import cfg from "../../../../lib/config/config.js"

let HttpsProxyAgent = ""
const k2 = "S9Hrn38d2b55PamfIR9BNA3Tx9sQTOem"
const lk2 = "sjdNFJB7XxyDWGIAk0eTV8AOCfMJmyEo"
const x4 = "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs"
const x6 = "t0qEgfub6cvueAPgR5m9aQWWVciEer7v"
export default class MysApi {
  /**
   * @param uid 游戏uid
   * @param cookie 米游社cookie
   * @param option 其他参数
   * @param option.log 是否显示日志
   * @param isSr 是否星铁
   * @param device 设备device_id
   */
  constructor (uid, cookie, option = {}, isSr = false, device = "", Server = "") {
    this.uid = uid
    this.cookie = cookie
    this.ltuid = this.extractLtuid(cookie)
    this.isSr = isSr
    this.game = isSr ? "sr" : "gs"
    if (typeof isSr !== "boolean") {
      this.game = isSr
    }
    this.device_id = device || this.getDeviceGuid()
    this.server = Server || this.getServer()
    this.apiTool = new ApiTool(uid, this.server, this.game, undefined, this.ltuid)
    /** 5分钟缓存 */
    this.cacheCd = 300

    this._device = device
    this.option = {
      log: true,
      ...option
    }
    this.list = ["User", "GetActionTicket", "ChangeGameRole"]
  }

  extractLtuid (cookie = "") {
    if (!cookie) return ""
    const reg = /(ltuid|ltuid_v2|account_id|account_id_v2|login_uid|ltmid_v2)=([1-9]\d*)/
    const match = reg.exec(cookie)
    return match ? match[2] : ""
  }

  get device () {
    if (!this._device) this._device = `${md5(this.uid).substring(0, 5)}`
    return this._device
  }

  getUrl (type, data = {}) {
    let urlMap = this.apiTool.getUrlMap({ ...data, deviceId: this.device })
    if (!urlMap[type]) return false

    let { url, query = "", body = "", types = "" } = urlMap[type]

    if (query) url += `?${query}`
    if (body && typeof body === "object") body = JSON.stringify(body)

    this.forumid = data.forumid || ""
    let headers = this.getHeaders(types, query, body)

    return { url, headers, body, types }
  }

  getServer () {
    const _uid = String(this.uid)
    const isSr = this.game == "sr"
    const isZzz = this.game == "zzz"
    if (isZzz) {
      switch (_uid.slice(0, -8)) {
        case "10":
          return "prod_gf_us"// 美服
        case "15":
          return "prod_gf_eu"// 欧服
        case "13":
          return "prod_gf_jp"// 亚服
        case "17":
          return "prod_gf_sg"// 港澳台服
      }
    } else {
      switch (_uid.slice(0, -8)) {
        case "5":
          return isSr ? "prod_qd_cn" : "cn_qd01"// B服
        case "6":
          return isSr ? "prod_official_usa" : "os_usa"// 美服
        case "7":
          return isSr ? "prod_official_euro" : "os_euro"// 欧服
        case "8":
        case "18":
          return isSr ? "prod_official_asia" : "os_asia"// 亚服
        case "9":
          return isSr ? "prod_official_cht" : "os_cht"// 港澳台服
      }
    }
    return (isZzz || isSr) ? "prod_gf_cn" : "cn_gf01"// 官服
  }

  async getData (type, data = {}, cached = false) {
    if (!this.list.includes(type) && ["gs", "sr", "bh3", "zzz"].includes(this.game)) {
      const fp = await redis.get(`devicefp:${this.game}:${this.uid}`)
      if (fp) {
        const _fp = JSON.parse(fp)
        if (_.isObject(_fp)) this._device_fp = _fp
        else redis.del(`devicefp:${this.game}:${this.uid}`)
      }

      if (!this._device_fp && !data?.Getfp) {
        this._device_fp = await this.getData("getFp", {
          seed_id: this.getSeed_id(),
          Getfp: true
        })
      }
    }
    if (type === "getFp" && !data?.Getfp) return this._device_fp

    let { url, headers, body, types } = this.getUrl(type, data)

    if (!url) return false

    let cacheKey = this.cacheKey(type, data)
    let cahce = await redis.get(cacheKey)
    if (cahce) return { ...JSON.parse(cahce), isCahced_Data: true }

    headers.Cookie = this.cookie

    if (data.headers) {
      headers = { ...headers, ...data.headers }
    }

    if (types !== "noheader" && ![...this.list, "getFp"].includes(type) && !headers["x-rpc-device_fp"]) { if (this._device_fp?.data?.device_fp) headers["x-rpc-device_fp"] = this._device_fp.data?.device_fp }

    let param = {
      headers,
      agent: await this.getAgent(),
      timeout: 10000
    }
    if (body) {
      param.method = "post"
      param.body = body
    } else {
      param.method = "get"
    }
    if (data.method) param.method = data.method
    let response = {}
    let start = Date.now()
    try {
      response = await fetch(url, param)
    } catch (error) {
      logger.error(error.toString())
      return false
    }

    if (!response.ok) {
      logger.error(`[米游社接口][${type}][${this.uid}] ${response.status} ${response.statusText}`)
      return false
    }
    if (this.option.log) {
      logger.mark(`[米游社接口][${type}][${this.uid}] ${Date.now() - start}ms`)
    }
    const res = await response.json()

    if (!res) {
      logger.mark("mys接口没有返回")
      return false
    }

    res.api = type

    if (cached || data?.cached) this.cache(res, cacheKey)

    return res
  }

  getHeaders (types, query = "", body = "") {
    let header = {
      "x-rpc-app_version": "2.70.1",
      "x-rpc-client_type": "5",
      "x-rpc-device_id": this.device_id.toUpperCase(),
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; J9110 Build/55.2.A.4.332; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 miHoYoBBS/2.70.1",
      Referer: "https://webstatic.mihoyo.com/"
    }
    if (["gs", "sr", "bh3", "zzz"].includes(this.game) && /os_|official|_us|_eu|_jp|_sg/.test(this.server)) {
      header = {
        "x-rpc-app_version": "2.57.1",
        "x-rpc-client_type": "2",
        "x-rpc-device_id": this.device_id.toUpperCase(),
        "User-Agent": "Mozilla/5.0 (Linux; Android 11; J9110 Build/55.2.A.4.332; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 miHoYoBBSOversea/2.57.1",
        Referer: "https://act.hoyolab.com/"
      }
    }

    const header1 = {
      "x-rpc-app_version": "2.70.1",
      "x-rpc-device_model": "J9110",
      "x-rpc-device_name": "Sony J9110",
      "x-rpc-channel": "miyousheluodi",
      "x-rpc-client_type": "2",
      Referer: "https://app.mihoyo.com",
      "x-rpc-sys_version": "11",
      "User-Agent": "okhttp/4.9.3",
      "x-rpc-device_id": this.device_id.toUpperCase()
    }

    const x_rpc = {
      "x-rpc-device_model": "J9110",
      "x-rpc-device_name": "Sony J9110",
      "x-rpc-sys_version": "11",
      "x-rpc-signgame": "zzz",
      "x-rpc-platform": "android"
    }

    switch (types) {
      case "role":
        return {
          ...header,
          "X-Requested-With": "com.mihoyo.hyperion",
          "Sec-Fetch-Site": "same-site",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
          Cookie: this.cookie,
          Referer: "https://user.mihoyo.com/"
        }
      case "widget":
        return {
          ...header1,
          Cookie: this.cookie,
          DS: this.game === "sr" ? this.getDs(query, body, true, x6) : this.SignDs(k2)
        }
      case "DS":
        return {
          ...header,
          Cookie: this.cookie,
          DS: this.getDs()
        }
      case "signDS":
        return {
          ...header,
          ...x_rpc,
          ...(/cn_|_cn/.test(this.server) ? {
            "X-Requested-With": "com.mihoyo.hyperion",
            "x-rpc-channel": "miyousheluodi"
          } : {
            "X-Requested-With": "com.mihoyo.hoyolab",
            "x-rpc-channel": "google"
          }),
          Cookie: this.cookie,
          DS: this.SignDs("jEpJb9rRARU2rXDA9qYbZ3selxkuct9a")
        }
      case "noheader":
        return {}
    }
    return {
      ...header,
      Cookie: this.cookie,
      DS: this.getDs(query, body, true)
    }
  }

  getDs (q = "", b = "", bq = false, salt = x4) {
    let r = ""
    if (["gs", "sr", "bh3", "zzz"].includes(this.game) && /os_|official|_us|_eu|_jp|_sg/.test(this.server)) {
      salt = "okr4obncj8bw5a65hbnn5oo6ixjc3l9w"
      r = this.getGuid(6)
    } else {
      r = _.random(100001, 200000)
    }
    let t = Math.floor(Date.now() / 1000)

    let DS = `salt=${salt}&t=${t}&r=${r}`
    if (bq || q || b) DS += `&b=${b}&q=${q}`
    return `${t},${r},${md5(DS)}`
  }

  SignDs (salt = lk2) {
    const t = Math.floor(Date.now() / 1000)
    let r = this.getGuid(6)
    const DS = md5(`salt=${salt}&t=${t}&r=${r}`)
    return `${t},${r},${DS}`
  }

  getGuid (length = 32) {
    let r = ""
    for (let i = 0; i < length; i++) { r += _.sample("abcdefghijklmnopqrstuvwxyz0123456789") }

    return r
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
    for (let i = 0; i < length; i++) { result += characters[Math.floor(Math.random() * characters.length)] }

    return result
  }

  cacheKey (type, data) {
    return "Yz:genshin:mys:cache:" + md5(this.uid + type + JSON.stringify(data))
  }

  async cache (res, cacheKey) {
    if (!res || res.retcode !== 0) return
    redis.setEx(cacheKey, this.cacheCd, JSON.stringify(res))
  }

  async getAgent () {
    let proxyAddress = cfg.bot.proxyAddress
    if (!proxyAddress) return null
    if (proxyAddress === "http://0.0.0.0:0") return null

    if (!/os_|official|_us|_eu|_jp|_sg/.test(this.server)) return null

    if (HttpsProxyAgent === "") {
      HttpsProxyAgent = await import("https-proxy-agent").catch((err) => {
        logger.error(err)
      })

      HttpsProxyAgent = HttpsProxyAgent ? HttpsProxyAgent.HttpsProxyAgent : undefined
    }

    if (HttpsProxyAgent) {
      return new HttpsProxyAgent(proxyAddress)
    }

    return null
  }
}

export function randomRange () {
  let randomStr = ""
  let charStr = "abcdef0123456789"
  for (let i = 0; i < 64; i++) {
    let index = Math.round(Math.random() * (charStr.length - 1))
    randomStr += charStr.substring(index, index + 1)
  }
  return randomStr
}