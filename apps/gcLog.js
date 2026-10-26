import { Button, gsCfg } from "#index"
import fs from "node:fs"
import LogCount from "../model/gachaLog/logCount.js"
import GachaLog from "../model/gachaLog/gachaLog.js"
import ExportLog from "../model/gachaLog/exportLog.js"
import GachaAchievement from "../model/gachaLog/gachaAchievement.js"

let lable = gsCfg.getConfig("config", "admin").Gacha
const commond = gsCfg.getdefSet("config", "admin").gachaRole

export class gcLog extends plugin {
  constructor () {
    super({
      name: "[genshin/gcLog.js]抽卡记录",
      dsc: "抽卡记录数据统计",
      event: "message",
      priority: lable,
      rule: [
        { reg: "(.*)authkey=(.*)", fnc: "logUrl" },
        { reg: "^#?(原神|星铁)?(强制)?导入(抽卡)?记录(json)?$", fnc: "logJson" },
        { reg: "^#?(原神)?导入(Excel|excel)(记录)?$", fnc: "logExcel" },
        { reg: "^#?(原神|星铁)?(强制)?导出(Excel|excel)(记录)?$", fnc: "exportExcel" },
        { reg: "^#?(原神|星铁)?全部(记录|祈愿|分析)$", fnc: "getLog" },
        { reg: `^#?(原神|星铁)?(${commond})池*(抽卡)?(记录|祈愿|分析)$`, fnc: "getLog" },
        { reg: "^#?(原神|星铁)?(强制)?导出记录(json)?(v2|v4)?$", fnc: "exportLog" },
        { reg: /^#*(原神|星铁|绝区零)?(记录|安卓|电脑|苹果|抽卡|抽卡记录)(帮助|教程|绑定|步骤)$/, fnc: "help" },
        { reg: "^#*星铁更新抽卡记录$", fnc: "help" },
        { reg: "^#星铁(获取|更新|导入)(提瓦特)?小助手(抽卡|祈愿)?(记录|历史)", fnc: "help" },
        { reg: `^#*(原神|星铁)?(${commond})池*统计$`, fnc: "logCount" },
        { reg: "^#?(原神|星铁)?抽卡成就$", fnc: "gachaAchievement" },
        { reg: "^#?设置全量(更新|获取)(抽卡|祈愿)记录\s*(开|关|on|off)?$", fnc: "setFetchFullLog" }
      ]
    })
  }

  async init() {
    let file = ["./data/gachaJson", "./data/srJson", "./temp/html/StarRail", "./temp/uigf"]
    for (let i of file) {
      if (!fs.existsSync(i)) {
        fs.mkdirSync(i, { recursive: true })
      }
    }
  }

  accept () {
    if (this.e.msg && /^#?(角色|武器)统计$/g.test(this.e.msg)) {
      this.e.msg = this.e.msg.replace("统计", "池统计")
      return true
    }
  }

  /** 抽卡记录链接 */
  async logUrl () {
    let data = await new GachaLog(this.e).logUrl()
    if (!data) return
    this.reply([await this.renderImg("genshin", "Mys/html/gacha/gacha-all-log", data, { retType: "base64" }), new Button(this.e).gcLog()])

    if (this.e.isGroup) { this.e.reply("发送链接后请自行撤回", false, { at: true }) }
  }

  /** #抽卡记录 */
  async getLog () {
    this.e.isAll = this.e.msg == "#原神全部记录" || this.e.msg == "#原神抽卡记录" || this.e.msg == "#全部记录" || this.e.msg == "#抽卡记录" || this.e.msg == "#星铁全部记录" || this.e.msg == "#星铁抽卡记录"
    let data = await new GachaLog(this.e).getLogData()
    if (!data) return
    let name = "Mys/html/gacha/gacha-log"
    if (this.e.isAll) {
      name = "Mys/html/gacha/gacha-all-log"
    }
    this.reply([await this.renderImg("genshin", name, data, { retType: "base64" }), new Button(this.e).gcLog()])
  }

  /** 导出记录 */
  exportLog () {
    if (this.e.isGroup && !this.e.msg.includes("强制")) {
      let gamePrefix = "#"
      if (this.e.game === "sr") gamePrefix = "*"
      else if (this.e.game === "zzz") gamePrefix = "%"
      return this.reply(`建议私聊导出，若你确认要在此导出，请发送【${gamePrefix}强制导出记录】`, false, { at: true })
    }
    if (this.e.msg.includes("v2")) {
      this.e.uigfver = "v2"
    } else {
      this.e.uigfver = "v4"
    }
    return new ExportLog(this.e).exportJson()
  }

  /** 导出Excel */
  exportExcel () {
    if (this.e.isGroup && !this.e.msg.includes("强制")) {
      let gamePrefix = "#"
      if (this.e.game === "sr") gamePrefix = "*"
      else if (this.e.game === "zzz") gamePrefix = "%"
      return this.reply(`建议私聊导出，若你确认要在此导出，请发送【${gamePrefix}强制导出Excel】`, false, { at: true })
    }
    return new ExportLog(this.e).exportExcel()
  }

  logJson () {
    if (this.e.isGroup && !this.e.msg.includes("强制")) {
      let gamePrefix = "#"
      if (this.e.game === "sr") gamePrefix = "*"
      else if (this.e.game === "zzz") gamePrefix = "%"
      return this.reply(`建议私聊导入，若你确认要在此导入，请发送【${gamePrefix}强制导入记录】`, false, { at: true })
    }

    this.setContext("logJsonFile")
    return this.reply("请发送Json文件")
  }

  async logJsonFile () {
    if (!this.e.file && !/https?:\/\//.test(this.e.msg)) return false
    const fileName = this.e.file?.name || ""
    if (/\.xlsx?$|\.csv$/i.test(fileName)) {
      this.finish("logJsonFile")
      await new ExportLog(this.e).logExcel()
    } else {
      this.finish("logJsonFile")
      await new ExportLog(this.e).logJson()
    }
    if (this.e.isGroup) { this.e.reply("发送文件后请自行撤回", false, { at: true }) }
  }

  logExcel () {
    this.setContext("logExcelFile")
    return this.reply("请发送Excel文件（支持.xlsx/.xls/.csv格式）")
  }

  async logExcelFile () {
    if (!this.e.file) return false

    this.finish("logExcelFile")
    await new ExportLog(this.e).logExcel()
  }

  /** 抽卡记录帮助 */
  async help () {
    let msg = []
    msg.push(
      "星穹铁道获取方法:",
      "https://b.storyo.cn/archives/srlink",
      "不支持导入小助手记录"
    )
    await this.e.reply([segment.image("./plugins/genshin/resources/Mys/img/other/记录帮助.png"), msg.join("\n"), new Button(this.e).gcHelp()])
  }

  /** 抽卡统计 */
  async logCount () {
    let data = await new LogCount(this.e).count()
    if (!data) return
    this.reply([await this.renderImg("genshin", "Mys/html/gacha/log-count", data, { retType: "base64" }), new Button(this.e).gcLog()])
  }

  /** 抽卡成就 */
  async gachaAchievement () {
    const data = await new GachaAchievement(this.e).compute()
    if (!data) return
    this.reply([await this.renderImg("genshin", "Mys/html/gacha/gacha-achievement", data, { retType: "base64" }), new Button(this.e).gcLog()])
  }

  /** 设置全量抽卡记录 */
  async setFetchFullLog () {
    let isOff = this.e.msg.includes("关") || this.e.msg.includes("off")
    await new GachaLog(this.e).setFetchFullLog(!isOff)
  }
}
