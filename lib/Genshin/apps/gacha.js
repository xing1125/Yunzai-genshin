import _ from "lodash"
import { Button, MysInfo, gsCfg } from "#index"
import GachaData from "../model/gachaData.js"

let tmp = {}
const elem = {
  弓: "bow",
  法器: "catalyst",
  大剑: "claymore",
  枪: "polearm",
  单手剑: "sword"
}

export class gacha extends plugin {
  constructor () {
    super({
      name: "[Genshin/gacha.js]模拟抽卡",
      dsc: "模拟抽卡",
      event: "message",
      priority: 100,
      rule: [
        { reg: "^#(原神|模拟)?抽卡 ?[012345]?$", fnc: "gacha" },
        { reg: "^#?(十|二十|三十|四十|五十|六十|七十|八十|九十|百|10|20|30|40|50|60|70|80|90|100)连 ?[012345]?$", fnc: "gacha" },
        { reg: "(^#*定轨|^#定轨(.*))$", fnc: "weaponBing" }
      ]
    })
  }

  /** #模拟抽卡 */
  async gacha () {
    if (!gsCfg.getConfig("config", "admin").gsGacha) return false
    let uid = await MysInfo.getUid(this.e)
    let uidMsg = ""
    if (!uid) {
      uid = "100000000"
      uidMsg = "尚未绑定uid，默认使用100000000生成图片\n"
    }

    this.e.uid = uid
    let isSend = false
    if (tmp[this.e.user_id]) return
    let miaoPath = `${process.cwd().replace(/\\/g, "/")}/plugins/miao-plugin/resources/meta-gs/`
    let msg = []
    let num = 5
    if (/百|100/.test(this.e.msg)) {
      num = 10
    } else if (/九十|90/.test(this.e.msg)) {
      num = 9
    } else if (/八十|80/.test(this.e.msg)) {
      num = 8
    } else if (/七十|70/.test(this.e.msg)) {
      num = 7
    } else if (/六十|60/.test(this.e.msg)) {
      num = 6
    } else if (/五十|50/.test(this.e.msg)) {
      num = 5
    } else if (/四十|40/.test(this.e.msg)) {
      num = 4
    } else if (/三十|30/.test(this.e.msg)) {
      num = 3
    } else if (/二十|20/.test(this.e.msg)) {
      num = 2
    } else if (/十|10/.test(this.e.msg)) {
      num = 1
    }

    const ALL = []
    for (let i = 0; i < num; i++) {
      this.GachaData = await GachaData.init(this.e)
      if (this.checkLimit()) break
      if (!tmp[this.e.user_id]) {
        tmp[this.e.user_id] = true
      }
      if (!isSend) {
        isSend = true
      }
      const data = await this.GachaData.run()
      ALL.push(data)
      for (let v of data.list) {
        if (v.star == 5) {
          v.elem = elem[v.element] || v.elem
          ALL.push({ ...data, ...v, miaoPath, uid, useGacha2: true })
        }
      }
    }

    let NowPool = this.GachaData.NowPool
    msg.push(this.getMsg())
    msg.push(`\n【#模拟抽卡0】武器池\n【#模拟抽卡1】【${NowPool.up5.toString()}】\n【#模拟抽卡2】【${NowPool.up5_2.toString()}】\n【#模拟抽卡3】【${NowPool.up5_3.toString()}】\n【#模拟抽卡4】【${NowPool.up5_4.toString()}】\n【#模拟抽卡5】【${NowPool.weapon5.toString()}】`)
    const replyMsg = uid === "100000000" ? `${uidMsg}模拟抽卡中，请稍等...\n` : `UID:${uid}${uidMsg}模拟抽卡中，请稍等...\n`
    this.e.reply(replyMsg + msg, false, { recallMsg: 5 })
    delete tmp[this.e.user_id]
    this.reply([await this.renderImg("genshin", "Genshin/html/gacha/gacha", { ...ALL[0], gachaData: ALL, miaoPath, uid }, { retType: "base64" }), new Button(this.e).gacha(NowPool)])
  }

  /** 检查限制 */
  checkLimit () {
    /** 主人不限制 */
    if (this.e.isMaster) return false
    let { user } = this.GachaData
    let { num, weaponNum } = user.today
    let nowCount = num
    if (this.GachaData.type == "weapon") nowCount = weaponNum
    if (this.GachaData.set.LimitSeparate == 1) {
      if (nowCount < this.GachaData.set.count * 10) return false
    } else {
      if (num + weaponNum < this.GachaData.set.count * 10) return false
    }
    return true
  }

  getMsg () {
    let { user } = this.GachaData
    let { num, weaponNum } = user.today
    let nowCount = num
    if (this.GachaData.type == "weapon") nowCount = weaponNum
    let msg = ""
    if (user.today.star.length > 0) {
      msg += "今日五星："
      if (user.today.star.length >= 4) {
        msg += `${user.today.star.length}个`
      } else {
        user.today.star.forEach(v => {
          msg += `${v.name}(${v.num})\n`
        })
        msg = _.trim(msg, "\n")
      }
      if (user.week.num >= 2) {
        msg += `\n本周：${user.week.num}个五星`
      }
    } else {
      msg += `今日已抽，累计${nowCount}抽无五星`
    }
    return msg
  }

  /** #定轨 */
  async weaponBing () {
    if (!gsCfg.getConfig("config", "admin").gsGacha) return false
    let Gacha = await GachaData.init(this.e)
    let { NowPool, user, msg = "" } = Gacha
    if (user.weapon.type >= 2) {
      user.weapon.type = 0
      user.weapon.bingWeapon = ""
      msg = "\n定轨已取消"
    } else {
      user.weapon.type++
      user.weapon.bingWeapon = NowPool.weapon5[user.weapon.type - 1]
      msg = []
      NowPool.weapon5.forEach((v, i) => {
        if (user.weapon.type - 1 == i) {
          msg.push(`[√] ${NowPool.weapon5[i]}`)
        } else {
          msg.push(`[  ] ${NowPool.weapon5[i]}`)
        }
      })
      msg = "定轨成功\n" + msg.join("\n")
    }
    /** 命定值清零 */
    user.weapon.lifeNum = 0
    Gacha.user = user
    Gacha.saveUser()

    this.reply(msg, false, { at: this.e.user_id })
  }
}