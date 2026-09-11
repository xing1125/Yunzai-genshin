import os from "os"
import fs from "node:fs"
import moment from "moment"
import fetch from "node-fetch"
import { Data, gsCfg, Button, Weapon } from "#index"
import GachaLog from "../../../model/gachaLog/gachaLog.js"

const _path = process.cwd()
const NEWLINE = (os.platform() === "win32") ? "\r" : "\n"

export class ImportGcLog extends plugin {
  constructor () {
    super({
      name: "[Genshin/getgcLog.js]提瓦特小助手抽卡记录",
      dsc: "自动获取提瓦特小助手抽卡记录并保存",
      event: "message",
      priority: 10,
      rule: [
        { reg: "^#?(获取|更新|导入)(提瓦特)?小助手(抽卡|祈愿)?(记录|历史)( *|" + NEWLINE + "*)(https.*)?", fnc: "getGcLog" }
      ]
    })
    this.typeName = {
      301: "角色",
      302: "武器",
      500: "集录",
      200: "常驻"
    }
  }

  async getGcLog (e) {
    if (!e.user_id) {
      return
    }
    let authkey
    let urlRet = /https.*/
    let ret = urlRet.exec(this.e.msg)
    if (ret) {
      this.e.uid = await getUid(this.e)
      this.e.msg = ret[0]
      await this.logUrl(e)
      return true
    } else if (fs.existsSync(`${_path}/plugins/xiaoyao-cvs-plugin`)) {
      try {
        const User = (await import("../../../../xiaoyao-cvs-plugin/model/user.js")).default
        let user = new User(e)
        await user.cookie(e)
        authkey = await this.getAuthKey(e, user)
        if (!authkey) {
          return true
        }
      } catch (err) {
        logger.error(err)
      }
    } else {
      if (!this.e.uid) {
        this.e.uid = e?.runtime?.user?._regUid || await getUid(this.e)
      }
      let gacha = new GachaLog(e)
      gacha.uid = this.e.uid
      /** 获取authkey */
      authkey = await redis.get(`${gacha.urlKey}${gacha.uid}`)
      if (!authkey) {
        this.e.reply(`UID:${this.e.uid}请私聊发送抽卡记录链接`, false)
        this.setContext("logUrl")
        return true
      }
      /** 调一次接口判断是否有效 */
      let res = await gacha.logApi({ gacha_type: 301, authkey, region: gacha.getServer() })
      /** key过期，或者没有数据 */
      if (res.retcode !== 0 || !res?.data?.list || res.data.list.length <= 0) {
        logger.debug(`${this.e.logFnc} ${res.message || "error"}`)
        this.e.reply(`UID:${this.e.uid}请私聊发送抽卡记录链接`, false)
        this.setContext("logUrl")
        return true
      }
    }
    if (authkey) {
      if (!this.e.region) this.e.region = getServer(this.e.uid)
      this.e.authkey = authkey
      let msg = [
        "如果您在半年内未用过小助手",
        "请勿导入否则会导致记录错乱",
        "确认请回复【确认】",
        "抽卡记录错乱后可使用",
        "#设置全量更新抽卡记录开",
        "再#更新抽卡记录"
      ]
      this.e.reply([msg.join("\n"), segment.button([
        { text: "🟡确认", callback: "确认" }
      ])])
      this.setContext("confirm")
    }
  }

  confirm () {
    if (!this.e.msg || this.e.at || this.e.img || !/^#*确认$/.test(this.e.msg)) {
      this.finish("confirm")
      return this.reply("操作错误已取消")
    }
    this.e.reply("抽卡记录链接校验成功，\n开始获取小程序抽卡记录，请稍后......")
    let { confirm = {} } = this.getContext()
    this.finish("confirm")
    this.e.authkey = confirm.authkey
    this.e.uid = confirm.uid
    this._getGcLog(confirm)
  }

  async logUrl (e) {
    if (!this.e.uid) {
      this.e.uid = e?.runtime?.user?._regUid || await getUid(this.e)
    }
    let gacha = new GachaLog(e)
    gacha.uid = this.e.uid
    let url = this.e.msg
    let param = gacha.dealUrl(url)
    if (!param) {
      this.finish("logUrl")
      return
    }
    if (!await gacha.checkUrl(param)) {
      this.e.reply("链接错误")
      this.finish("logUrl")
      return
    }
    this.e.authkey = param.authkey
    this.e.region = param.region
    await this._getGcLog(e)
    this.finish("logUrl")
  }

