import { Button } from "#index"
import dailyNote from "../model/dailyNote.js"

export class Note extends plugin {
  constructor () {
    super({
      name: "[Bh3/dailyNote.js]崩三体力查询",
      dsc: "崩三体力查询",
      event: "message",
      priority: 200,
      rule: [
        { reg: "^#崩三体力$", fnc: "Note" }
      ]
    })
  }

  /** 体力 */
  async Note () {
    let data = await new dailyNote(this.e).Note()
    if (!data) return
    this.reply([await this.renderImg("genshin", "Bh3/html/dailyNote/dailyNote", data, { retType: "base64" }), new Button(this.e).roleBh3()])
  }
}