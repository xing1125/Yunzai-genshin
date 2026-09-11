import { Button } from "#index"
import Ledger from "../model/ledger.js"

export class ledger extends plugin {
  constructor () {
    super({
      name: "[Genshin/ledger.js]札记查询",
      dsc: "米游社札记查询",
      event: "message",
      priority: 300,
      rule: [
        { reg: "^(#*原石|#*札记)([0-9]|[一二两三四五六七八九十]+)*月*$", fnc: "ledger" },
        { reg: "^#*(原石|札记)统计$", fnc: "ledgerCount" },
        { reg: "^#*(去年|今年|\\d{4}年)(原石|札记)统计$", fnc: "ledgerCountHistory" },
        { reg: "^#*原石任务$", fnc: "ledgerTask" }
      ]
    })
  }

  async handleLedgerData (getDataFunction, type) {
    let data = await getDataFunction()
    if (!data) return
    this.reply([await this.renderImg("genshin", `Genshin/html/ledger/${type}`, data, { retType: "base64" }), new Button(this.e).gameLeder()])
  }

  /** #原石札记 */
  async ledger () {
    await this.handleLedgerData(() => new Ledger(this.e).get(), "ledger")
  }

  /** 原石统计  */
  async ledgerCount () {
    await this.handleLedgerData(() => new Ledger(this.e).ledgerCount(), "ledger-count")
  }

  /** 去年 原石统计  */
  async ledgerCountHistory () {
    await this.handleLedgerData(() => new Ledger(this.e).ledgerCountHistory(), "ledger-count")
  }

  /** 原石任务 */
  async ledgerTask () {
    if (!this.e.isMaster) return false
    let ledger = new Ledger(this.e)
    await ledger.ledgerTask(!!this?.e?.msg)
  }
}