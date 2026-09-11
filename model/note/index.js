import _ from "lodash"
import fs from "node:fs"
import CK from "./cookie.js"
import moment from "moment"
import MysApi from "./mysApi.js"
import Notezzz from "./ZZZero.js"
import { gsCfg, puppeteer, common, base, MysInfo } from "#index"

export default class Note extends base {
  constructor (e) {
    super(e)
    this.model = "dailyNote"
    this.week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
  }

  static async get (e) {
    let note = new Note(e)
    let { cks, sks } = await CK.get(e.user_id)
    if (_.isEmpty(sks)) return e.reply("\n请【#扫码登录】绑定sk", false, { at: true })
    if (_.every(cks, _.isEmpty)) return e.reply("\n请【#扫码登录】绑定ck\n或尝试【#刷新ck】", false, { at: true })
    await e.reply("查询中请稍等...", false, { at: true })
    let sendMsg = []
    e._reply = e.reply
    e.reply = (msg) => { sendMsg.push(msg) }
    let game = ["gs", "sr", "zzz"]
    let promises = []
    for (let g of game) {
      if (!_.isEmpty(cks[g])) {
        if (g !== "zzz") {
          promises.push(note.ddos(cks[g], sks, g))
        } else {
          let img = await Notezzz.get(e, cks)
          if (img) promises.push(...img)
        }
      }
    }
    await Promise.all(promises)
    const { forward } = gsCfg.getConfig("config", "dailyNote")
    if (sendMsg.length > forward) {
      await e._reply(await common.makeForwardMsg(e, sendMsg))
    } else {
      await e._reply(sendMsg, false, { at: true })
    }
  }

  async ddos (cks, sks, game) {
    const { tool } = gsCfg.getConfig("config", "dailyNote")
    for (let i in cks) {
      if (!sks[cks[i].skid] && tool !== 0) {
        this.e.reply(`${game === "gs" ? "原神" : "星铁"}UID:${cks[i].uid}请【#扫码登录】`)
      }
      let sk = sks[cks[i].skid]?.sk || false
      await this.getData(cks[i], sk, game)
    }
  }

  async getData (ck, sk, game) {
    const { tool: cfgTool } = gsCfg.getConfig("config", "dailyNote")
    let res
    let tool = !![1, 2].includes(cfgTool)
    if (tool && sk) {
      res = await this.toolData(ck, sk, game)
      if ((res?.Data?.retcode !== 0 || _.isEmpty(res?.User)) && cfgTool === 2) {
        tool = false
        res = await this.noteData(ck, game)
        if (res?.Data?.retcode !== 0 || (_.isEmpty(res?.User) && game === "sr")) return false
      } else if ((res?.Data?.retcode !== 0 || _.isEmpty(res?.User)) && cfgTool === 1) {
        return false
      }
    } else {
      tool = false
      res = await this.noteData(ck, game)
      if (res?.Data?.retcode !== 0 || (_.isEmpty(res?.User) && game === "sr")) return false
    }
    let data = game === "sr" ? await this.noteSr(res.Data, ck.uid) : await this.notegs(res.Data, ck.uid, tool)
    this.e.isSr = game === "sr"
    let tempFile = this.e.isSr ? "StarRail" : "Genshin"
    data = {
      ...this.screenData,
      ...data,
      ...res.User,
      tool,
      dayMb2: moment(new Date()).format("yyyy年MM月DD日 HH:mm") + " " + this.week[new Date().getDay()],
      day: moment().format("MM-DD HH:mm") + " " + this.week[moment().day()],
      tplFile: `./plugins/genshin/resources/${tempFile}/html/dailyNote/dailyNote.html`,
      saveId: this.getSeed_id()
    }
    let img = await puppeteer.screenshot(`${tempFile}dailyNote`, data)
    if (img) return await this.e.reply(img)
  }

  async noteData (ck, game) {
    let mysApi = new MysApi(ck.uid, ck.ck, {}, game)
    let resUser = {}
    let Data = await mysApi.getData("DailyNote")
    Data = await new MysInfo(this.e).checkCode(Data, "DailyNote", mysApi, {}, true)
    if (Data?.retcode !== 0) return false
    if (mysApi.game === "sr") {
      resUser = await mysApi.getData("UserGame")
      resUser = await new MysInfo(this.e).checkCode(resUser, "UserGame", mysApi, {}, true)
      if (resUser?.retcode !== 0) return false
    }
    return { Data, User: resUser?.data || {} }
  }

