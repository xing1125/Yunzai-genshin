import { base } from "#index"
import fetch from "node-fetch"
import moment from "moment"

function getMonthPaymentSignature (item = {}) {
  const ym = Number(item.ym || 0)
  const month = ym ? ym % 100 : (parseInt(String(item.month || "").replace(/\D/g, "")) || 0)
  const payNum = Array.isArray(item.payNum) ? item.payNum.map(v => Number(v || 0)).join(",") : ""
  return `${month}|${payNum}|${Number(item.otherAmount || 0)}`
}

/** 移除已有年月记录对应的旧格式重复月份，保留无法匹配的历史数据 */
export function normalizePayMonthData (monthData = []) {
  if (!Array.isArray(monthData)) return []
  const datedSignatures = new Set(
    monthData
      .filter(item => item && item.ym !== undefined && item.ym !== null && item.ym !== "")
      .map(getMonthPaymentSignature)
  )
  return monthData.filter(item => {
    if (!item) return false
    const hasYm = item.ym !== undefined && item.ym !== null && item.ym !== ""
    return hasYm || !datedSignatures.has(getMonthPaymentSignature(item))
  })
}

export class PayData {
  constructor (authKey = "", uid = "") {
    this.#authkey = encodeURIComponent(authKey)
    this.#uid = uid
  }

  #uid = ""
  #rawList = []
  #authkey = ""

  async getOriginalData () {
    const url = this.getUrl()
    const res = await fetch(url, this.headers)
    const ret = await res.json()
    const check = this.checkResult(ret)
    if (check?.errorMsg) return check
    const list = ret?.data?.list
    if (!Array.isArray(list)) {
      return { errorMsg: "获取失败，错误码：" + (ret?.retcode ?? "未知") }
    }
    this.#rawList = list
    this.#uid = list?.[0]?.uid || ""
    return true
  }

  checkResult (ret) {
    if (ret?.retcode === -101 || ret?.retcode === -100) {
      return ret.retcode === -101 ? { errorMsg: "您的链接过期，请重新获取" } : { errorMsg: "链接不正确，请重新获取" }
    }
    if (/unknown auth appid/.test(ret?.message)) {
      return { errorMsg: "链接无效，请发送原神客服页面链接！" }
    }
    return { errorMsg: "" }
  }

