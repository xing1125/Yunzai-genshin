import { Button } from "#index"
import RoleCard from "../model/roleCard.js"

export class role extends plugin {
  constructor () {
    super({
      name: "[Wd/role.js]未定事件簿角色查询",
      dsc: "未定事件簿角色查询",
      event: "message",
      priority: 200,
      rule: [
        { reg: "^(#(未定)(角色|查询|查询角色|角色查询|人物|卡片))", fnc: "roleIndex" }
      ]
    })
  }

  /** 角色 */
  async roleIndex () {
    let data = await new RoleCard(this.e).getData()
    if (!data) return
    this.reply([await this.renderImg("genshin", "Wd/html/roleCard/roleCard", data, { retType: "base64" }), new Button(this.e).roleWd()])
  }
}