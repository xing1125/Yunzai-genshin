import _ from "lodash"
import { Button } from "#index"
import explore from "../model/explore.js"
import RoleList from "../model/roleList.js"
import roleIndex from "../model/roleIndex.js"
import Pet from "../model/pet.js"

export class role extends plugin {
  constructor () {
    super({
      name: "[StarRail/role.js]星铁角色查询",
      dsc: "星铁角色信息查询",
      event: "message",
      priority: -Infinity,
      rule: [
        { reg: "^#星铁(我的)*(角色|查询|查询角色|角色查询|人物|卡片)[ |0-9]*$", fnc: "roleIndex" },
        { reg: "^#星铁(我的)*(技能|天赋|人物|练度|五|四|5|4|星)+(统计)(force|五|四|5|4|星)*[ |0-9]*$", fnc: "roleList" },
        { reg: "^#星铁(我的)*角色列表[ |0-9]*$", fnc: "roleList" },
        { reg: "^#星铁(我的)*(技能|天赋|武器|角色|人物|练度|五|四|5|4|星)+(汇总|列表)(force|五|四|5|4|星)*[ |0-9]*$", fnc: "roleList" },
        { reg: "^#星铁武器[ |0-9]*$", fnc: "weapon" },
        { reg: "^#星铁(宝箱|探索|探险|探险度|探索度|成就)$", fnc: "roleExplore" },
        { reg: "^#星铁(?:我的)?随宠(?:款式|详情|列表)?[ |0-9]*$", fnc: "pet" }
      ]
    })
  }

  async handleRoleData (getDataFunction, type) {
    let data = await getDataFunction()
    if (!data) return
    this.reply([await this.renderImg("genshin", `StarRail/html/${type}/${type}`, data, { retType: "base64" }), new Button(this.e).roleSr()])
  }

  /** *角色 */
  async roleIndex () {
    await this.handleRoleData(() => new roleIndex(this.e).getIndex(), "roleIndex")
  }

  /** 练度统计 */
  async roleList () {
    await this.handleRoleData(() => RoleList.get(this.e), "roleList")
  }

  /** 武器 */
  async weapon () {
    await this.handleRoleData(() => RoleList.getWeapon(this.e), "weapon")
  }

  /** 随宠 */
  async pet () {
    await this.handleRoleData(() => Pet.get(this.e), "pet")
  }

  /** 探险 */
  async roleExplore () {
    this.reply("正在获取数据，请稍后...")
    let data = await new explore(this.e).get()
    if (!data) return
    let chest = await new explore(this.e).getChest()
    if (!chest) return
    let achieve = await new explore(this.e).getAchieve()
    if (!achieve) return
    let exploreImg = await this.renderImg("genshin", "StarRail/html/explore/explore", data, { retType: "base64" })
    let chestImg = await this.renderImg("genshin", "StarRail/html/chest/chest", chest, { retType: "base64" })
    let achiveImg = await this.renderImg("genshin", "StarRail/html/achievement/achievement", achieve, { retType: "base64" })
    if (exploreImg && chestImg && achiveImg) {
      await this.reply([exploreImg, chestImg, achiveImg, new Button(this.e).roleSr()])
    }
  }
}