  async filtrateData () {
    const ok = await this.getOriginalData()
    if (ok?.errorMsg) return ok
    if (this.#rawList.length === 0) {
      return { errorMsg: "未获取到您的任何充值数据" }
    }
    this.#rawList = this.#rawList.sort((a, b) => {
      const v1 = Number(a.id)
      const v2 = Number(b.id)
      return v2 > v1 ? -1 : 1
    })
    const price = [680, 300, 8080, 3880, 2240, 1090, 330, 60]
    const doublePrice = [0, 0, 12960, 6560, 3960, 1960, 600, 120]
    let sumCrystal = 0
    const monthMap = new Map()
    for (let idx = 0; idx < this.#rawList.length; idx++) {
      const record = this.#rawList[idx]
      const num = Number(record.add_num || record.num)
      if (num < 0) continue
      const date = moment(record.time || record.datetime)
      const year = date.year()
      const thisMonth = date.month() + 1
      const monthKey = `${year}年${thisMonth}月`
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthKey, payNum: [0, 0, 0, 0, 0, 0, 0, 0] })
      }
      const currentMonth = monthMap.get(monthKey)
      if (num === 300) {
        const index = (record.reason === "购买空月祝福获取" || record.type === "购买空月祝福") ? 1 : 6
        currentMonth.payNum[index]++
        sumCrystal += num
        continue
      }
      for (let j = 0; j < 8; j++) {
        if (num === price[j] || num === doublePrice[j]) {
          currentMonth.payNum[j]++
          if (num !== 680) sumCrystal += num
          break
        }
      }
    }
    // 将 Map 转换为数组，并按月份排序
    const sorted = Array.from(monthMap.values()).sort((a, b) => {
      const [yearA, monthA] = a.month.match(/(\d+)年(\d+)月/).slice(1).map(Number)
      const [yearB, monthB] = b.month.match(/(\d+)年(\d+)月/).slice(1).map(Number)
      if (yearA !== yearB) return yearA - yearB
      return monthA - monthB
    })
    const list = sorted.map(item => {
      const matched = item.month.match(/(\d+)年(\d+)月/)
      const y = matched ? Number(matched[1]) : 0
      const m = matched ? Number(matched[2]) : 0
      return {
        ym: y * 100 + m,
        month: m + "月",
        payNum: item.payNum
      }
    })
    let battlePassData = []
    try {
      const battlePath = await this.getGsBattlePathList()
      if (Array.isArray(battlePath)) {
        battlePassData = battlePath.map(bp => ({
          time: bp.datetime,
          type: /纪行/.test(bp.battle_path_type) ? "珍珠纪行" : "珍珠之歌",
          price: /纪行/.test(bp.battle_path_type) ? 68 : 128
        }))
      }
    } catch (err) {
    }
    return {
      uid: this.#uid,
      crystal: sumCrystal,
      monthData: list,
      battlePassData
    }
  }

  headers = {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site"
    },
    referrer: "https://webstatic.mihoyo.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
    method: "GET",
    mode: "cors",
    credentials: "include"
  }

  getUrl () {
    const baseUrl = "https://hk4e-api.mihoyo.com/common/hk4e_self_help_query/User"
    let params = ""
    params += "?selfquery_type=1"
    params += "&sign_type=2"
    params += "&auth_appid=csc"
    params += "&authkey_ver=1"
    params += "&game_biz=hk4e_cn"
    params += "&win_direction=portrait"
    params += "&bbs_auth_required=true"
    params += "&bbs_game_role_required=hk4e_cn"
    params += "&app_client=bbs"
    params += "&lang=zh-cn"
    params += "&csc_authkey_required=true"
    params += "&authkey=" + this.#authkey
    params += "&page_id=1"
    params += "&add_type=produce"
    params += "&size=100000"
    params += "&end_id="
    return baseUrl + "/GetCrystalLog" + params
  }

  // 获取原神纪行/珍珠之歌购买记录
  async getGsBattlePathList () {
    const url = this.getGsBattlePathUrl()
    const res = await fetch(url, this.headers)
    const ret = await res.json()
    const check = this.checkResult(ret)
    if (check?.errorMsg) return []
    return ret?.data?.list || []
  }

  getGsBattlePathUrl () {
    const baseUrl = "https://public-operation-hk4e.mihoyo.com/common/hk4e_self_help_query/User/GetBattlePath"
    let params = ""
    params += "?sign_type=2"
    params += "&authkey_ver=1"
    params += "&game_biz=hk4e_cn"
    params += "&lang=zh-cn"
    params += "&authkey=" + this.#authkey
    params += "&size=100000"
    return baseUrl + params
  }
}

export class SrPayData {
  constructor (authKey = "", uid = "") {
    this.#authkey = encodeURIComponent(authKey)
    this.#uid = uid
  }

  #uid = ""
  #rawList = []
  #authkey = ""

  async getOriginalData () {
    const url = this.getUrl()
    const res = await fetch(url, this.headers)
    const ret = await res.json()
    const check = this.checkResult(ret)
    if (check?.errorMsg) return check
    const list = ret?.data?.list
    if (!Array.isArray(list)) {
      return { errorMsg: "获取失败，错误码：" + (ret?.retcode ?? "未知") }
    }
    this.#rawList = list
    this.#uid = list?.[0]?.uid || ""
    return true
  }

  checkResult (ret) {
    if (ret?.retcode === -101 || ret?.retcode === -100) {
      return ret.retcode === -101 ? { errorMsg: "您的链接过期，请重新获取" } : { errorMsg: "链接不正确，请重新获取" }
    }
    if (/unknown auth appid/.test(ret?.message)) {
      return { errorMsg: "链接无效，请发送星铁客服页面链接！" }
    }
    return { errorMsg: "" }
  }

