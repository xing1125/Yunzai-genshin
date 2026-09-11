import { Button } from "#index"
import Ledger from "../model/ledger.js"

export class ledger extends plugin {
  constructor () {
    super({
      name: "[StarRail/ledger.js]开拓月历查询",
      dsc: "开拓月历查询",
      event: "message",
      priority: 300,
      rule: [
        { reg: "^(#*(星铁)?星琼)([0-9]|[一二两三四五六七八九十]+)*月*$", fnc: "ledger" },
        { reg: "^#*((星铁)?星琼)统计$", fnc: "ledgerCount" },
        { reg: "^#*星铁(去年|今年|\\d{4}年)((星铁)?星琼)统计$", fnc: "ledgerCountHistory" },
        { reg: "^#((星铁)?星琼)任务$", fnc: "ledgerTask" }
      ]
    })
  }

  async handleLedgerData (getDataFunction, type) {
    let data = await getDataFunction()
    if (!data) return
    this.reply([await this.renderImg("genshin", `StarRail/html/ledger/${type}`, data, { retType: "base64" }), new Button(this.e).gameLeder()])
  }

  /** *星琼礼记 */
  async ledger () {
    await this.handleLedgerData(() => new Ledger(this.e).get(), "ledger")
  }

  /** 星琼统计 */
  async ledgerCount () {
    await this.handleLedgerData(() => new Ledger(this.e).ledgerCount(), "ledger-count")
  }

  /** 去年 星琼统计 */
  async ledgerCountHistory () {
    await this.handleLedgerData(() => new Ledger(this.e).ledgerCountHistory(), "ledger-count")
  }

  /** 星琼任务 */
  async ledgerTask () {
    if (!this.e.isMaster) return false
    let ledger = new Ledger(this.e)
    await ledger.ledgerTask(!!this?.e?.msg)
  }
}