  async toolData (ck, sk, game, task = false) {
    let mysApi = new MysApi(ck.uid, sk, {}, game)
    if (!sk) this.e.reply(`${game === "gs" ? "原神" : "星铁"}UID:${ck.uid}请【#扫码登录】`)
    let User = await this.getGameDate(ck, sk, game === "sr" ? "hkrpg_cn" : "hk4e_cn")
    let Data = await mysApi.getData("Widget")
    if (!task) Data = await new MysInfo(this.e).checkCode(Data, "Widget", mysApi, {}, true)
    if (User.main) {
      let retry = 0
      let ret = await this.changeGame(ck, sk, User.main)
      while (ret?.retcode === 1003 && retry < 3) {
        ret = await this.changeGame(ck, sk, User.main)
        retry++
      }
    }
    if ([-1, -100, 1001, 10001, 10103].includes(Data?.retcode)) {
      this.e.reply(`${game === "gs" ? "原神" : "星铁"}UID:${ck.uid}请【#扫码登录】`)
    }
    return { Data, User: User.data }
  }

  async getGameDate (ck, sk, game) {
    let main = {}
    let list = []
    let mysApi = new MysApi(ck.uid, sk)
    let res = await mysApi.getData("User")
    if (res?.retcode === 0 && res?.data?.list?.length > 0) {
      for (let i of res.data.list) {
        if (i.game_biz === game) list.push(i)
      }
      if (list?.length > 0) {
        for (let data of list) {
          if (!data.is_chosen && data.game_uid === ck.uid && list?.length > 1) {
            for (let i of list) {
              if (i.is_chosen && i.game_biz === game) main = i
            }
            if (_.isEmpty(main) || !await this.changeGame(ck, sk, data)) {
              logger.error("切换小组件角色失败，若无显示问题请忽略")
              return { data }
            }
            return { data, main }
          } else if ((data.is_chosen && data.game_uid === ck.uid) || list?.length === 1) {
            return { data }
          }
        }
      }
    }
    return {}
  }

  async changeGame (ck, sk, data) {
    await common.sleep(_.random(200, 500))
    let mysApi = new MysApi(ck.uid, sk)
    let ret = await mysApi.getData("GetActionTicket", { ltuid: ck.ltuid })
    if (!ret?.data?.ticket) return false
    mysApi.cookie = ck.ck
    await common.sleep(_.random(1000, 1500))
    return await mysApi.getData("ChangeGameRole", {
      action_ticket: ret.data.ticket,
      game_biz: data.game_biz,
      game_uid: data.game_uid,
      region: data.region
    })
  }