  async _getGcLog (e) {
    if (!this.e.authkey) return true
    if (!this.e.uid) {
      this.e.uid = e?.runtime?.user?._regUid || await getUid(this.e)
    }
    logger.mark(this.e.uid)
    let gachaURL = encodeURIComponent(`https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog?authkey_ver=1&sign_type=2&auth_appid=webview_gacha&init_type=301&gacha_id=fecafa7b6560db5f3182222395d88aaa6aaac1bc&timestamp=${Math.floor(Date.now() / 1000)}&lang=zh-cn&device_type=mobile&plat_type=ios&region=${this.e.region}&authkey=${encodeURIComponent(this.e.authkey)}&game_biz=hk4e_cn&gacha_type=301&page=1&size=5&end_id=0`)
    let url = "https://www.lelaer.com/outputGacha.php"
    let body = `uid=${this.e.uid}&gachaurl=${gachaURL}&lang=zh-Hans`
    let param = {
      headers: {
        Host: "www.lelaer.com",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10000,
      method: "post",
      body
    }
    try {
      let response = await fetch(url, param)
      var json = await response.json()
    } catch (err) {
      e.reply(`UID:${this.e.uid}提瓦特小助手接口无法访问或返回错误`)
      logger.error(`UID:${this.e.uid}提瓦特小助手接口无法访问或返回错误`)
      logger.error(err)
      return
    }
    let list = json?.list
    if (!json || !list) {
      await this.e.reply(`UID:${this.e.uid}更新失败 ${json?.result}`, false, { at: true })
      logger.mark(json)
      return true
    }
    if (!list?.length || list?.length <= 0) {
      await this.e.reply(`UID:${this.e.uid}提瓦特小助手抽卡记录为空`, false, { at: true })
      return true
    }
    let data = await dealJson(list, e)
    if (!data) return true
    /** 保存json */
    let msg = `UID:${this.e.uid}\n更新小助手抽卡记录成功...\n抽卡记录混乱可使用#设置全量更新抽卡记录开，再#更新抽卡记录`
    let gachaLog = new GachaLog(this.e)
    gachaLog.uid = this.e.uid
    for (let type in data) {
      if (!this.typeName[type]) continue
      gachaLog.type = type
      let log = gachaLog.readJson()
      let finalJson = mergeJson(log.list, data[type])
      gachaLog.writeJson(finalJson)
      msg += `\n${this.typeName[type]}记录：${data[type].length}条，导入${finalJson.length - log.list.length}条，现共${finalJson.length}条`
    }
    await this.e.reply([msg, new Button(this.e).gcLog()], false, { at: true })
  }

  async getAuthKey (e, user) {
    if (!e.uid) {
      this.e.uid = e?.runtime?.user?._regUid || getUid(e)
    }
    this.e.region = getServer(this.e.uid)
    let authkeyrow = await user.getData("authKey", {})
    if (!authkeyrow?.data) {
      this.e.reply([`UID:${this.e.uid},authkey获取失败：` + (authkeyrow.message.includes("登录失效")) ? "发送【#扫码登录】绑定stoken" : authkeyrow.message, new Button(this.e).bingStoken()])
      return false
    }
    return authkeyrow.data.authkey
  }
}

function getServer (uid) {
  switch (String(uid)[0]) {
    case "1":
    case "2":
    case "3":
      return "cn_gf01" /** 官服 */
    case "5":
      return "cn_qd01" /** B服 */
    case "6":
      return "os_usa" /** 美服 */
    case "7":
      return "os_euro" /** 欧服 */
    case "8":
    case "18":
      return "os_asia" /** 亚服 */
    case "9":
      return "os_cht" /** 港澳台服 */
  }
  return "cn_gf01"
}

async function dealJson (list, e) {
  let data = {}
  let reqField = ["gacha_type", "item_type", "name", "time"]
  for (let v of reqField) {
    if (!list[0][v]) {
      e.reply(`json文件内容错误：缺少必要字段${v}`)
      return false
    }
  }
  if (moment(list[0].time).format("x") < moment(list[list.length - 1].time).format("x")) {
    list = list.reverse()
  }
  for (let val of list) {
    if (!data[val.uigf_gacha_type]) data[val.uigf_gacha_type] = []
    if (!val.rank_type) {
      if (val.item_type === "角色") {
        let roleId = gsCfg.roleNameToID(val.name)
        let fiveRoleList = gsCfg.getRole5()
        let fourRoleList = gsCfg.getRole5().includes(roleId) ? [] : [roleId]
        /** 判断是否是5星 */
        if (roleId) {
          roleId = Number(roleId)
          if (fiveRoleList.includes(roleId)) {
            val.rank_type = 5
          } else if (fourRoleList.includes(roleId)) {
            val.rank_type = 4
          } else {
            val.rank_type = 3
          }
        }
      } else if (val.item_type === "武器") {
        let weapon = await Weapon.get(val.name, "gs")
        const weapons = Data.getData(weapon, "id,name,star")
        if (weapons && weapons.star) {
          val.rank_type = weapons.star
        }
      }
    }
    data[val.uigf_gacha_type].push(val)
  }
  return data
}

function mergeJson (json, jsonNew) {
  function unique (arr) {
    const res = new Map()
    return arr.filter((a) => !res.has(a.id) && res.set(a.id, 1))
  }
  return unique(json.concat(jsonNew)).sort((a, b) => {
    return Number(b.id) - Number(a.id)
  })
}

async function getUid (e) {
  const uidKey = `Yz:genshin:mys:qq-uid:${e.userId}`
  const uid = await redis.get(uidKey)
  if (uid) {
    return uid
  }
}