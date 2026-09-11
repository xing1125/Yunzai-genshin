import { Button } from "#index"
import Ledger from "../model/ledger.js"

export class ledger extends plugin {
  constructor () {
    super({
      name: "[Bh3/ledger.js]崩三水晶查询",
      dsc: "崩三水晶查询",
      event: "message",
      priority: 200,
      rule: [
        { reg: "^#崩三(上月)?(水晶|舰长)(手账)?$", fnc: "ledger" },
        { reg: "^#崩三水晶统计$", fnc: "ledgerCount" },
        { reg: "^#崩三(去年|今年|\\d{4}年)水晶统计$", fnc: "ledgerCountHistory" }
      ]
    })
  }

  /** #水晶札记 */
  async ledger () {
    let data = await new Ledger(this.e).ledger()
    if (!data) return
    this.reply([await this.renderImg("genshin", "Bh3/html/ledger/ledger", data, { retType: "base64" }), new Button(this.e).bh3Leder()])
  }

  /** 水晶统计 */
  async ledgerCount () {
    let data = await new Ledger(this.e).ledgerCount()
    if (!data) return
    this.reply([await this.renderImg("genshin", "Bh3/html/ledger/ledger-count", data, { retType: "base64" }), new Button(this.e).bh3Leder()])
  }

  /** 去年 水晶统计 */
  async ledgerCountHistory () {
    let data = await new Ledger(this.e).ledgerCountHistory()
    if (!data) return
    this.reply([await this.renderImg("genshin", "Bh3/html/ledger/ledger-count", data, { retType: "base64" }), new Button(this.e).bh3Leder()])
  }
}
