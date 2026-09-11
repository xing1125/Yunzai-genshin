import { Button } from "#index"
import roleIndex from "../model/roleIndex.js"

export class role extends plugin {
  constructor () {
    super({
      name: "[Bh3/role.js]崩三主页查询",
      dsc: "崩三主页查询",
      event: "message",
      priority: 200,
      rule: [
        { reg: "^#崩三(卡片|card|信息|个人信息)$", fnc: "roleCard" },
        { reg: "^(#(崩三)(角色|查询|查询角色|角色查询|人物))$", fnc: "roleIndex" },
        { reg: "^#崩三(我的)*(技能|天赋|武器|角色|人物|练度|五|四|5|4|星)+(汇总|列表)(force|五|四|5|4|星)*[ |0-9]*$", fnc: "roleList" },
        { reg: "^#崩三武器$", fnc: "weapon" },
        { reg: "^#崩三(一周)?成绩单$", fnc: "weekly" },
        { reg: "^#崩三周报$", fnc: "weekly" },
        { reg: "^#崩三注册时间$", fnc: "regTime" }
      ]
    })
  }

  async handleRoleData (getDataFunction, type) {
    let data = await getDataFunction()
    if (!data) return
    this.reply([await this.renderImg("genshin", `Bh3/html/${type}/${type}`, data, { retType: "base64" }), new Button(this.e).roleBh3()])
  }

  /** 个人信息 */
  async roleCard () {
    await this.e.reply("正在获取主页信息，请稍后...")
    await this.handleRoleData(() => new roleIndex(this.e).getRoleCard(), "roleCard")
  }

  /** 角色 */
  async roleIndex () {
    await this.e.reply("正在获取角色信息，请稍后...")
    await this.handleRoleData(() => new roleIndex(this.e).getCharacter(), "roleIndex")
  }

  /** 练度统计 */
  async roleList () {
    await this.e.reply("正在获取角色信息，请稍后...")
    await this.handleRoleData(() => new roleIndex(this.e).getCharacter(), "roleList")
  }

  /** 武器 */
  async weapon () {
    await this.handleRoleData(() => new roleIndex(this.e).getWeapon(), "weapon")
  }

  /** 周报 */
  async weekly () {
    await this.handleRoleData(() => new roleIndex(this.e).getWeek(), "weekly")
  }

  /** 注册时间 */
  async regTime () {
    await this.handleRoleData(() => new roleIndex(this.e).getRegTime(), "regTime")
  }
}