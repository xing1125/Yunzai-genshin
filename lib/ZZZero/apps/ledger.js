import { Button } from "#index"
import Ledger from "../model/ledger.js"

export class ledger extends plugin {
  constructor () {
    super({
      name: "[ZZZero/ledger.js]绝区零菲林统计",
      dsc: "绝区零菲林统计",
      event: "message",
      priority: Number.MIN_SAFE_INTEGER,
      rule: [
        { reg: "^#绝区零(菲林|月报|统计)([0-9]|[一二两三四五六七八九十]+)*月*$", fnc: "ledger" },
        { reg: "^#绝区零菲林统计$", fnc: "ledgerCount" },
        { reg: "^#绝区零(去年|今年|\\d{4}年)(绝区零)?(菲林)统计$", fnc: "ledgerCountHistory" }
      ]
    })
  }

  async handleLedgerData (getDataFunction, type) {
    let data = await getDataFunction()
    if (!data) return
    this.reply([await this.renderImg("genshin", `ZZZero/html/ledger/${type}`, data, { retType: "base64" }), new Button(this.e).gameLeder()])
  }

  /** 月报 */
  async ledger () {
    await this.handleLedgerData(() => new Ledger(this.e).get(), "ledger")
  }

  /** 菲林统计 */
  async ledgerCount () {
    await this.handleLedgerData(() => new Ledger(this.e).getCount(), "ledger-count")
  }

  /** 去年 菲林统计 */
  async ledgerCountHistory () {
    await this.handleLedgerData(() => new Ledger(this.e).ledgerCountHistory(), "ledger-count")
  }
}