  async noteSr (res, uid) {
    let { data } = res
    let date = moment().format("MM-DD HH:mm 星期") + ["日", "一", "二", "三", "四", "五", "六"][moment().day()]
    const _path = process.cwd() + "/plugins/genshin/resources/Mys/img/face"
    let filesr = `${_path}/sr/`
    let numbersr = Math.floor(Math.random() * (80 - 1) + 1)
    let sr = filesr + numbersr.toString() + ".png"
    const _path1 = process.cwd() + "/plugins/genshin/resources/Mys/img/face"
    let filemys = `${_path1}/mys/`
    let numbermys = Math.floor(Math.random() * (65 - 1) + 1)
    let mys = filemys + numbermys.toString() + ".png"
    let resinMaxTime
    let resinMaxTime2
    let resinMaxTimeMb2
    let resinMaxTimeMb2Day
    if (data.stamina_recover_time > 0) {
      let d = moment.duration(data.stamina_recover_time, "seconds")
      let day = Math.floor(d.asDays())
      let hours = d.hours()
      let minutes = d.minutes()
      let seconds = d.seconds()
      resinMaxTime = hours + "小时" + minutes + "分钟" + seconds + "秒"
      if (day > 0) {
        resinMaxTime = day + "天" + hours + "小时" + minutes + "分钟" + seconds + "秒"
      } else if (hours > 0) {
        resinMaxTime = hours + "小时" + minutes + "分钟" + seconds + "秒"
      } else if (minutes > 0) {
        resinMaxTime = minutes + "分钟" + seconds + "秒"
      } else if (seconds > 0) {
        resinMaxTime = seconds + "秒"
      }
      if ((day > 0) || (hours > 0) || (seconds > 0)) {
        let totalseconds = 3600 * hours + 60 * minutes + seconds
        const now = new Date()
        const dateTimes = now.getTime() + totalseconds * 1000
        const date = new Date(dateTimes)
        const dayDiff = date.getDate() - now.getDate()
        const str = dayDiff === 0 ? "今日" : "明日"
        const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
        let recoverTimeStr = ` | [${str}]${timeStr}`
        resinMaxTime += recoverTimeStr
      }
      resinMaxTime2 = new Date().getTime() + data.stamina_recover_time * 1000
      let maxDate = new Date(resinMaxTime2)
      resinMaxTime2 = moment(maxDate).format("HH:mm")
      let timeDay = await this.dateTime_(maxDate)
      resinMaxTimeMb2 = timeDay + moment(maxDate).format("hh:mm")
      if (moment(maxDate).format("DD") !== moment(new Date()).format("DD")) {
        resinMaxTimeMb2Day = "明天"
        resinMaxTime2 = `明天 ${resinMaxTime2}`
      } else {
        resinMaxTimeMb2Day = "今天"
        resinMaxTime2 = ` ${resinMaxTime2}`
      }
    }
    data.bfStamina = data.current_stamina / data.max_stamina * 100 + "%"
    for (let item of data.expeditions) {
      let d = moment.duration(item.remaining_time, "seconds")
      let day = Math.floor(d.asDays())
      let hours = d.hours()
      let minutes = d.minutes()
      item.dateTime = ([day + "天", hours + "时", minutes + "分"].filter(v => !["0天", "0时", "0分"].includes(v))).join("")
      item.bfTime = (72000 - item.remaining_time) / 72000 * 100 + "%"
      if (item.avatars.length === 1) item.avatars.push("派遣头像")
    }
    const metaSrPath = `${this._path}/plugins/miao-plugin/resources/meta-sr/character/`
    const folders = fs.readdirSync(metaSrPath).filter(folder => !folder.includes(".") && folder !== "common")
    const randomFolder = folders[Math.floor(Math.random() * folders.length)]
    let icon = `${metaSrPath}${randomFolder}/imgs/face.webp`
    data.accepted_expedition_num = data.accepted_expedition_num || data.accepted_epedition_num || 0
    data.current_reserve_stamina = data.current_reserve_stamina || 0
    return {
      uid,
      icon,
      resinMaxTime,
      nowDay: moment(new Date()).format("YYYY年MM月DD日"),
      dayMb2: moment(new Date()).format("yyyy年MM月DD日 HH:mm") + " " + this.week[new Date().getDay()],
      date,
      imgType: "png",
      omitBackground: true,
      day: moment().format("MM-DD HH:mm") + " " + this.week[moment().day()],
      星铁: sr,
      米游社星铁: mys,
      resinMaxTime2,
      resinMaxTimeMb2,
      resinMaxTimeMb2Day,
      ...data
    }
  }

