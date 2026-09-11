import _ from "lodash"
import fs from "node:fs"
import YAML from "yaml"
import { gsCfg } from "#index"
import MysNews from "../model/mys/mysNews.js"

const lable = gsCfg.getConfig("mys", "set")
const commond = gsCfg.getdefSet("mys", "pushNews").gameName

export class mysNews extends plugin {
  constructor () {
    super({
      name: "[genshin/mysNews.js]米游社公告",
      dsc: "#公告 #资讯 #活动",
      event: "message",
      priority: 3000,
      rule: [
        { reg: `^#*(官方|米游社|mys)?((${commond})(公告|资讯|活动)?|(公告|资讯|活动))(列表|[0-9])*$`, fnc: "news" },
        { reg: `^(#米游社|#mys)(搜索)?(${commond})?(.*)`, fnc: "mysSearch" },
        { reg: "(.*)(bbs.mihoyo.com|miyoushe.com)/(ys|sr|zzz|wd|bh3|bh2|hna)?(.*article.*)", fnc: "mysUrl" },
        { reg: `^#*(${commond})(开启|关闭)(公告|资讯|活动)推送$|^#(开启|关闭)(${commond})(公告|资讯|活动)推送$`, fnc: "setPush", permission: `${lable.newsPermission}` },
        { reg: `^#(开启|关闭)(${commond})全部推送$|^#*(${commond})?(开启|关闭)全部推送$`, fnc: "setAllPush", permission: `${lable.newsPermission}` },
        { reg: "^#(开启|关闭)全部(游戏)?(米游社)?推送$", fnc: "setAllMysPush", permission: `${lable.newsPermission}` },
        { reg: "^#米游社推送列表$", fnc: "pushList", permission: `${lable.newsPermission}` },
        { reg: `^#(${commond})?推送(公告|资讯|活动)$`, fnc: "mysNewsTask", permission: `${lable.newsPermission}` },
        { reg: "^#(星铁|原神|绝区零)(开启|关闭)(到期活动|活动到期)(预警)?(推送)?$", fnc: "setActivityPush", permission: `${lable.activityPermission}` },
        { reg: "^#(开启|关闭)全部(游戏)?(到期活动|活动到期)?推送$", fnc: "setAllActivityPush", permission: `${lable.activityPermission}` }
      ]
    })
    this.file = "./plugins/genshin/config/config/mys.pushNews.yaml"
    /** 定时任务 */
    this.task = {
      cron: gsCfg.getConfig("mys", "pushNews").pushTime,
      name: "米游社公告推送任务",
      fnc: () => this.mysNewsTask(),
      log: true
    }
  }

  /** 米游社公告 */
  async news () {
    let gids = this.gids()
    let data = await new MysNews(this.e).getNews(gids)
    if (!data) return
    await this.reply(data)
  }

  /** 米游社公告任务 */
  async mysNewsTask () {
    let mysNews = new MysNews(this.e)
    await mysNews.ActivityPush()
    if (!this.e || !this.e.msg) {
      await mysNews.mysNewsTask()
      return
    }
    let onlyTypeName = ""
    if (this.e.msg.includes("公告")) {
      onlyTypeName = "公告"
    } else if (this.e.msg.includes("资讯")) {
      onlyTypeName = "资讯"
    } else if (this.e.msg.includes("活动")) {
      onlyTypeName = "活动"
    }
    const manualOpt = {
      forceLatestWhenEmpty: true,
      onlyTypeName
    }
    if (this.e.msg.includes("崩坏因缘精灵") || this.e.msg.includes("因缘精灵") || this.e.msg.includes("崩坏精灵") || this.e.msg.includes("精灵")) {
      await mysNews.mysNewsTaskForGame(9, manualOpt)
    } else if (this.e.msg.includes("绝区零")) {
      await mysNews.mysNewsTaskForGame(8, manualOpt)
    } else if (this.e.msg.includes("星铁")) {
      await mysNews.mysNewsTaskForGame(6, manualOpt)
    } else if (this.e.msg.includes("原神")) {
      await mysNews.mysNewsTaskForGame(2, manualOpt)
    } else if (this.e.msg.includes("崩坏三") || this.e.msg.includes("崩三")) {
      await mysNews.mysNewsTaskForGame(1, manualOpt)
    } else if (this.e.msg.includes("崩坏学园二") || this.e.msg.includes("崩坏二") || this.e.msg.includes("崩二")) {
      await mysNews.mysNewsTaskForGame(3, manualOpt)
    } else if (this.e.msg.includes("未定事件簿") || this.e.msg.includes("未定")) {
      await mysNews.mysNewsTaskForGame(4, manualOpt)
    } else if (this.e.msg.includes("星布谷地") || this.e.msg.includes("星布") || this.e.msg.includes("星地") || this.e.msg.includes("星布谷") || this.e.msg.includes("星谷") || this.e.msg.includes("星地")) {
      await mysNews.mysNewsTaskForGame(10, manualOpt)
    } else {
      await mysNews.mysNewsTask(manualOpt)
    }
  }

