import { Button } from "#index"
import explore from "../model/explore.js"
import RoleList from "../model/roleList.js"
import roleIndex from "../model/roleIndex.js"

export class role extends plugin {
  constructor () {
    super({
      name: "[ZZZero/role.js]绝区零角色查询",
      dsc: "绝区零角色查询",
      event: "message",
      priority: Number.MIN_SAFE_INTEGER,
      rule: [
        { reg: "^(#(绝区零)(角色|查询|查询角色|角色查询|人物|卡片)[ |0-9]*$)|(^(#*(绝区零)uid|#*(绝区零)UID)(\\+|\\s)*([1-9]|18)[0-9]{8}$)|(^#(绝区零)[\\+|＋]*([1-9]|18)[0-9]{8})", fnc: "roleIndex" },
        { reg: "^#绝区零(我的)*(技能|天赋|武器|角色|人物|练度|五|四|5|4|星)+(汇总|统计|列表)(force|五|四|5|4|星)*[ |0-9]*$", fnc: "roleList" },
        { reg: "^#绝区零武器[ |0-9]*$", fnc: "weapon" },
        { reg: "^#绝区零(宝箱|成就|探索|探险|探险度|探索度)[ |0-9]*$", fnc: "roleExplore" },
        { reg: "^#*绝区零?(邦布|人偶)$", fnc: "buddy" }
      ]
    })
  }

  /** 统一处理渲染和回复逻辑 */
  async renderAndReply (template, data) {
    if (!data) return false
    return this.reply([
      await this.renderImg("genshin", `ZZZero/html/${template}/${template}`, data, { retType: "base64" }),
      new Button(this.e).roleZZZ()
    ])
  }

  /** 角色 */
  async roleIndex () {
    const data = await new roleIndex(this.e).getIndex()
    return this.renderAndReply("roleIndex", data)
  }

  /** 练度统计 */
  async roleList () {
    const data = await RoleList.get(this.e)
    return this.renderAndReply("roleList", data)
  }

  /** 武器 */
  async weapon () {
    const data = await RoleList.getWeapon(this.e)
    return this.renderAndReply("weapon", data)
  }

  /** 探险 */
  async roleExplore () {
    const data = await new explore(this.e).getIndex()
    return this.renderAndReply("explore", data)
  }

  /** 邦布 */
  async buddy () {
    const data = await new roleIndex(this.e).getData()
    return this.renderAndReply("buddy", data)
  }
}