  async filtrateData () {
    const ok = await this.getOriginalData()
    if (ok?.errorMsg) return ok
    if (this.#rawList.length === 0) {
      return { errorMsg: "未获取到您的任何充值数据" }
    }
    this.#rawList = this.#rawList.sort((a, b) => {
      const v1 = Number(a.id)
      const v2 = Number(b.id)
      return v2 > v1 ? -1 : 1
    })
    const price = [680, 300, 8080, 3880, 2240, 1090, 330, 60]
    const doublePrice = [0, 0, 12960, 6560, 3960, 1960, 600, 120]
    let sumCrystal = 0
    const monthMap = new Map()
    for (let idx = 0; idx < this.#rawList.length; idx++) {
      const record = this.#rawList[idx]
      const num = Number(record.add_num || record.num)
      if (num < 0) continue
      const date = moment(record.time || record.datetime)
      const year = date.year()
      const thisMonth = date.month() + 1
      const monthKey = `${year}年${thisMonth}月`
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthKey, payNum: [0, 0, 0, 0, 0, 0, 0, 0] })
      }
      const currentMonth = monthMap.get(monthKey)
      if (num === 300) {
        const index = record.action === "列车补给购买" ? 1 : 6
        currentMonth.payNum[index]++
        sumCrystal += num
        continue
      }
      for (let j = 0; j < 8; j++) {
        if (num === price[j] || num === doublePrice[j]) {
          currentMonth.payNum[j]++
          if (num !== 680) sumCrystal += num
          break
        }
      }
    }
    const sorted = Array.from(monthMap.values()).sort((a, b) => {
      const [yearA, monthA] = a.month.match(/(\d+)年(\d+)月/).slice(1).map(Number)
      const [yearB, monthB] = b.month.match(/(\d+)年(\d+)月/).slice(1).map(Number)
      if (yearA !== yearB) return yearA - yearB
      return monthA - monthB
    })
    const list = sorted.map(item => {
      const matched = item.month.match(/(\d+)年(\d+)月/)
      const y = matched ? Number(matched[1]) : 0
      const m = matched ? Number(matched[2]) : 0
      return {
        ym: y * 100 + m,
        month: m + "月",
        payNum: item.payNum
      }
    })
    let battlePassData = []
    try {
      const battlePass = await this.getSrBattlePassList()
      if (Array.isArray(battlePass)) {
        battlePassData = battlePass.map(bp => ({
          time: bp.time,
          type: /荣勋/.test(bp.buy_play_name) ? "无名荣勋" : "无名奖章",
          price: /荣勋/.test(bp.buy_play_name) ? 68 : 128
        }))
      }
    } catch (err) {
    }
    return {
      uid: this.#uid,
      crystal: sumCrystal,
      monthData: list,
      battlePassData
    }
  }

  headers = {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site"
    },
    referrer: "https://webstatic.mihoyo.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
    method: "GET",
    mode: "cors",
    credentials: "include"
  }

  getUrl () {
    const baseUrl = "https://public-operation-hkrpg.mihoyo.com/common/hkrpg_self_help_inquiry/Dreams/GetList"
    let params = ""
    params += "?sign_type=2"
    params += "&authkey_ver=1"
    params += "&page_id=4"
    params += "&game_biz=hkrpg_cn"
    params += "&authkey=" + this.#authkey
    params += "&add_type=produce"
    params += "&size=100000"
    return baseUrl + params
  }

  async getSrBattlePassList () {
    const url = this.getSrBattlePassUrl()
    const res = await fetch(url, this.headers)
    const ret = await res.json()
    const check = this.checkResult(ret)
    if (check?.errorMsg) return []
    return ret?.data?.list || []
  }

  getSrBattlePassUrl () {
    const baseUrl = "https://public-operation-hkrpg.mihoyo.com/common/hkrpg_self_help_inquiry/BattleBass/GetList"
    let params = ""
    params += "?sign_type=2"
    params += "&authkey_ver=1"
    params += "&bbs_game_role_required=hkrpg_cn"
    params += "&app_client=bbs"
    params += "&game_biz=hkrpg_cn"
    params += "&authkey=" + this.#authkey
    params += "&size=100000"
    return baseUrl + params
  }
}

export class HtmlData extends base {
  constructor (data = {}, game = "gs") {
    super({ uid: data.uid || "" })
    this.monthData = normalizePayMonthData(data.monthData)
    this.crystal = data.crystal || 0
    this.uid = data.uid || ""
    this.game = game
    this.battlePassData = data.battlePassData || []
    this.otherStats = data.otherStats || {}
    this.e = { uid: this.uid }
  }

  crystal = 0
  uid = ""
  monthData = []
  battlePassData = []

