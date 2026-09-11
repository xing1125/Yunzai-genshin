import fetch from "node-fetch"
import Jimp from "jimp"
import { MysInfo, common, Button } from "#index"
import MysNews from "../model/mys/mysNews.js"

export class exchange extends plugin {
  constructor () {
    super({
      name: "[genshin/Compile.js]前瞻信息总结",
      dsc: "前瞻信息总结",
      event: "message",
      priority: -1000,
      rule: [
        // { reg: /^(#|\*)?(原神|星铁|崩铁|崩三|崩坏三|崩坏3|绝区零)?(直播|前瞻)?兑换码$/, fnc: "getCode" },
        { reg: "^#(原神|星铁|绝区零)?(兑换码使用|cdk-u).+", fnc: "useCode" },
        { reg: "^#(星铁|绝区零|崩坏三|崩三)?(原(神|石)|星(铁|琼)|崩坏三|崩三|水晶|绝区(零)|zzz|菲林|邦布)?(预估|盘点)$", fnc: "Estimate" },
        { reg: "^#(原神|星铁|绝区零|崩三|崩坏三|崩坏3)?(前瞻|版本)(信息)?(汇总|总结)?$", fnc: "forward" },
        { reg: "^#生日月历$", fnc: "birthdaymenology" }
      ]
    })
  }

