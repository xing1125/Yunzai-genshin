import Deck from "../model/deck.js"
import { Button, gsCfg } from "#index"
import Explore from "../model/explore.js"
import RoleList from "../model/roleList.js"
import Materials from "../model/materials.js"
import Achievement from "../model/achievement.js"

export class role extends plugin {
  constructor () {
    super({
      name: "[Genshin/role.js]原神角色查询",
      dsc: "原神角色信息查询",
      event: "message",
      priority: 49,
      rule: [
        { reg: "^(#(角色|查询|查询角色|角色查询|人物|人物查询)[ |0-9]*$)|(^(#*uid|#*UID)(\\+|\\s)*[1|2|3|5-9][0-9]{8}$)|(^#[\\+|＋]*[1|2|3|5-9][0-9]{8})", fnc: "roleIndex" },
        { reg: "^#*(我的)*(技能|天赋|武器|角色|人物|练度|五|四|5|4|星)+(汇总|列表)(force|五|四|5|4|星)*[ |0-9]*$", fnc: "roleList" },
        { reg: "^#[五星|四星|5星|4星]*武器[ |0-9]*$", fnc: "weapon" },
        { reg: "^#*(我的)?(材料|素材)背包$", fnc: "materials" },
        { reg: "^#*(宝箱|尘歌壶|家园|探索|探险|声望|探险度|探索度)[ |0-9]*$", fnc: "roleExplore" },
        { reg: "^#*成就$", fnc: "achievement" },
        { reg: "^#*七圣(召唤)?(查询)?(牌|卡)(组|牌)(列表)?[0-9]{0,2}$", fnc: "deckIndex" },
        { reg: "^#*七圣(召唤)?(查询)?(角色|行动)?(卡)?牌(列表)?$", fnc: "deck_cards" },
        { reg: "^#*七圣(召唤)?数据$", fnc: "deckData" },
        { reg: "^#*七圣(召唤)?战绩$", fnc: "deckDataList" }
      ]
    })
  }

  async handleRoleData (getDataFunction, type) {
    let data = await getDataFunction()
    if (!data) return
    this.reply([await this.renderImg("genshin", `Genshin/html/${type}/${type}`, data, { retType: "base64" }), new Button(this.e).roleGs()])
  }

  /** #角色 */
  async roleIndex () {
    if (!gsCfg.getConfig("config", "admin").gsRole) return false
    await this.handleRoleData(() => RoleList.get(this.e), "roleIndex")
  }

  /** 练度统计 */
  async roleList () {
    if (!gsCfg.getConfig("config", "admin").gsRole) return false
    await this.handleRoleData(() => RoleList.get(this.e), "roleList")
  }

  /** 武器 */
  async weapon () {
    await this.handleRoleData(() => RoleList.getWeapon(this.e), "weapon")
  }

  /** 材料背包 */
  async materials () {
    await this.handleRoleData(() => new Materials(this.e).get(), "materialPack")
  }

  /** 探险 */
  async roleExplore () {
    await this.handleRoleData(() => new Explore(this.e).roleExplore(), "explore")
  }

  /** 成就 */
  async achievement () {
    await this.handleRoleData(() => new Achievement(this.e).get(), "achievement")
  }

  /** 七圣卡组 */
  async deckIndex () {
    let index = this.e.msg.match(/[0-9]{1,2}/g)
    if (index && index[0]) {
      await this.deck(index[0])
    } else {
      await this.deck_list()
    }
  }

  async deck (id) {
    let data = await new Deck(this.e).getIndex(id)
    if (!data) return
    this.reply([await this.renderImg("genshin", "Genshin/html/deck/deck", data, { retType: "base64" }), new Button(this.e).sevenSaints()])
  }

  async deck_list (id = 0) {
    let data = await new Deck(this.e).getIndex(id, true)
    if (!data) return
    this.reply([await this.renderImg("genshin", "Genshin/html/deck/deckList", data, { retType: "base64" }), new Button(this.e).sevenSaints()])
  }

  /** 七圣卡牌列表 */
  async deck_cards (id = 0) {
    if (this.e.msg.includes("角色")) id = 1
    if (this.e.msg.includes("行动")) id = 2
    let data = await new Deck(this.e).getcard(id)
    if (!data) return
    this.reply([await this.renderImg("genshin", "Genshin/html/deck/deckCard", data, { retType: "base64" }), new Button(this.e).sevenSaints()])
  }

  /** 七圣数据 */
  async deckData () {
    let data = await Deck.get(this.e)
    if (!data) return
    this.reply([await this.renderImg("genshin", "Genshin/html/deck/deckData", data, { retType: "base64" }), new Button(this.e).sevenSaints()])
  }

  /** 七圣战绩 */
  async deckDataList () {
    let data = await new Deck(this.e).getData()
    if (!data) return
    let avatarImg = await this.renderImg("genshin", "Genshin/html/deck/deckDataList", data.avatarRenderData, { retType: "base64" })
    let actionImg = await this.renderImg("genshin", "Genshin/html/deck/deckDataList", data.actionRenderData, { retType: "base64" })
    if (avatarImg && actionImg) {
      await this.reply([avatarImg, actionImg, new Button(this.e).sevenSaints()])
    }
  }
}