  /** 价格 */
  get price () {
    if (this.game === "sr") {
      return [68, 30, 648, 328, 198, 98, 30, 6]
    } else {
      return [68, 30, 648, 328, 198, 98, 30, 6]
    }
  }

  get labels () {
    if (this.game === "sr") {
      return ["68", "小月卡", "648", "328", "198", "98", "30", "6"]
    } else {
      return ["68", "小月卡", "648", "328", "198", "98", "30", "6"]
    }
  }

  getBarData () {
    const monthlyData = new Map()
    this.monthData.forEach((v, index) => {
      const ym = Number(v.ym || 0)
      const normalSales = v.payNum.reduce((sum, val, index) => sum + val * this.price[index], 0)
      const otherSales = v.otherAmount || 0
      const sales = normalSales + otherSales
      if (sales <= 0) return
      const key = ym || `legacy-${index}`
      monthlyData.set(key, { type: v.month || "", sales, ym, order: index })
    })
    this.battlePassData.forEach(bp => {
      const d = moment(bp.time)
      const ym = d.year() * 100 + (d.month() + 1)
      const existed = monthlyData.get(ym) || { type: "", sales: 0, ym }
      const count = bp.count || 1
      monthlyData.set(ym, { type: "", sales: existed.sales + (bp.price || 0) * count, ym })
    })
    const allData = Array.from(monthlyData.values())
      .filter(v => v.sales > 0)
      .sort((a, b) => {
        if (a.ym && b.ym) return a.ym - b.ym
        if (a.ym) return -1
        if (b.ym) return 1
        return a.order - b.order
      })
      .map(v => {
        let type, typeWithYear
        if (v.ym) {
          const year = Math.floor(v.ym / 100)
          const month = v.ym % 100
          type = `${month}月`
          typeWithYear = `${String(year).slice(-2)}年${month}月`
        } else {
          type = v.type || "未知月份"
          typeWithYear = type
        }
        const monthNum = v.ym ? v.ym % 100 : (parseInt(String(v.type).replace(/\D/g, "")) || 0)
        return {
          type,
          typeWithYear,
          sales: v.sales,
          monthNum
        }
      })

    return allData
  }

  getTopData (crystal = 0) {
    const maxMonth = this.maxcConsumption()
    const detailData = this.sumConsumption()
    const totalAmount = detailData.reduce((sum, item) => sum + this.getConsumptionAmount(item), 0)
    return [
      {
        title: "总消费",
        value: "￥" + totalAmount
      },
      {
        title: this.game === "sr" ? "总梦华" : (this.game === "zzz" ? "总菲林" : "总结晶"),
        value: this.crystal
      },
      {
        title: "消费最多",
        value: maxMonth.typeWithYear || maxMonth.type
      },
      {
        title: (maxMonth.typeWithYear || maxMonth.type) + "消费",
        value: "￥" + maxMonth.sales
      }
    ]
  }

  getDetailData () {
    return this.sumConsumption()
  }

  getPieData () {
    const data = this.sumConsumption()
    let pieData = []
    data.forEach((val) => {
      const value = this.getConsumptionAmount(val)
      if (value) {
        pieData.push({
          value,
          name: val.title,
          count: val.value
        })
      }
    })
    return pieData
  }

  /** 将消费项目统一换算为实际金额 */
  getConsumptionAmount (item = {}) {
    const title = String(item.title || "")
    const count = Number(item.value || 0)
    if (title.includes("成长计划") || title.includes("纪行") || title.includes("荣勋")) {
      return count * 68
    }
    if (title.includes("典藏计划") || title.includes("之歌") || title.includes("奖章")) {
      return count * 128
    }
    if (title === "其他" && this.otherStats?.["其他"]) {
      return Number(this.otherStats["其他"].total || 0)
    }
    const labelIndex = this.labels.indexOf(title)
    if (labelIndex === -1 || labelIndex >= this.price.length) return 0
    return count * this.price[labelIndex]
  }

  /** 消费最多月 */
  maxcConsumption () {
    return this.getBarData().sort((a, b) => {
      if (a.sales < b.sales) {
        return 1
      } else {
        return -1
      }
    })[0]
  }