  /** 前瞻兑换码 */
  async getCode () {
    let reg = this.e.msg.match(/^(#|\*)?(原神|星铁|崩铁|崩三|崩坏三|崩坏3|绝区零)?(直播|前瞻)?兑换码$/)
    let gameName = reg[2]
    const gameConfigs = [
      {
        name: "原神",
        keywords: ["原神"],
        uid: "75276539",
        gid: "2",
        prefix: "#",
        msgPrefix: ["原神", "#前瞻信息", "#原石预估"]
      },
      {
        name: "崩坏：星穹铁道",
        keywords: ["星铁", "崩铁"],
        uid: "80823548",
        gid: "6",
        prefix: "*",
        msgPrefix: ["崩坏：星穹铁道", "*前瞻信息", "#星铁预估"]
      },
      {
        name: "崩坏3",
        keywords: ["崩三", "崩坏三", "崩坏3"],
        uid: "73565430",
        gid: "1",
        prefix: "#",
        msgPrefix: ["崩坏3", "#云崽帮助", "#水晶预估"]
      },
      {
        name: "绝区零",
        keywords: ["绝区零"],
        uid: "152039148",
        gid: "8",
        prefix: "%",
        msgPrefix: ["绝区零", "%前瞻信息", "%菲林预估"]
      }
    ]
    let targetGames = []
    if (gameName) {
      targetGames = gameConfigs.filter(g => g.keywords.includes(gameName) || g.name === gameName)
    } else {
      targetGames = gameConfigs
    }
    let msgList = []
    this.now = parseInt(Date.now() / 1000)
    for (let config of targetGames) {
      this.uid = config.uid
      this.gid = config.gid
      let result = await this.fetchGameCodeData(config)
      if (result) {
        msgList.push(result)
      }
    }
    if (msgList.length === 0) {
      if (targetGames.length === 1) {
        return await this.reply(`暂无${targetGames[0].name}前瞻直播兑换码或已过期`, true)
      }
      return await this.reply("暂无游戏前瞻直播兑换码", true)
    }
    let forwardMsg = []
    for (let data of msgList) {
      let msg = [`${data.title}\n过期时间: ${data.expireTimeStr}`, ...data.display_list]
      forwardMsg.push(msg)
    }
    if (msgList.length === 1) {
      let data = msgList[0]
      let msg = [`${data.title}\n过期时间: ${data.expireTimeStr}`, ...data.display_list]
      msg = await common.makeForwardMsg(this.e, msg, `${data.rawTitle}-直播兑换码`)
      await this.reply(msg)
    } else {
      let summary = `查询到 ${msgList.length} 个游戏的有效前瞻兑换码`
      let finalMsg = await common.makeForwardMsg(this.e, forwardMsg, summary)
      await this.reply(finalMsg)
    }
  }

  async fetchGameCodeData (config) {
    let actid = await this.getActId()
    let isBackupAct = false
    if (!actid) {
      actid = await this.getBackupActId()
      isBackupAct = true
    }
    if (!actid) return null
    this.actId = actid
    let index = await this.getData("index")
    if (!index || !index.data || index.data === null) return null
    let index_data = index.data.live
    let title = `${config.name}直播兑换码`
    this.code_ver = index_data.code_ver
    let code = await this.getData("code")
    if (!code || !code.data?.code_list) return null
    let codes = []
    let display_list = []
    let code_list_data = code.data.code_list
    let rawTimestamp = code_list_data[0]?.to_get_time
    if (!rawTimestamp) return null
    let expireDateObj = this.calculateExpireDate(rawTimestamp, isBackupAct)
    let nowObj = new Date()
    if (nowObj > expireDateObj) {
      logger.info(`[${config.name}] 兑换码已过期`)
      return null
    }
    let expireTimeStr = this.formatDate(expireDateObj)
    code_list_data.forEach((item, i) => {
      if (item.code && item.code.trim() !== "") {
        codes.push(item.code)
        display_list.push(item.code)
      } else {
        if (item.to_get_time) {
          let date = new Date(item.to_get_time * 1000)
          const timeStr = this.formatDate(date)
          display_list.push(`兑换码[${i + 1}] 预计公布时间: ${timeStr}`)
        } else {
          display_list.push(`兑换码[${i + 1}] 尚未公布`)
        }
      }
    })
    if (codes.length === 0 && display_list.length === 0) return null
    return {
      name: config.name,
      rawTitle: index_data.title,
      title,
      expireTimeStr,
      display_list,
      codes,
      msgPrefix: config.msgPrefix
    }
  }

  /** 计算过期时间对象 */
  calculateExpireDate (timestamp, isBackupAct) {
    if (!isBackupAct && this.deadline) {
    }
    const date = new Date(timestamp * 1000)
    const s = this.gid === "2" ? 1 : 1
    let daysToAdd = (this.gid === "2") ? 1 : 1
    if (this.gid === "2") daysToAdd = 1
    date.setDate(date.getDate() + daysToAdd)
    if (this.gid === "2") {
      date.setHours(12, 0, 0, 0)
    } else {
      date.setHours(23, 59, 59, 0)
    }
    return date
  }

  formatDate (date) {
    const Y = date.getFullYear() + "-"
    const M = (date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1) + "-"
    const D = (date.getDate() < 10 ? "0" + date.getDate() : date.getDate()) + " "
    const h = (date.getHours() < 10 ? "0" + date.getHours() : date.getHours()) + ":"
    const m = (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()) + ":"
    const s = (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds())
    return Y + M + D + h + m + s
  }

  async getData (type) {
    let url = {
      index: "https://api-takumi.mihoyo.com/event/miyolive/index",
      code: `https://api-takumi-static.mihoyo.com/event/miyolive/refreshCode?version=${this.code_ver}&time=${this.now}`,
      actId: `https://bbs-api.mihoyo.com/painter/api/user_instant/list?offset=0&size=20&uid=${this.uid}`,
      nav: `https://bbs-api.miyoushe.com/apihub/api/home/new?gids=${this.gid}&parts=1%2C3%2C4`
    }
    let response
    try {
      response = await fetch(url[type], {
        method: "get",
        headers: {
          "x-rpc-act_id": this.actId
        }
      })
    } catch (error) {
      logger.error(error.toString())
      return false
    }
    if (!response.ok) {
      logger.error(`[兑换码接口错误][${type}] ${response.status} ${response.statusText}`)
      return false
    }
    const res = await response.json()
    return res
  }

  /** 获取act_id */
  async getActId () {
    let ret = await this.getData("actId")
    if (ret.error || ret.retcode !== 0) {
      return ""
    }
    for (const p of ret.data.list) {
      let post = p?.post?.post
      if (!post) {
        continue
      }
      // 这里保留原来的逻辑用于辅助判断，但主要依赖 calculateExpireDate
      let date = new Date(post.created_at * 1000)
      if (this.uid == "80823548") {
        date.setDate(date.getDate() + 1)
        this.deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`
      } else if (this.uid == "73565430") {
        date.setDate(date.getDate() + 5)
        this.deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`
      } else if (this.uid == "152039148") {
        date.setDate(date.getDate() + 1)
        this.deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`
      } else {
        date.setDate(date.getDate() + 5)
        this.deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 12:00:00`
      }
      let structured_content = post.structured_content
      let result = structured_content.match(/{"link":"https:\/\/webstatic.mihoyo.com\/bbs\/event\/live\/index.html\?act_id=(.*?)\\/)
      if (result) {
        return result[1]
      }
    }
  }

  /** 获取备用act_id */
  async getBackupActId () {
    const res = await this.getData("nav")
    if (res.retcode !== 0) return null
    const navMatch = res.data?.navigator?.find(item =>
      item.name.match(/前瞻|特别节目/) &&
      item.app_path.includes("act_id=")
    )
    if (navMatch) {
      const actId = navMatch.app_path.match(/act_id=([a-zA-Z0-9]+)/)[1]
      return actId
    }
  }

  /** 兑换码使用 */
  async useCode () {
    const cdkCode = this.e.msg.replace(/#(原神|星铁|绝区零)?(兑换码使用|cdk-u)/, "").trim()
    const res = await MysInfo.get(this.e, "useCdk", { cdk: cdkCode })
    if (res.retcode == 0) {
      this.e.reply(`${res.data.msg}`)
    }
  }

  /** 抽卡资源统计 */
  async Estimate () {
    let api = "https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword="
    let size = "5"/** 条数 */
    let sort_type = "2"/** 排序 */
    let args = ["原石资源统计", 285802042, 1]
    if (/星(琼|铁)/.test(this.e.msg)) {
      args = ["星琼统计汇总", 137101761, [1, 2, 3]]
    }
    if (/绝区(零)|zzz|菲林|邦布/.test(this.e.msg)) {
      args = ["菲林资源统计", 285802042, 1]
    }
    if (/崩坏三|崩三|水晶/.test(this.e.msg)) {
      args = ["水晶统计", 80216695, 0]
    }
    let res = await (await fetch(`${api}${encodeURI(args[0])}&uid=${encodeURI(args[1])}&size=${size}&offset=0&sort_type=${sort_type}`)).json()
    let Estimate = res.data.list[0].post.post.images
    let img = Array.isArray(args[2]) ? await this.getLargestImage(Estimate, args[2]) : Estimate[args[2]]
    if (!img) return
    await this.reply([res.data.list[0].post.post.subject, segment.image(img), new Button(this.e).estimate()])
  }

  async getLargestImage (images = [], indexes = []) {
    let urls = indexes.map(index => ({ url: images[index], index })).filter(item => item.url)
    let candidates = await Promise.all(urls.map(async ({ url, index }) => {
      let size = await this.getImageSize(url)
      return {
        url,
        index,
        area: size ? size.width * size.height : 0
      }
    }))
    candidates = candidates.filter(item => item.area > 0)
    if (!candidates.length) return images[1] || images[0]
    candidates.sort((a, b) => b.area - a.area || a.index - b.index)
    return candidates[0].url
  }

  async getImageSize (url) {
    try {
      let response = await fetch(url)
      if (!response.ok) return false
      let buffer = response.buffer ? await response.buffer() : Buffer.from(await response.arrayBuffer())
      let image = await Jimp.read(buffer)
      return { width: image.bitmap.width, height: image.bitmap.height }
    } catch (error) {
      logger?.warn?.(`[抽卡资源统计] 读取图片尺寸失败: ${url}`)
      return false
    }
  }

  /** 版本汇总 */
  async forward () {
    let gid
    let keywords = ["#前瞻汇总", "#前瞻信息"]
    let currentIndex = 0
    if (/原神/.test(this.e.msg)) {
      gid = 2
    } else if (/崩三|崩坏三|崩坏3/.test(this.e.msg)) {
      gid = 1
      keywords = ["特别节目丨内容回顾"]
    } else if (/星铁/.test(this.e.msg)) {
      gid = 6
    } else if (/绝区零/.test(this.e.msg)) {
      gid = 8
      keywords = [" 前瞻，一站式搞定！"]
    } else {
      gid = 2
    }

    async function trySearch () {
      if (currentIndex >= keywords.length) return null
      this.e.msg = keywords[currentIndex]
      let data = await new MysNews(this.e).mysSearch(gid)
      if (!data && currentIndex < keywords.length - 1) {
        currentIndex++
        return await trySearch.call(this)
      }
      return data
    }
    let data = await trySearch.call(this)
    if (!data) return
    await this.reply(data)
  }

  /** 生日月历 */
  async birthdaymenology () {
    let api = "https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword="
    let size = "5"/** 条数 */
    let sort_type = "2"/** 排序 */
    let args = ["生日会话题", 76387920]
    let res = await (await fetch(`${api}${encodeURI(args[0])}&uid=${encodeURI(args[1])}&size=${size}&offset=0&sort_type=${sort_type}`)).json()
    let Estimate = res.data.list[0].post.post.images
    let img = Estimate[1]
    if (!img) return
    await this.reply([res.data.list[0].post.post.subject, segment.image(img)])
  }
}
