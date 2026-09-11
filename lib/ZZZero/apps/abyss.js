import Abyss from "../model/abyss.js"
import { Button, MysInfo } from "#index"

export class role extends plugin {
  constructor () {
    super({
      name: "[ZZZero/abyss.js]绝区零深渊查询",
      dsc: "绝区零深渊查询",
      event: "message",
      priority: Number.MIN_SAFE_INTEGER,
      rule: [
        { reg: "^#绝区零[上期|往期|本期]*(危局强袭战|危局强袭|危局|强袭战)[上期|往期|本期]*$", fnc: "memDetail" },
        // { reg: "^#绝区零[上期|往期|本期]*(式舆防卫战|式舆防卫|式舆|防卫战)[上期|往期|本期]*$", fnc: "challenge" },
        { reg: "^#绝区零(临界推演|临界|推演)$", fnc: "voidFront" }
      ]
    })
  }

  async handleAbyssData (type, name) {
    this.uid = await MysInfo.getSelfUid(this.e)
    this.reply(`UID:${this.uid}正在获取${name}信息，请稍后...`)
    let data = await new Abyss(this.e)[type]()
    if (!data) return
    this.reply([await this.renderImg("genshin", `ZZZero/html/${type}/${type}`, data, { retType: "base64" }), new Button(this.e).roleZZZ()])
  }

  /** 危局强袭战 */
  async memDetail () {
    await this.handleAbyssData("memDetail", "危局强袭战")
  }

  /** 式舆防卫战 */
  async challenge () {
    await this.handleAbyssData("challenge", "式舆防卫战")
  }

  /** 临界推演 */
  async voidFront () {
    await this.handleAbyssData("voidFront", "临界推演")
  }
}