  async notegs (res, uid, tool) {
    let { data } = res
    let date = moment().format("MM-DD HH:mm 星期") + ["日", "一", "二", "三", "四", "五", "六"][moment().day()]
    const _path = process.cwd() + "/plugins/genshin/resources/Mys/img/face"
    let filegs = `${_path}/gs/`
    let numbergs = Math.floor(Math.random() * (128 - 1) + 1)
    let gs = filegs + numbergs.toString() + ".png"
    const _path1 = process.cwd() + "/plugins/genshin/resources/Mys/img/face"
    let filemys = `${_path1}/mys/`
    let numbermys = Math.floor(Math.random() * (65 - 1) + 1)
    let mys1 = filemys + numbermys.toString() + ".png"
    let resinMaxTime
    let nowDay = moment().date()
    let nowUnix = Number(moment().format("X"))
    if (data.resin_recovery_time > 0) {
      resinMaxTime = nowUnix + Number(data.resin_recovery_time)
      let maxDate = moment.unix(resinMaxTime)
      resinMaxTime = maxDate.format("HH:mm")
      if (maxDate.date() != nowDay) {
        resinMaxTime = `明天 ${resinMaxTime}`
      } else {
        resinMaxTime = `今天 ${resinMaxTime}`
      }
    }
    let remainedTime = ""
    for (let val of data.expeditions) {
      if (String(val.status) === "Finished") {
        val.percentage = 100
      } else {
        val.percentage = 50
      }
    }
    if (tool) {
      if (data.expeditions && data.expeditions.length >= 1) {
        remainedTime = _.map(data.expeditions, "remained_time")
        remainedTime = _.min(remainedTime)
        if (remainedTime > 0) {
          remainedTime = moment().unix() + Number(remainedTime)
          let remainedDate = moment.unix(remainedTime)
          remainedTime = remainedDate.format("HH:mm")
          if (remainedDate.date() != nowDay) {
            remainedTime = `明天 ${remainedTime}`
          } else {
            remainedTime = ` ${remainedTime}`
          }
        }
      }
    }
    let coinTime = ""
    let coinTimeMb2 = ""
    let coinTimeMb2Day = ""
    let chnNumChar = ["零", "明", "后", "三", "四", "五", "六", "七", "八", "九"]
    if (!data.home_coin_recovery_time && data.current_home_coin < data.max_home_coin) {
      data.home_coin_recovery_time = (data.max_home_coin - data.current_home_coin) / 30 * 3600
    }
    if (data.home_coin_recovery_time > 0) {
      let coinDate = new Date(new Date().getTime() + data.home_coin_recovery_time * 1000)
      let coinDay = Math.floor(data.home_coin_recovery_time / 3600 / 24)
      let coinHour = Math.floor((data.home_coin_recovery_time / 3600) % 24)
      let coinMin = Math.floor((data.home_coin_recovery_time / 60) % 60)
      if (coinDay > 0) {
        coinTime = `${coinDay}天${coinHour}小时${coinMin}分钟`
        let dayTime = (24 - moment(new Date()).format("HH") + moment(coinDate).diff(new Date(), "hours")) / 24
        coinTimeMb2Day = chnNumChar[dayTime.toFixed(0)] + "天"
        let timeDay = await this.dateTime_(coinDate)
        coinTimeMb2 = timeDay + moment(coinDate).format("hh:mm")
      } else {
        coinTimeMb2 = moment(coinDate).format("hh:mm")
        if (moment(coinDate).format("DD") !== nowDay) {
          coinTimeMb2Day = "明天"
          coinTime = `明天 ${moment(coinDate).format("hh:mm")}`
        } else {
          coinTimeMb2Day = "今天"
          coinTime = moment(coinDate).format("hh:mm", coinDate)
        }
      }
    }
    if (data?.transformer?.obtained) {
      data.transformer.reached = data.transformer.recovery_time.reached
      let recoveryTime = ""
      if (data.transformer.recovery_time.Day > 0) recoveryTime += `${data.transformer.recovery_time.Day}天`
      if (data.transformer.recovery_time.Hour > 0) recoveryTime += `${data.transformer.recovery_time.Hour}小时`
      if (data.transformer.recovery_time.Minute > 0) recoveryTime += `${data.transformer.recovery_time.Minute}分钟`
      data.transformer.recovery_time = recoveryTime
    }
    return {
      uid,
      date,
      resinMaxTime,
      imgType: "png",
      omitBackground: true,
      ...data,
      原神: gs,
      米游社原神: mys1
    }
  }

  async dateTime_ (time) {
    return moment(time).format("HH") < 6
      ? "凌晨"
      : moment(time).format("HH") < 12
        ? "上午"
        : moment(time).format("HH") < 17.5
          ? "下午"
          : moment(time).format("HH") < 19.5
            ? "傍晚"
            : moment(time).format("HH") < 22
              ? "晚上"
              : "深夜"
  }

  getSeed_id (length = 5) {
    const characters = "0123456789abcdef"
    let result = ""
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)]
    }
    return result
  }
}