  /** 设置活动推送 */
  async setActivityPush () {
    let typeName
    let pushGame
    if (this.e.msg.includes("星铁")) {
      typeName = "srActivityPush"
      pushGame = "星铁"
    } else if (this.e.msg.includes("绝区零")) {
      typeName = "zzzActivityPush"
      pushGame = "绝区零"
    } else {
      typeName = "gsActivityPush"
      pushGame = "原神"
    }
    let cfg = gsCfg.getConfig("mys", "pushNews")
    if (!cfg[typeName]) cfg[typeName] = {}
    if (!Array.isArray(cfg[typeName][this.e.self_id])) {
      cfg[typeName][this.e.self_id] = []
    }
    let model
    let msg = `${pushGame}活动到期预警推送已`
    if (this.e.msg.includes("开启")) {
      model = "开启"
      // 将当前群号加入推送列表
      cfg[typeName][this.e.self_id].push(this.e.group_id)
      // 去重
      cfg[typeName][this.e.self_id] = _.uniq(cfg[typeName][this.e.self_id])
      msg += `${model}\n如有即将到期的活动将自动推送至此`
    } else {
      model = "关闭"
      msg += model
      // 从推送列表中移除当前群号
      cfg[typeName][this.e.self_id] = _.difference(cfg[typeName][this.e.self_id], [this.e.group_id])
      // 如果该机器人下没有群了，则删除该节点
      if (_.isEmpty(cfg[typeName][this.e.self_id])) {
        delete cfg[typeName][this.e.self_id]
      }
    }
    let yaml = YAML.stringify(cfg)
    fs.writeFileSync(this.file, yaml, "utf8")
    logger.mark(`${this.e.logFnc} ${model}${pushGame}活动到期预警：${this.e.group_id}`)
    await this.reply(msg)
  }

  /** 设置全部游戏活动推送 */
  async setAllActivityPush () {
    const games = [
      { type: "gsActivityPush", name: "原神" },
      { type: "srActivityPush", name: "星铁" },
      { type: "zzzActivityPush", name: "绝区零" }
    ]

    let cfg = gsCfg.getConfig("mys", "pushNews")
    let isEnable = this.e.msg.includes("开启")
    let model = isEnable ? "开启" : "关闭"

    for (let game of games) {
      if (!cfg[game.type]) cfg[game.type] = {}
      if (!Array.isArray(cfg[game.type][this.e.self_id])) {
        cfg[game.type][this.e.self_id] = []
      }

      if (isEnable) {
        // 开启：将当前群号加入该游戏的推送列表并去重
        cfg[game.type][this.e.self_id].push(this.e.group_id)
        cfg[game.type][this.e.self_id] = _.uniq(cfg[game.type][this.e.self_id])
      } else {
        // 关闭：从该游戏的推送列表中移除当前群号
        cfg[game.type][this.e.self_id] = _.difference(cfg[game.type][this.e.self_id], [this.e.group_id])
        // 如果该机器人下没有群了，则删除该节点
        if (_.isEmpty(cfg[game.type][this.e.self_id])) {
          delete cfg[game.type][this.e.self_id]
        }
      }
    }

    // 保存配置
    let yaml = YAML.stringify(cfg)
    fs.writeFileSync(this.file, yaml, "utf8")

    logger.mark(`${this.e.logFnc} ${model}全部游戏活动到期预警：${this.e.group_id}`)

    let msg = `全部游戏（原神、星铁、绝区零）活动到期预警推送已${model}`
    if (isEnable) {
      msg += "\n如有即将到期的活动将自动推送至此"
    }
    await this.reply(msg)
  }

  /** 米游社搜索 */
  async mysSearch () {
    if (/(命令|帮助|菜单|help|功能|指令|使用说明|README|readme|说明|说明文档|文档|推送列表)/.test(this.e.msg)) return false
    if (/签到/g.test(this.e.msg)) return false
    let gids = this.gids()
    let data = await new MysNews(this.e).mysSearch(gids)
    if (!data) return
    await this.reply(data)
  }

