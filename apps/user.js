import { Button } from "#index"
import User from "../model/user.js"
import UserList from "../model/other/userList.js"

export class user extends plugin {
  constructor (e) {
    super({
      name: "[genshin/user.js]用户绑定",
      dsc: "米游社ck绑定，游戏uid绑定",
      event: "message",
      priority: 300,
      rule: [
        { reg: /^#绑定c(oo)?k(ie)?$/i, fnc: "bingCk" },
        { reg: "(.*)_MHYUUID(.*)", event: "message.private", fnc: "noLogin" },
        { reg: /^#?(原神|星铁|绝区零|未定|崩三|崩二)?我的c(oo)?k(ie)?$/i, event: "message", fnc: "myCk" },
        { reg: /^#?(原神|星铁|绝区零|未定|崩三|崩二)?删除c(oo)?k(ie)?$/i, fnc: "delCk" },
        { reg: /^#?(原神|星铁|绝区零|未定|崩三|崩二)?(删除|解绑)uid(\s|\+)*([0-9]{1,2}|[1-9][0-9]{5,9})?$/i, fnc: "delUid" },
        { reg: /^#(原神|星铁|绝区零|未定|崩三|崩二)?绑定(uid)?(\s|\+)*(([1-9][0-9]|[1-9])[0-9]{8}|[1-9][0-9]{5,7})$/i, fnc: "bingUid" },
        { reg: /^#(原神|星铁|绝区零|未定|崩三|崩二)?(我的)?(uid)[0-9]{0,2}$/i, fnc: "showUid" },
        { reg: "^#\\s*(检查|我的)*[Cc](oo)?[Kk](ie)?(状态)*$", fnc: "checkCkStatus" },
        { reg: "^#(接受)?绑定(主|子)?(用户|账户|账号)(\\[\\w+\\]){0,2}$", fnc: "bindNoteUser" },
        { reg: "^#(删除绑定|取消绑定|解除绑定|解绑|删除|取消)(主|子)(用户|账户|账号)$", fnc: "bindNoteUser" },
        { reg: "^#账号列表$", fnc: "userList" }
      ]
    })
    this.User = new User(e)
  }

  /** 加载旧的绑定ck json */
  async init () {
    await this.loadOldData()
  }

  /** 接受到消息都会执行一次 */
  accept () {
    if (!this.e.msg) return
    /** 由于手机端米游社网页可能获取不到ltuid 可以尝试在通行证页面获取login_uid */
    if (/(ltoken|ltoken_v2)/.test(this.e.msg) && /(ltuid|login_uid|ltmid_v2)/.test(this.e.msg)) {
      if (this.e.isGroup) {
        this.reply("请私聊发送Cookie", false, { at: true })
        return true
      }
      this.e.ck = this.e.msg
      this.e.msg = "#绑定Cookie"
      return true
    }

    if (/^#?(原神)?绑定uid$/i.test(this.e.msg)) {
      this.setContext("saveUid")
      this.reply(["请发送绑定的原神uid", segment.button([
        { text: "🟡发送", input: "　" }
      ])], false, { at: true })
      return true
    }

    if (/^#?星铁绑定uid$/i.test(this.e.msg)) {
      this.setContext("saveSrUid")
      this.reply(["请发送绑定的星铁uid", segment.button([
        { text: "🔴发送", input: "　" }
      ])], false, { at: true })
      return true
    }

    if (/^#?绝区零绑定uid$/i.test(this.e.msg)) {
      this.setContext("saveZzzUid")
      this.reply(["请发送绑定的绝区零uid", segment.button([
        { text: "🟠发送", input: "　" }
      ])], false, { at: true })
      return true
    }

    if (/^#?未定绑定uid$/i.test(this.e.msg)) {
      this.setContext("saveWdUid")
      this.reply(["请发送绑定的未定uid", segment.button([
        { text: "🔵发送", input: "　" }
      ])], false, { at: true })
      return true
    }

    if (/^#?崩三绑定uid$/i.test(this.e.msg)) {
      this.setContext("saveBh3Uid")
      this.reply(["请发送绑定的崩三uid", segment.button([
        { text: "💧发送", input: "　" }
      ])], false, { at: true })
      return true
    }

    if (/^#?崩二绑定uid$/i.test(this.e.msg)) {
      this.setContext("saveBh2Uid")
      this.reply(["请发送绑定的崩二uid", segment.button([
        { text: "💠发送", input: "　" }
      ])], false, { at: true })
      return true
    }
  }

  /** 绑定uid */
  saveUid () {
    if (!this.e.msg) return
    let uid = this.e.msg.match(/(18|[1-9])[0-9]{8}/g)
    if (!uid) {
      this.reply("原神UID输入错误", false, { at: true })
      return
    }
    this.e.msg = "#绑定" + this.e.msg
    this.bingUid()
    this.finish("saveUid")
  }

  /** 绑定星铁uid */
  saveSrUid () {
    if (!this.e.msg) return
    let uid = this.e.msg.match(/(18|[1-9])[0-9]{8}/g)
    if (!uid) {
      this.reply("星铁UID输入错误", false, { at: true })
      return
    }
    this.e.msg = "#星铁绑定" + this.e.msg
    this.e.isSr = true
    this.e.game = "sr"
    this.bingUid()
    this.finish("saveSrUid")
  }

  /** 绑定绝区零uid */
  saveZzzUid () {
    if (!this.e.msg) return
    let uid = this.e.msg.match(/(1[0-9]|[1-9])[0-9]{8}|[1-9][0-9]{7}/g)
    if (!uid) {
      this.reply("绝区零UID输入错误", false, { at: true })
      return
    }
    this.e.msg = "#绝区零绑定" + this.e.msg
    this.e.isSr = false
    this.e.game = "zzz"
    this.bingUid()
    this.finish("saveZzzUid")
  }

  /** 绑定未定uid */
  saveWdUid () {
    if (!this.e.msg) return
    let uid = this.e.msg.match(/[1-9][0-9]{7,8}/g)
    if (!uid) {
      this.reply("未定UID输入错误", false, { at: true })
      return
    }
    this.e.msg = "#未定绑定" + this.e.msg
    this.e.isSr = false
    this.e.game = "wd"
    this.bingUid()
    this.finish("saveWdUid")
  }

  /** 绑定崩三uid */
  saveBh3Uid () {
    if (!this.e.msg) return
    let uid = this.e.msg.match(/[1-9][0-9]{7,9}/g)
    if (!uid) {
      this.reply("崩三UID输入错误", false, { at: true })
      return
    }
    this.e.msg = "#崩三绑定" + this.e.msg
    this.e.isSr = false
    this.e.game = "bh3"
    this.bingUid()
    this.finish("saveBh3Uid")
  }

  /** 绑定崩二uid */
  saveBh2Uid () {
    if (!this.e.msg) return
    let uid = this.e.msg.match(/[1-9][0-9]{5,7}/g)
    if (!uid) {
      this.reply("崩二UID输入错误", false, { at: true })
      return
    }
    this.e.msg = "#崩二绑定" + this.e.msg
    this.e.isSr = false
    this.e.game = "bh2"
    this.bingUid()
    this.finish("saveBh2Uid")
  }

  /** 未登录ck */
  async noLogin () {
    this.reply("绑定Cookie失败\n请先【登录米游社】或【登录通行证】再获取Cookie")
  }

  /** 删除ck */
  async delCk () {
    try {
      let msg = await this.User.delCk()
      await this.reply(msg)
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("操作失败，请稍后重试")
    }
  }

  /** 绑定uid */
  async bingUid () {
    if (/1000000[0-5]|10000000[0-5]/.test(this.e.msg)) {
      await this.e.reply("不支持绑定预设面板UID")
      return
    }
    try {
      await this.User.bingUid()
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("绑定失败，请稍后重试")
    }
  }

  /** #uid */
  async showUid () {
    try {
      let index = this.e.msg.match(/[0-9]{1,2}/g)
      if (index && index[0]) {
        await this.User.toggleUid(index[0])
      } else {
        await this.User.showUid()
      }
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("获取失败，请稍后重试")
    }
  }

  /** 删除uid */
  async delUid () {
    try {
      let match = this.e.msg.match(/([0-9]{1,2}|[1-9][0-9]{5,9})$/g)
      if (!match) {
        this.e.reply(["删除uid请带上序号或uid\n例：#删除uid1 或 #删除uid100000000\n发送【#uid】可查看绑定的uid以及对应的序号", new Button(this.e).bingGameUid()])
        return
      }
      let input = match[0]
      let game = this.e
      if (input.length <= 2) {
        await this.User.delUid(input, game)
      } else {
        await this.User.delUidByUid(input, game)
      }
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("删除失败，请稍后重试")
    }
  }

  /** 账号列表 */
  async userList () {
    try {
      let data = await new UserList(this.e).getAchieve()
      if (!data) return
      this.reply(await this.renderImg("genshin", "Mys/html/userList/userList", data, { retType: "base64" }))
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("获取失败，请稍后重试")
    }
  }

  /** 绑定ck */
  async bingCk () {
    if (!this.e.ck) {
      await this.reply("请【私聊】发送米游社Cookie或 #扫码登录")
      return
    }
    try {
      await this.User.bing()
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("绑定失败，请稍后重试")
    }
  }

  /** 我的ck */
  async myCk () {
    try {
      if (this.e.isGroup) {
        await this.reply("请私聊查看")
        return
      }
      await this.User.myCk()
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("获取失败，请稍后重试")
    }
  }

  /** 加载旧的绑定ck json */
  async loadOldData () {
    try {
      await this.User.loadOldDataV2()
      await this.User.loadOldDataV3()
      await this.User.loadOldUid()
    } catch (err) {
      try { console.error(err) } catch (_) {}
    }
  }

  /** 检查用户CK状态 **/
  async checkCkStatus () {
    try {
      await this.User.checkCkStatus()
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("检查失败，请稍后重试")
    }
  }

  /** 绑定主用户 **/
  async bindNoteUser () {
    try {
      await this.User.bindNoteUser()
    } catch (err) {
      try { console.error(err) } catch (_) {}
      await this.reply("操作失败，请稍后重试")
    }
  }
}