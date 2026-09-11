import { Button, gsCfg } from "#index"
import Abyss from "../model/abyss.js"

export class abyss extends plugin {
  constructor () {
    super({
      name: "[Genshin/abyss.js]原神深渊查询",
      dsc: "原神深渊查询",
      event: "message",
      priority: 49,
      rule: [
        { reg: "^#*[上期|往期|本期]*(深渊|深境|深境螺旋)[上期|往期|本期]*[ |0-9]*$", fnc: "abyss" },
        { reg: "^#*[上期|往期|本期]*(幻想|剧诗|幻想真境|幻想真境剧诗)[上期|往期|本期]*[ |0-9]*$", fnc: "combat" },
        { reg: "^#*[上期|往期|本期]*幽(境|静)(危战)?[上期|往期|本期]*$", fnc: "challenge" }
      ]
    })
  }

  async handleRoleData (getDataFunction, type) {
    let data = await getDataFunction()
    if (!data) return
    this.reply([await this.renderImg("genshin", `Genshin/html/abyss/${type}`, data, { retType: "base64" }), new Button(this.e).roleGs()])
  }

  /** 深渊 */
  async abyss () {
    if (!gsCfg.getConfig("config", "admin").gsAbyss) return false
    await this.handleRoleData(() => new Abyss(this.e).getAbyss(), "abyss")
  }

  /** 幻想真境剧诗 */
  async combat () {
    if (!gsCfg.getConfig("config", "admin").gsCombat) return false
    await this.e.reply("正在获取幻想真境剧诗信息，请稍后...")
    let data = await new Abyss(this.e).getCombat()
    if (!data) return
    let combatImg = await this.renderImg("genshin", "Genshin/html/abyss/combat", data, { retType: "base64" })
    let yyspImg = await this.renderImg("genshin", "Genshin/html/abyss/tarot", data, { retType: "base64" })
    await this.reply([combatImg, yyspImg, new Button(this.e).roleGs()])
  }

  /** 幽境危战 */
  async challenge () {
    if (!gsCfg.getConfig("config", "admin").gsChallenge) return false
    await this.handleRoleData(() => new Abyss(this.e).getChallenge(), "challenge")
  }
}