  /** 每种消费的总数 */
  sumConsumption () {
    const labels = this.labels
    let sum = {}
    labels.forEach(label => {
      sum[label] = 0
    })
    this.monthData.forEach(val => {
      val.payNum.forEach((v, i) => {
        if (i < labels.length) {
          sum[labels[i]] += v
        }
      })
    })
    let battlePassStats = {}
    this.battlePassData.forEach(bp => {
      if (battlePassStats[bp.type]) {
        battlePassStats[bp.type] += bp.count || 1
      } else {
        battlePassStats[bp.type] = bp.count || 1
      }
    })
    let otherStats = this.otherStats || {}
    Object.entries(otherStats).forEach(([type, stats]) => {
      if (!type.includes("成长计划") && !type.includes("典藏计划")) {
        if (battlePassStats[type]) {
          battlePassStats[type] += stats.count
        } else {
          battlePassStats[type] = stats.count
        }
      }
    })
    let result = []
    Object.keys(sum).forEach(key => {
      if (sum[key] > 0) {
        result.push({
          title: key,
          value: sum[key]
        })
      }
    })
    Object.keys(battlePassStats).forEach(key => {
      if (battlePassStats[key] > 0) {
        result.push({
          title: key,
          value: battlePassStats[key]
        })
      }
    })
    return result
  }
}

export class ZzzPayData {
  constructor (authKey = "", uid = "") {
    this.#authkey = encodeURIComponent(authKey)
    this.#uid = uid
  }

  #uid = ""
  #rawList = []
  #battlePassList = []
  #authkey = ""

  async getOriginalData () {
    const url = this.getUrl()
    const res = await fetch(url, this.headers)
    const ret = await res.json()
    const check = this.checkResult(ret)
    if (check?.errorMsg) return check
    const list = ret?.data?.list
    if (!Array.isArray(list)) {
      return { errorMsg: "获取失败，错误码：" + (ret?.retcode ?? "未知") }
    }
    this.#rawList = list
    this.#uid = list?.[0]?.uid || ""
    return true
  }

  async getBattlePassData () {
    const url = this.getBattlePassUrl()
    const res = await fetch(url, this.headers)
    const ret = await res.json()
    const check = this.checkResult(ret)
    if (check?.errorMsg) return []
    this.#battlePassList = ret?.data?.list || []
    return true
  }

  checkResult (ret) {
    if (ret?.retcode === -101 || ret?.retcode === -100) {
      return ret.retcode === -101 ? { errorMsg: "您的链接过期，请重新获取" } : { errorMsg: "链接不正确，请重新获取" }
    }
    if (/unknown auth appid/.test(ret?.message)) {
      return { errorMsg: "链接无效，请发送绝区零客服页面链接！" }
    }
    return { errorMsg: "" }
  }