  /** 米游社链接 */
  async mysUrl () {
    const mysSet = gsCfg.getConfig("mys", "set")
    if (mysSet?.mysUrlParse === false) return false
    let data = await new MysNews(this.e).mysUrl()
    if (!data) return
    await this.reply(data)
  }

  /** 设置全部米游社推送 */
  async setAllMysPush () {
    if (!this.e.isGroup) {
      await this.reply("推送请在群聊中设置")
      return
    }
    let cfg = gsCfg.getConfig("mys", "pushNews")
    let model
    let msg = "全部米游社推送已"

    // 所有游戏和推送类型
    const allGames = [
      { gid: 1, game: "bbb", name: "崩坏三" },
      { gid: 2, game: "gs", name: "原神" },
      { gid: 3, game: "bb", name: "崩坏二" },
      { gid: 4, game: "wd", name: "未定事件簿" },
      { gid: 6, game: "sr", name: "星铁" },
      { gid: 8, game: "zzz", name: "绝区零" },
      { gid: 9, game: "hna", name: "崩坏因缘精灵" },
      { gid: 10, game: "planet", name: "星布谷地" }
    ]

    const pushTypes = ["announceGroup", "infoGroup", "activitysGroup"]

    if (this.e.msg.includes("开启")) {
      model = "开启"
      for (let game of allGames) {
        for (let pushType of pushTypes) {
          let type = `${game.game}${pushType}`
          if (!cfg[type]) cfg[type] = {}
          if (!Array.isArray(cfg[type][this.e.self_id])) { cfg[type][this.e.self_id] = [] }
          cfg[type][this.e.self_id].push(this.e.group_id)
          cfg[type][this.e.self_id] = _.uniq(cfg[type][this.e.self_id])
        }
      }
      msg += `${model}\n所有游戏的公告、资讯、活动将自动推送至此\n支持游戏：原神 星铁 绝区 未定 崩3 崩2 崩坏因缘精灵 星布谷地`
    } else {
      model = "关闭"
      for (let game of allGames) {
        for (let pushType of pushTypes) {
          let type = `${game.game}${pushType}`
          if (cfg[type] && cfg[type][this.e.self_id]) {
            cfg[type][this.e.self_id] = _.difference(cfg[type][this.e.self_id], [this.e.group_id])
            if (_.isEmpty(cfg[type][this.e.self_id])) { delete cfg[type][this.e.self_id] }
          }
        }
      }
      msg += model
    }

    let yaml = YAML.stringify(cfg)
    fs.writeFileSync(this.file, yaml, "utf8")
    logger.mark(`${this.e.logFnc} ${model}全部米游社推送：${this.e.group_id}`)
    await this.reply(msg)
  }

  /** 设置全部推送 */
  async setAllPush () {
    if (!this.e.isGroup) {
      await this.reply("推送请在群聊中设置")
      return
    }
    let cfg = gsCfg.getConfig("mys", "pushNews")
    let gids = this.mysGids()
    const gameMap = {
      1: "bbb",
      2: "gs",
      3: "bb",
      4: "wd",
      6: "sr",
      8: "zzz",
      9: "hna",
      10: "planet"
    }
    let game = gameMap[gids] || "zzz"
    let name = new MysNews(this.e).gameName(gids)
    let model
    let msg = `${name}全部推送已`

    // 设置三种推送类型
    const pushTypes = [
      { type: `${game}announceGroup`, name: "公告" },
      { type: `${game}infoGroup`, name: "资讯" },
      { type: `${game}activitysGroup`, name: "活动" }
    ]

    if (this.e.msg.includes("开启")) {
      model = "开启"
      for (let pushType of pushTypes) {
        if (!cfg[pushType.type]) cfg[pushType.type] = {}
        if (!Array.isArray(cfg[pushType.type][this.e.self_id])) { cfg[pushType.type][this.e.self_id] = [] }
        cfg[pushType.type][this.e.self_id].push(this.e.group_id)
        cfg[pushType.type][this.e.self_id] = _.uniq(cfg[pushType.type][this.e.self_id])
      }
      msg += `${model}\n如有最新公告、资讯、活动将自动推送至此\n支持游戏：原神 星铁 绝区 未定 崩3 崩2 崩坏因缘精灵 星布谷地`
    } else {
      model = "关闭"
      for (let pushType of pushTypes) {
        if (cfg[pushType.type] && cfg[pushType.type][this.e.self_id]) {
          cfg[pushType.type][this.e.self_id] = _.difference(cfg[pushType.type][this.e.self_id], [this.e.group_id])
          if (_.isEmpty(cfg[pushType.type][this.e.self_id])) { delete cfg[pushType.type][this.e.self_id] }
        }
      }
      msg += model
    }

    let yaml = YAML.stringify(cfg)
    fs.writeFileSync(this.file, yaml, "utf8")
    logger.mark(`${this.e.logFnc} ${model}${name}全部推送：${this.e.group_id}`)
    await this.reply(msg)
  }

