import _ from "lodash"
import md5 from "md5"
import fs from "node:fs"
import YAML from "yaml"
import { MysInfo, Button } from "#index"
import querystring from "node:querystring"
import GachaLog from "../../../model/gachaLog/gachaLog.js"

export class UpdateGacha extends plugin {
  constructor () {
    super({
      name: "[Genshin/updateLog.js]更新记录",
      event: "message",
      priority: -Infinity
    })
  }

  getServer (uid) {
    switch (String(uid)[0]) {
      case "1":
      case "2":
      case "3":
        return "cn_gf01" /** 官服 */
      case "5":
        return "cn_qd01" /** B服 */
    }
    return "cn_gf01"
  }

  async accept (e) {
    if (!e.msg) return
    if (!/(^#*(更新|刷新|获取)(抽卡|祈愿)(记录)?(链接)?$)/.test(e.msg)) return
    let logUrl = await this.updateGachaLog()
    if (this.e.msg.includes("获取")) {
      this.reply(logUrl)
      return true
    }
    if (logUrl) {
      e.msg = logUrl
      e.isUpdateCommand = true
      let data = await new GachaLog(e).logUrl()
      if (!data) return
      this.reply([await this.renderImg("genshin", "Mys/html/gacha/gacha-all-log", data, { retType: "base64" }), new Button(e).gcLog()])
      return true
    }
  }

  async updateGachaLog () {
    let url = "https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog?"
    let authkey = await this.getAuthKey()
    if (!authkey) return
    return url + querystring.stringify({
      win_mode: "fullscreen",
      authkey_ver: "1",
      sign_type: "2",
      auth_appid: "webview_gacha",
      init_type: "301",
      gacha_id: "e26ce9efdc5b0b3193edf2aa4736c04983a37a4d",
      timestamp: Math.floor(Date.now() / 1000), /** 当前时间搓 */
      lang: "zh-cn",
      device_type: "mobile",
      game_version: "CNRELAndroid3.1.0_R10676272_S10805493_D10772333",
      plat_type: "android",
      region: this.getServer(this.uid),
      authkey,
      game_biz: "hk4e_cn",
      gacha_type: "301",
      page: 1,
      size: 5,
      end_id: 0
    })
  }

  async getAuthKey () {
    let authkey = ""
    let headers = {
      Cookie: await this.getCookie(),
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
      let res = await MysInfo.get(this.e, "AuthKey", { headers })
      if (res.retcode !== 0) {
        logger.error(res)
        return
      }
      authkey = res.data.authkey
    }
    this.uid = await MysInfo.getSelfUid(this.e)
    if (!authkey && this.uid && this.e.noTips !== true) {
      await this.e.reply([`UID:${this.uid}请【#扫码登录】绑定Stoken`, new Button(this.e).bingStoken()])
    }
    this.e.noTips = true
    return authkey
  }

  async getCookie () {
    try {
      this.uid = await MysInfo.getSelfUid(this.e)
      let data = YAML.parse(fs.readFileSync(`./plugins/xiaoyao-cvs-plugin/data/yaml/${this.e.user_id}.yaml`, "utf8"))
      let { stoken, stuid, mid = "" } = data[this.uid]
      this.ltuid = stuid
      return `stoken=${stoken}; stuid=${stuid}; mid=${mid}`
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
}