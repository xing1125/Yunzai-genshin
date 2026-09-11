// import _ from "lodash"
// import md5 from "md5"
// import fs from "node:fs"
// import YAML from "yaml"
// import { MysInfo, Button } from "#index"
// import querystring from "node:querystring"
// import GachaLog from "../../../model/gachaLog/gachaLog.js"

// export class UpdateZZZGacha extends plugin {
//   constructor () {
//     super({
//       name: "[ZZZero/updateLog.js]绝区零更新记录",
//       event: "message",
//       priority: -Infinity
//     })
//   }

//   getServer (uid) {
//     switch (String(uid)[0]) {
//       case "1":
//       case "2":
//       case "3":
//         return "prod_gf_cn" /** 官服 */
//       case "5":
//         return "prod_qd_cn" /** B服 */
//     }
//     return "prod_gf_cn"
//   }

//   async accept (e) {
//     if (!e.msg) return
//     if (!/(^#*(绝区零)(更新|刷新|获取)(抽卡|祈愿)(记录)?(链接)?$)/.test(e.msg)) return
//     let logUrl = await this.updateGachaLog()
//     if (this.e.msg.includes("获取")) {
//       this.reply(logUrl)
//       return true
//     }
//     if (logUrl) {
//       // 直接调用 GachaLog 的 logUrl 方法处理抽卡记录
//       e.msg = logUrl
//       e.isUpdateCommand = true // 标记为更新命令，避免显示提示消息
//       e.isZzz = true // 标记为绝区零
//       let data = await new GachaLog(e).logUrl()
//       if (!data) return
//       this.reply([await this.renderImg("genshin", "Mys/html/gacha/gacha-all-log", data, { retType: "base64" }), new Button(e).gcLog()])
//       return true
//     }
//   }

//   async updateGachaLog () {
//     let url = "https://public-operation-nap.mihoyo.com/common/gacha_record/api/getGachaLog?"
//     let authkey = await this.getAuthKey()
//     if (!authkey) return
//     return url + querystring.stringify({
//       authkey_ver: "1",
//       sign_type: "100",
//       gacha_type: "1001",
//       authkey,
//       lang: "zh-cn",
//       region: this.getServer(this.uid),
//       game_biz: "nap_cn"
//     })
//   }

//   async getAuthKey () {
//     let authkey = ""
//     let headers = {
//       Cookie: await this.getCookie(),
//       DS: this.Ds,
//       Referer: "https://webstatic.mihoyo.com",
//       Origin: "https://webstatic.mihoyo.com",
//       "x-rpc-app_version": "2.63.1",
//       "x-rpc-client_type": 5,
//       "x-rpc-device_id": this.uuid,
//       "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 miHoYoBBS/2.63.1",
//       "X-Requested-With": "com.mihoyo.hyperion",
//       "x-rpc-platform": "ios",
//       "x-rpc-device_model": this.uuid,
//       "x-rpc-device_name": this.uuid,
//       "x-rpc-channel": "miyousheluodi",
//       "x-rpc-sys_version": "13"
//     }

//     if (headers.Cookie) {
//       let res = await MysInfo.get(this.e, "AuthKey", { headers })
//       if (res.retcode !== 0) {
//         logger.error(res)
//         return
//       }
//       authkey = res.data.authkey
//     }
//     this.uid = await MysInfo.getSelfUid(this.e)
//     if (!authkey) {
//       await this.e.reply([`UID:${this.uid}请【#扫码登录】绑定Stoken`, new Button(this.e).bingStoken()])
//     }
//     return authkey
//   }

//   async getCookie () {
//     try {
//       this.uid = await MysInfo.getSelfUid(this.e)
//       let data = YAML.parse(fs.readFileSync(`./plugins/xiaoyao-cvs-plugin/data/yaml/${this.e.user_id}.yaml`, "utf8"))
//       let { stoken, stuid, mid = "" } = data[this.uid]
//       this.ltuid = stuid
//       return `stoken=${stoken}; stuid=${stuid}; mid=${mid}`
//     } catch (err) {
//       logger.error(err)
//       return ""
//     }
//   }

//   get Ds () {
//     /** @Womsxd */
//     const n = "9ttJY72HxbjwWRNHJvn0n2AYue47nYsK"
//     const t = Math.round(new Date().getTime() / 1000)
//     const r = _.sampleSize("abcdefghijklmnopqrstuvwxyz0107607077", 6).join("")
//     const DS = md5(`salt=${n}&t=${t}&r=${r}`)
//     return `${t},${r},${DS}`
//   }

//   get uuid () {
//     function S4 () {
//       return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
//     }
//     return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4())
//   }
// }
