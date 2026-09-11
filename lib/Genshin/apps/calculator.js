import Blueprint from "../model/blueprint.js"

export class calculator extends plugin {
  constructor () {
    super({
      name: "[Genshin/calculator.js]尘歌壶计算",
      dsc: "尘歌壶计算器",
      event: "message",
      priority: 700,
      rule: [
        { reg: "^#*尘歌壶模数(养成|计算|养成计算)$", fnc: "blueprintHelp" },
        { reg: "^#*尘歌壶(模数|养成|养成计算)(\\d{10,15})$", fnc: "Blueprint" }
      ]
    })
  }

  /** 尘歌壶养成说明 */
  async blueprintHelp (e) {
    let msg = "#尘歌壶模数\n指令：#尘歌壶模数\n示例：#尘歌壶模数123456\n参数为模数id(10-15位数字)"
    await e.reply(msg)
    return true
  }

  /** 尘歌壶养成计算 */
  async Blueprint () {
    let role = this.e.msg.replace(/#/, "").match(/\d+/g)
    let data = await new Blueprint(this.e).get(role)
    if (!data) return
    await this.renderImg("genshin", "Genshin/html/blueprint/blueprint", data)
  }
}