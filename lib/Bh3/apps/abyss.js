import { Button } from "#index"
import Abyss from "../model/abyss.js"

export class abyss extends plugin {
  constructor () {
    super({
      name: "[Bh3/abyss.js]崩三深渊查询",
      dsc: "崩三深渊查询",
      event: "message",
      priority: 200,
      rule: [
        { reg: "^#崩三(往世乐土|乐土|往事乐土|往事|往世)(战绩|挑战记录|记录|战报)?$", fnc: "godWar" },
        { reg: "^#崩三(深渊|超弦空间)(战绩|挑战记录|记录|战报)?$", fnc: "abyss" },
        { reg: "^#崩三(战场|记忆战场)(战绩|挑战记录|记录|战报)?$", fnc: "battleField" }
      ]
    })
  }

  async handleRoleData (getDataFunction, type) {
    let data = await getDataFunction()
    if (!data) return
    this.reply([await this.renderImg("genshin", `Bh3/html/${type}/${type}`, data, { retType: "base64" }), new Button(this.e).roleBh3()])
  }

  /** 往世乐土 */
  async godWar () {
    await this.e.reply("正在获取往事乐土数据，请稍后...")
    await this.handleRoleData(() => new Abyss(this.e).getGod(), "godWar")
  }

  /** 深渊 */
  async abyss () {
    await this.handleRoleData(() => new Abyss(this.e).getAbyss(), "abyss")
  }

  /** 记忆战场 */
  async battleField () {
    await this.e.reply("正在获取记忆战场数据，请稍后...")
    await this.handleRoleData(() => new Abyss(this.e).getBattleField(), "battleField")
  }
}