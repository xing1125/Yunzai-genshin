import _ from "lodash"
import moment from "moment"
import MysApi from "./mysApi.js"
import { common, base, MysInfo, Common } from "#index"

export default class Note extends base {
  constructor (e) {
    super(e)
    this.model = "dailyNote"
    this.week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
  }

  static async get (e, cks) {
    let note = new Note(e)
    let game = "zzz"
    let promises = []
    promises.push(note.ddos(cks[game], game))
    await Promise.all(promises)

    return promises
  }

  async ddos (cks, game) {
    for (let i in cks) {
      await this.getData(cks[i], game)
    }
  }

  async getData (ck, game) {
    let res = await this.noteData(ck, game)
    if (res?.Data?.retcode !== 0 || (_.isEmpty(res?.Sign))) return false
    this.e.isZzz = game === "zzz" ? true : false
    this.e.game = "zzz"
    this.e.uid = ck.uid
    let e = this.e
    let data = await this.noteZzz(res.Data, ck.uid)
    data = {
      ...this.screenData,
      ...data,
      ...res.Sign
    }
    return await Common.render("genshin", "ZZZero/html/dailyNote/dailyNote", data, { e })
  }

  async noteData (ck, game) {
    let mysApi = new MysApi(ck.uid, ck.ck, {}, game)
    let device_fp = await mysApi.getData('getFp')
    device_fp = await new MysInfo(this.e).checkCode(device_fp, 'getFp', mysApi, {}, true)
    if (device_fp?.retcode !== 0) return false
    let headers = { 'x-rpc-device_fp': device_fp?.data?.device_fp }
    await common.sleep(200)
    let Data = await mysApi.getData("dailyNote", { headers })
    Data = await new MysInfo(this.e).checkCode(Data, "dailyNote", mysApi, {}, true)
    if (Data?.retcode !== 0) return false
    await common.sleep(200)
    let signInfo = await mysApi.getData("sign_info")
    signInfo = await new MysInfo(this.e).checkCode(signInfo, "sign_info", mysApi, {}, true)
    if (signInfo?.retcode !== 0) return false
    await common.sleep(200)
    return { Data, Sign: signInfo?.data || {} }
  }

  async noteZzz(res, uid) {
    let { data } = res
    const ImgData = {}
    const nowDay = moment(new Date()).format('DD')
    if (data.energy.restore > 0) {
      let resinMaxTime = new Date().getTime() + data.energy.restore * 1000
      let maxDate = new Date(resinMaxTime)
      resinMaxTime = moment(maxDate).format('HH:mm')
      let timeDay = await this.dateTime_(maxDate)
      ImgData.resinMaxTimeMb2 = timeDay + moment(maxDate).format('hh:mm')
      if (moment(maxDate).format('DD') !== nowDay) {
        ImgData.resinMaxTimeMb2Day = '明天'
        resinMaxTime = `明天 ${resinMaxTime}`
      } else {
        ImgData.resinMaxTimeMb2Day = '今天'
        resinMaxTime = ` ${resinMaxTime}`
      }
      ImgData.resinMaxTime = resinMaxTime
    }
    ImgData.sale_state = /Doing/.test(data.vhs_sale.sale_state) ? '正在营业' : '未营业'
    ImgData.card = /Done/.test(data.card_sign) ? '已完成' : '未完成'

    return {
      uid: uid,
      saveId: this.getSeed_id(),
      name: this.e.sender.card,
      dayMb2: moment(new Date()).format('yyyy年MM月DD日 HH:mm') + ' ' + this.week[new Date().getDay()],
      ...ImgData,
      ...data
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