  async filtrateData () {
    const ok = await this.getOriginalData()
    if (ok?.errorMsg) return ok
    await this.getBattlePassData()
    if (this.#rawList.length === 0) {
      return { errorMsg: "未获取到您的任何充值数据" }
    }
    this.#rawList = this.#rawList.sort((a, b) => {
      const v1 = Number(a.id)
      const v2 = Number(b.id)
      return v2 > v1 ? -1 : 1
    })
    const price = [680, 300, 8080, 3880, 2240, 1090, 330, 60]
    const doublePrice = [0, 0, 12960, 6560, 3960, 1960, 600, 120]
    let sumCrystal = 0
    const monthMap = new Map()
    let otherStats = {}
    for (let idx = 0; idx < this.#rawList.length; idx++) {
      const record = this.#rawList[idx]
      const num = Number(record.add_num || record.num)
      if (num < 0) continue
      const date = moment(record.time || record.datetime)
      const year = date.year()
      const thisMonth = date.month() + 1
      const monthKey = `${year}年${thisMonth}月`
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthKey, payNum: [0, 0, 0, 0, 0, 0, 0, 0] })
      }
      const currentMonth = monthMap.get(monthKey)
      // 处理小月卡
      if (record.reason === "绳网会员购买") {
        currentMonth.payNum[1]++
        sumCrystal += num
        continue
      }
      // 处理其他类型的充值
      if (record.reason === "其他") {
        // 计算实际消费金额
        const realPrice = Math.floor(num / 10)
        const type = "其他"
        if (!otherStats[type]) {
          otherStats[type] = {
            count: 0,
            price: 0,
            total: 0
          }
        }
        otherStats[type].count++
        otherStats[type].total += realPrice
        sumCrystal += num
        // 将其他类型的充值也添加到月度统计中
        const recordDate = moment(record.datetime)
        const monthKey = `${recordDate.year()}年${recordDate.month() + 1}月`
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            month: monthKey,
            payNum: [0, 0, 0, 0, 0, 0, 0, 0],
            otherAmount: 0,
            ym: recordDate.year() * 100 + (recordDate.month() + 1)
          })
        }
        const currentMonth = monthMap.get(monthKey)
        currentMonth.otherAmount = (currentMonth.otherAmount || 0) + realPrice
        continue
      }
      // 处理普通充值档位
      for (let j = 0; j < 8; j++) {
        if (num === price[j] || num === doublePrice[j]) {
          currentMonth.payNum[j]++
          if (num !== 680) sumCrystal += num
          break
        }
      }
    }
    const sorted = Array.from(monthMap.values()).sort((a, b) => {
      const [yearA, monthA] = a.month.match(/(\d+)年(\d+)月/).slice(1).map(Number)
      const [yearB, monthB] = b.month.match(/(\d+)年(\d+)月/).slice(1).map(Number)
      if (yearA !== yearB) return yearA - yearB
      return monthA - monthB
    })
    const list = sorted.map(item => {
      const matched = item.month.match(/(\d+)年(\d+)月/)
      const y = matched ? Number(matched[1]) : 0
      const m = matched ? Number(matched[2]) : 0
      return {
        ym: y * 100 + m,
        month: m + "月",
        payNum: item.payNum,
        otherAmount: item.otherAmount || 0
      }
    })
    let battlePassData = []
    try {
      // 处理战令数据
      if (Array.isArray(this.#battlePassList)) {
        battlePassData = this.#battlePassList.map(bp => ({
          time: bp.datetime,
          type: /成长计划/.test(bp.item_name) ? "成长计划" : "典藏计划",
          price: /成长计划/.test(bp.item_name) ? 68 : 128
        }))
      }
      // 处理其他类型的充值记录
      Object.entries(otherStats).forEach(([type, stats]) => {
        if (type.includes("成长计划") || type.includes("典藏计划")) {
          battlePassData.push({
            time: moment().format("YYYY-MM-DD HH:mm:ss"),
            type: type.includes("成长计划") ? "成长计划" : "典藏计划",
            price: type.includes("成长计划") ? 68 : 128,
            count: stats.count
          })
        }
      })
    } catch (err) {
    }
    return {
      uid: this.#uid,
      crystal: sumCrystal,
      monthData: list,
      battlePassData,
      otherStats
    }
  }

  headers = {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site"
    },
    referrer: "https://webstatic.mihoyo.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
    method: "GET",
    mode: "cors",
    credentials: "include"
  }

  getUrl () {
    const baseUrl = "https://public-operation-nap.mihoyo.com/common/nap_self_help_query/Coin/GetList"
    let params = ""
    params += "?sign_type=2"
    params += "&authkey_ver=1"
    params += "&app_client=bbs"
    params += "&source_point=SvcCenterSelf"
    params += "&size=100000"
    params += "&coin_type=monochrome_film"
    params += "&add_type=produce"
    params += "&authkey=" + this.#authkey
    return baseUrl + params
  }

  getBattlePassUrl () {
    const baseUrl = "https://public-operation-nap.mihoyo.com/common/nap_self_help_query/Coin/GetList"
    let params = ""
    params += "?sign_type=2"
    params += "&authkey_ver=1"
    params += "&size=100000"
    params += "&coin_type=battle_pass"
    params += "&authkey=" + this.#authkey
    return baseUrl + params
  }
}

export async function renderImgData (data, game = "gs") {
  const htmlData = new HtmlData(data, game)
  const result = {
    ...htmlData.screenData,
    topData: htmlData.getTopData(),
    detailData: htmlData.getDetailData(),
    barData: JSON.stringify(htmlData.getBarData()),
    pieData: JSON.stringify(htmlData.getPieData()),
    uid: data.uid || htmlData.uid,
    game
  }
  return result
}