  /** 米游社推送列表 */
  async pushList () {
    let data = await new MysNews(this.e).getPushList()
    if (!data) return
    await this.reply(data)
  }

  /** 设置推送 */
  async setPush () {
    if (!this.e.isGroup) {
      await this.reply("推送请在群聊中设置")
      return
    }
    let cfg = gsCfg.getConfig("mys", "pushNews")
    let gids = this.mysGids()
    const gameMap = {
      1: "bbb",
      2: "gs",
      3: "bb",
      4: "wd",
      6: "sr",
      8: "zzz",
      9: "hna",
      10: "planet"
    }
    let game = gameMap[gids] || "zzz"
    let type = `${game}announceGroup`
    let typeName = "公告"
    if (this.e.msg.includes("资讯")) {
      type = `${game}infoGroup`
      typeName = "资讯"
    }
    if (this.e.msg.includes("活动")) {
      type = `${game}activitysGroup`
      typeName = "活动"
    }
    let model
    let name = new MysNews(this.e).gameName(gids)
    let msg = `${name}${typeName}推送已`
    if (!cfg[type]) cfg[type] = {}
    if (!Array.isArray(cfg[type][this.e.self_id])) { cfg[type][this.e.self_id] = [] }
    if (this.e.msg.includes("开启")) {
      model = "开启"
      cfg[type][this.e.self_id].push(this.e.group_id)
      cfg[type][this.e.self_id] = _.uniq(cfg[type][this.e.self_id])
      msg += `${model}\n如有最新${typeName}将自动推送至此`
    } else {
      model = "关闭"
      msg += `${model}`
      cfg[type][this.e.self_id] = _.difference(cfg[type][this.e.self_id], [this.e.group_id])
      if (_.isEmpty(cfg[type][this.e.self_id])) { delete cfg[type][this.e.self_id] }
    }
    let yaml = YAML.stringify(cfg)
    fs.writeFileSync(this.file, yaml, "utf8")
    logger.mark(`${this.e.logFnc} ${model}${typeName}推送：${this.e.group_id}`)
    await this.reply(msg)
  }

  /** 获取游戏id */
  gids () {
    let msg = this.e.msg
    if (msg.includes("星铁")) return 6
    if (msg.includes("崩坏三") || msg.includes("崩三")) return 1
    if (msg.includes("原神")) return 2
    if (msg.includes("崩坏学园二") || msg.includes("崩坏二") || msg.includes("崩二")) return 3
    if (msg.includes("未定事件簿") || msg.includes("未定")) return 4
    if (msg.includes("绝区零")) return 8
    if (msg.includes("崩坏因缘精灵") || msg.includes("因缘精灵") || msg.includes("崩坏精灵") || msg.includes("精灵")) return 9
    if (msg.includes("星布谷地") || msg.includes("星布") || msg.includes("星地") || msg.includes("星布谷") || msg.includes("星谷") || msg.includes("星地")) return 10
    return 2
  }

  mysGids () {
    let msg = this.e.msg.replace(/[#公告资讯活动开启关闭推送列表0-9]/g, "").replace(/全部/g, "")
    switch (msg) {
      case "崩坏三":
      case "崩三":
        return 1
      case "原神":
        return 2
      case "崩坏学园二":
      case "崩坏二":
      case "崩二":
        return 3
      case "未定事件簿":
      case "未定":
        return 4
      case "星铁":
        return 6
      case "绝区零":
        return 8
      case "崩坏因缘精灵":
      case "因缘精灵":
      case "崩坏精灵":
      case "精灵":
        return 9
      case "星布谷地":
      case "星布":
      case "星地":
      case "星布谷":
      case "星谷":
        return 10
    }
    return 2
  }
}
