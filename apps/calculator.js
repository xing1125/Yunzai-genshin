import { gsCfg, Button } from "#index"
import Calculator from "../model/other/calculator.js"

export class calculator extends plugin {
  constructor () {
    super({
      name: "[genshin/calculator.js]角色养成计算",
      dsc: "角色养成材料计算器",
      event: "message",
      priority: 700,
      rule: [
        { reg: "^#*(星铁)?(.*)(养成|计算)([0-9]|,|，| )*$", fnc: "Calculator" },
        { reg: "^#*(星铁)?(角色)?(养成|计算|养成计算)(帮助|说明)?$", fnc: "calculatorHelp" }
      ]
    })
    this._path = process.cwd().replace(/\\/g, "/")
  }

  async calculatorHelp () {
    let msg = `角色养成计算
原神指令：
#刻晴养成81 90 9 9 9
参数为角色、武器、技能等级
支持多角色，如：
#胡桃甘雨养成
#胡桃养成81 90 9 9 9甘雨养成80 90 9 9 9

星铁指令：
*克拉拉养成75 80 6 9 9 9
参数为角色、光锥、普攻、战技、终结技、天赋
同样支持多角色，如：
*克拉拉景元养成
*克拉拉养成75 80 6 9 9 9景元养成75 80 6 9 9 9`
    await this.e.reply(msg)
    return true
  }

  /** #角色养成 */
  async Calculator () {
    const game = this.e.msg.includes("星铁") ? "sr" : "gs"
    const roles = this.parseRoles(this.e.msg, game)
    if (!roles.length) {
      let role = gsCfg.getRole(this.e.msg, "#|＃|星铁|养成|计算|[0-9]|,|，| ", game === "sr", game)
      if (!role) {
        return false
      }
      this.e.isSr = role.game === "sr"
      if ([10000005, 10000007, 20000000, 10000117, 10000118].includes(Number(role.roleId))) {
        await this.e.reply("暂不支持旅行者,奇偶养成计算")
        return true
      }
      let data = await new Calculator(this.e).get(role)
      if (!data) return
      this.reply([await this.renderImg("genshin", `Mys/html/calculator/calculator-${data.game}`, data, { retType: "base64" }), new Button(this.e).strategy(role)])
      return
    }
    const banRoleIds = [10000005, 10000007, 20000000, 10000117, 10000118]
    let replyMsg = []
    let hasBanRole = false
    for (let i = 0; i < roles.length; i++) {
      let roleInfo = roles[i]
      if (banRoleIds.includes(Number(roleInfo.roleId))) {
        hasBanRole = true
        continue
      }
      let start = roleInfo.index
      let end = (i < roles.length - 1) ? roles[i + 1].index : this.e.msg.length
      let segMsg = this.e.msg.slice(start, end).trim()
      let eRole = { ...this.e }
      eRole.msg = segMsg
      eRole.isSr = game === "sr"
      let calcModel = new Calculator(eRole)
      let data = await calcModel.get({
        roleId: roleInfo.roleId,
        uid: "",
        alias: roleInfo.alias,
        game,
        name: gsCfg.roleIdToName
          ? gsCfg.roleIdToName(roleInfo.roleId)
          : roleInfo.alias
      })
      if (!data) continue
      replyMsg.push(
        await this.renderImg("genshin", `Mys/html/calculator/calculator-${data.game}`, data, { retType: "base64" }),
        new Button(this.e).strategy({
          roleId: roleInfo.roleId,
          uid: "",
          alias: roleInfo.alias,
          game,
          name: gsCfg.roleIdToName
            ? gsCfg.roleIdToName(roleInfo.roleId)
            : roleInfo.alias
        })
      )
    }
    if (hasBanRole) {
      await this.e.reply("暂不支持旅行者,奇偶养成计算，已跳过相关角色")
    }
    if (replyMsg.length) {
      this.reply(replyMsg)
    }
  }

  parseRoles (msg, game = "gs") {
    let cfg = gsCfg.getdefSet("role", game === "sr" ? "sr_name" : "name") || {}
    let candidates = []
    for (let roleId in cfg) {
      let aliasArr = cfg[roleId] || []
      for (let alias of aliasArr) {
        if (!alias) continue
        let idx = msg.indexOf(alias)
        if (idx !== -1) {
          candidates.push({
            roleId: Number(roleId),
            alias,
            index: idx,
            length: alias.length
          })
        }
      }
    }
    if (!candidates.length) return []
    candidates.sort((a, b) => {
      if (a.index === b.index) return b.length - a.length
      return a.index - b.index
    })
    let roles = []
    let lastEnd = -1
    for (let c of candidates) {
      if (c.index < lastEnd) continue
      roles.push({
        roleId: c.roleId,
        alias: c.alias,
        index: c.index
      })
      lastEnd = c.index + c.length
    }
    return roles
  }
}
