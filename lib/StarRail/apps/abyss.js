import Abyss from "../model/abyss.js"
import { Button, MysInfo, common } from "#index"

export class abyss extends plugin {
  constructor () {
    super({
      name: "[StarRail/abyss.js]星铁深渊查询",
      dsc: "星铁深渊查询",
      event: "message",
      priority: Number.MIN_SAFE_INTEGER,
      rule: [
        { reg: "^#星铁[上期|往期|本期]*(异相仲裁|异相|仲裁|异向|异向仲裁)[上期|往期|本期]*[ |0-9]*$", fnc: "peak" },
        { reg: "^#星铁[上期|往期|本期]*(虚构|构事|虚构叙事)[上期|往期|本期]*[ |0-9]*$", fnc: "story" },
        { reg: "^#星铁[上期|往期|本期]*(忘却(之庭)?|(混沌)?回忆)[上期|往期|本期]*[ |0-9]*$", fnc: "abyss" },
        { reg: "^#星铁[上期|往期|本期]*(末日幻影|末日|幻影)[上期|往期|本期]*[ |0-9]*$", fnc: "boss" },
        { reg: "^#星铁[上期|往期|本期]*(模拟宇宙|宇宙|模拟)[上期|往期|本期]*[ |0-9]*$", fnc: "rogue" },
        { reg: "^#星铁[上期|往期|本期]*(深渊|逐光捡金|逐光)[上期|往期|本期]*[ |0-9]*$", fnc: "abyss_all" },
        { reg: "^#星铁(寰宇蝗灾|蝗灾|寰宇)[ |0-9]*$", fnc: "rogue_locust" },
        { reg: "^#星铁(黄金与机械|黄金|机械|黄金机械)[ |0-9]*$", fnc: "rogue_nous" },
        { reg: "^#星铁(不可知域|知域)[ |0-9]*$", fnc: "rogue_magic" },
        { reg: "^#星铁[上周|上期|往期|本期]*(差分(宇宙)*|(差分(宇宙)*)*(周期|常规)演算)[ |0-9]*$", fnc: "rogue_tourn" },
        { reg: "^#星铁(货币战争|货币|战争)[ |0-9]*$", fnc: "grid" }
      ]
    })
  }

  async handleAbyssData (type, name) {
    this.uid = await MysInfo.getSelfUid(this.e)
    let data = await new Abyss(this.e)[type]()
    if (!data) return
    if (type === "grid") {
      const renderPayload = Array.isArray(data) ? data : [data]
      if (!renderPayload.length) return
      const imgs = []
      for (const payload of renderPayload) {
        const img = await this.renderImg("genshin", `StarRail/html/${type}/${type}`, payload, { retType: "base64" })
        if (img) {
          imgs.push(img)
        }
      }
      if (imgs.length > 2) {
        this.reply(`UID:${this.uid}正在获取${name}信息，渲染数据较多，请稍候...`)
      }
      if (imgs.length <= 1) return
      const msg = imgs.map(img => [img])
      this.reply(common.makeForwardMsg(this.e, msg, `UID:${this.uid} ${name}数据`))
      return
    }
    this.reply(`UID:${this.uid}正在获取${name}信息，请稍后...`)
    const img = await this.renderImg("genshin", `StarRail/html/${type}/${type}`, data, { retType: "base64" })
    if (img) {
      this.reply([img, new Button(this.e).roleSr()])
    }
  }

  /** 异相仲裁 */
  async peak () {
    await this.handleAbyssData("peak", "异相仲裁")
  }

  /** 虚构叙事 */
  async story () {
    await this.handleAbyssData("story", "虚构叙事")
  }

  /** 忘却之庭 */
  async abyss () {
    await this.handleAbyssData("abyss", "忘却之庭")
  }

  /** 末日幻影 */
  async boss () {
    await this.handleAbyssData("boss", "末日幻影")
  }

  /** 模拟宇宙 */
  async rogue () {
    await this.handleAbyssData("rogue", "模拟宇宙")
  }

  /** 寰宇蝗灾 */
  async rogue_locust () {
    await this.handleAbyssData("rogue_locust", "寰宇蝗灾")
  }

  /** 黄金与机械 */
  async rogue_nous () {
    await this.handleAbyssData("rogue_nous", "黄金与机械")
  }

  /** 不可知域 */
  async rogue_magic () {
    await this.handleAbyssData("rogue_magic", "不可知域")
  }

  /** 差分宇宙 */
  async rogue_tourn () {
    await this.handleAbyssData("rogue_tourn", "差分宇宙")
  }

  /** 货币战争 */
  async grid () {
    await this.handleAbyssData("grid", "货币战争")
  }

  /** 全部深渊 */
  async abyss_all () {
    this.uid = await MysInfo.getSelfUid(this.e)
    this.reply(`UID:${this.uid}正在获取逐光捡金数据，请稍后...`)
    const oldSilent = this.e.silentAbyss
    this.e.silentAbyss = true
    const abyssModel = new Abyss(this.e)
    let configs = []
    try {
      configs = [
        { type: "story", title: "虚构叙事", width: 840, data: await abyssModel.story() },
        { type: "boss", title: "末日幻影", width: 1000, data: await abyssModel.boss() },
        { type: "abyss", title: "忘却之庭", width: 800, data: await abyssModel.abyss() }
      ]
    } finally {
      this.e.silentAbyss = oldSilent
    }

    const columns = configs
      .filter(item => item.data)
      .map(item => {
        const list = item.data.list
        const group = item.type === "boss" ? list.groups?.[item.data.time] : item.type === "story" ? list.group : list
        return {
          type: item.type,
          title: item.title,
          time: item.data.time,
          list,
          group,
          showRound: item.type !== "boss",
          showTotalScore: item.type !== "abyss",
          showNodeScore: item.type !== "abyss",
          maxLabel: item.type === "boss" ? "最高难度" : "最高关卡",
          periodText: item.type === "boss" || item.type === "story"
            ? `${group?.begin_time_str || ""}-${group?.end_time_str || ""}`
            : `${list.begin_time_str || ""}-${list.end_time_str || ""}`,
          floors: (list.all_floor_detail || []).filter(floor => floor.hasData && !floor.is_fast)
        }
      })

    columns.forEach(col => {
      col.hasStarMode = !!(col.list.hasTierceRecord || col.floors.some(floor => floor.hasTierceRecord))
    })

    if (!columns.length) {
      await this.reply(`UID:${this.uid},暂无逐光捡金挑战数据`)
      return
    }

    const totalWidth = columns.length * 430 + 32 + Math.max(columns.length - 1, 0) * 12
    const img = await this.renderImg("genshin", "StarRail/html/abyss_all/abyss_all", {
      ...columns[0].list,
      ...configs.find(item => item.data)?.data,
      uid: this.uid,
      totalWidth,
      contentWidth: totalWidth - 32,
      columns
    }, { retType: "base64" })
    if (img) {
      await this.reply([img, new Button(this.e).roleSr()])
    }
  }
}
