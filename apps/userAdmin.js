import _ from "lodash"
import fs from "node:fs"
import fetch from "node-fetch"
import User from "../model/user.js"
import { MysInfo, Button, common } from "#index"

export class user extends plugin {
  constructor () {
    super({
      name: "[genshin/userAdmin.js]用户管理",
      dsc: "CK用户管理",
      event: "message",
      priority: 300,
      rule: [
        { reg: "^#用户统计$", fnc: "userAdmin" },
        { reg: /^#使用(全部|用户)c(oo)?k(ie)?$/i, fnc: "setUserCk" },
        { reg: "^#(清理|删除)(无效|失效|无用)(用户|ck|Ck|CK|记录)$", fnc: "cleanupUsers" }
      ]
    })
  }

  /** 清理无效用户和无用记录 */
  async cleanupUsers () {
    if (!this.e.isMaster) return false
    try {
      let count = await MysInfo.delDisable()
      const u = new User(this.e)
      const total = await u.countUsers()
      await this.reply(`扫描到 ${total} 条用户记录，清理中，请勿重启/关闭机器人...`)
      const ret = await u.cleanupUsersTable()
      await MysInfo.initCache(true)
      this.reply([
        "清理完成：\n" +
        `无效CK用户：已删除${count}个\n` +
        `无用用户记录：扫描${ret.scanned}条，删除${ret.deleted}条\n` +
        "已自动刷新用户缓存",
        new Button(this.e).mysUserAdmin()
      ])
    } catch (err) {
      try { console.error(err) } catch (_) {}
      this.reply("清理失败，请查看控制台")
    }
  }

  /** #用户统计$ */
  async userAdmin () {
    if (!this.e.isMaster) return false
    let data = await new User(this.e).userAdmin()
    if (!data) return true

    /** 生成图片 */
    this.reply([await this.renderImg("genshin", "Mys/html/admin/userAdmin", data, { retType: "base64" }), new Button(this.e).mysUserAdmin()])
  }

  /** #刷新用户缓存 / #重置用户缓存 */
  async resetCache () {
  /** 清空老数据 */
    if (!this.e.isMaster) return false
    const clearData = /重置/.test(this.e.msg)
    await MysInfo.initCache(true, clearData)
    this.reply([`用户缓存已${clearData ? "重置" : "刷新"}...\n通过【#用户统计】命令可查看详情`, new Button(this.e).mysUserAdmin()])
  }

  /** 检查ck是否可用 */
  async checkCk () {
    let url = "https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn"
    let res = await fetch(url, { method: "get", headers: { Cookie: this.ck } })
    if (!res.ok) return false
    res = await res.json()
    if (res.retcode != 0) {
      this.checkMsg = res.message
      return false
    }

    return true
  }

  /** 获取米游社通行证id */
  async getUserInfo (server = "mys") {
    try {
      const that = this
      let url = {
        mys: "https://bbs-api.mihoyo.com/user/wapi/getUserFullInfo?gids=2",
        hoyolab: ""
      }
      let res = await fetch(url[server], {
        method: "get",
        headers: {
          Cookie: that.ck,
          Accept: "application/json, text/plain, */*",
          Connection: "keep-alive",
          Host: "bbs-api.mihoyo.com",
          Origin: "https://m.bbs.mihoyo.com",
          Referer: " https://m.bbs.mihoyo.com/"
        }
      })
      if (!res.ok) return res
      res = await res.json()
      return res
    } catch (e) {
      return null
    }
  }

  async setUserCk () {
    let set = "./plugins/genshin/config/config/mys.set.yaml"
    if (!this.e.isMaster) return false
    let config = fs.readFileSync(set, "utf8")
    config = config.replace(/allowUseCookie: [0-1]/g, "allowUseCookie: 1")
    fs.writeFileSync(set, config, "utf8")
    await common.sleep(500)
    await MysInfo.initCache(true)
    await this.reply("开启成功，用户ck已加入公共查询ck池")
  }
}