import _ from "lodash"
import fs from "node:fs"
import moment from "moment"
import { base, Button, MysInfo } from "#index"

export default class Ledger extends base {
  constructor (e) {
    super(e)
    this.e = e
    this.e.game = "bh3"
    this.model = "Bh3"
    this.color = ["#7d8cff", "#67d7d1", "#ffb347", "#ffe15a", "#9d8cff", "#69b8ff", "#8893a8"]
    this.roleMap = ["Senadina", "Helia", "Coralie"]
    this.badgeMap = [
      "1-1.36af5d61",
      "1-2.95254c84",
      "1-3.5ff44116",
      "2-1.83a6d5c8",
      "2-2.b56a1a44",
      "2-3.598665ca",
      "3-1.cfafe0e1",
      "3-2.7358f84a",
      "3-3.a09d578e"
    ]
  }

  get dataDir () {
    return "./data/NoteData/bh3"
  }

  ensureDataDir () {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true })
  }

  formatMonthKey (year, month) {
    return `${year}${String(month).padStart(2, "0")}`
  }

  parseMonthKey (value) {
    const text = String(value || "")
    if (/^\d{6}$/.test(text)) {
      return {
        year: Number(text.slice(0, 4)),
        month: Number(text.slice(4, 6))
      }
    }
    return {
      year: moment().year(),
      month: moment().month() + 1
    }
  }

  pickRole () {
    return this.roleMap[moment().month() % this.roleMap.length]
    // return this.roleMap[_.random(0, this.roleMap.length - 1)]
  }

  // pickBadge () {
  //   return this.badgeMap[_.random(0, this.badgeMap.length - 1)]
  // }

  pickBadge (level = 0) {
    if (level >= 8) return "3-1.cfafe0e1"
    if (level >= 4) return "2-1.83a6d5c8"
    return "1-1.36af5d61"
  }

  buildTodayText (data) {
    const hcoin = Number(data?.day_hcoin || 0)
    const star = Number(data?.day_star || 0)
    if (hcoin <= 0 && star <= 0) {
      return "舰长还在休假状态？好好休息明日再战！"
    }
    return `舰长本日已经获取 ${hcoin} 水晶、${star} 星石，每天都在稳步前进。`
  }

  getCurrentMonthFromMsg () {
    return /上月/.test(this.e.msg || "") ? "last" : "current"
  }

  getRateText (currentValue = 0, previousValue = 0) {
    const current = Number(currentValue || 0)
    const previous = Number(previousValue || 0)
    if (previous <= 0) {
      return current > 0 ? "明显增加" : "保持不变"
    }
    const diff = current - previous
    const rate = Math.round(Math.abs(diff) / previous * 100)
    if (diff === 0) return "持平"
    return diff > 0 ? `增加了 ${rate}%` : `减少了 ${rate}%`
  }

  buildCompareText (monthData, compareData) {
    if (Number(monthData?.last_month || 0) > 0) {
      const hcoinTrend = Number(monthData.hcoin_rate || 0) >= 0 ? "增加了" : "减少了"
      const starTrend = Number(monthData.star_rate || 0) >= 0 ? "增加了" : "减少了"
      return `与 ${monthData.last_month} 月相比，舰长 ${monthData.month} 月的水晶收入${hcoinTrend} ${Math.abs(Number(monthData.hcoin_rate || 0))}%，星石收入${starTrend} ${Math.abs(Number(monthData.star_rate || 0))}%。`
    }
    const currentMonth = Number(monthData?.month || 0)
    const compareMonth = Number(compareData?.month || 0)
    if (!compareData || _.isEmpty(compareData)) {
      return "暂无可对比的上月数据。"
    }
    const hcoinRate = this.getRateText(monthData?.month_hcoin, compareData?.month_hcoin)
    const starRate = this.getRateText(monthData?.month_star, compareData?.month_star)
    return `与 ${compareMonth} 月相比，舰长 ${currentMonth} 月的水晶收入${hcoinRate}，星石收入${starRate}。`
  }

  getRateNumber (currentValue = 0, previousValue = 0) {
    const current = Number(currentValue || 0)
    const previous = Number(previousValue || 0)
    if (previous <= 0) return 0
    return Math.round(Math.abs(current - previous) / previous * 100)
  }

  buildCompareSummary (monthData, compareData) {
    if (Number(monthData?.last_month || 0) > 0) {
      return {
        currentMonth: Number(monthData.month || 0),
        compareMonth: Number(monthData.last_month || 0),
        hcoinRate: Math.abs(Number(monthData.hcoin_rate || 0)),
        starRate: Math.abs(Number(monthData.star_rate || 0)),
        hcoinTrend: Number(monthData.hcoin_rate || 0) >= 0 ? "增加" : "减少",
        starTrend: Number(monthData.star_rate || 0) >= 0 ? "增加" : "减少"
      }
    }
    const currentMonth = Number(monthData?.month || 0)
    const compareMonth = Number(compareData?.month || 0)
    const hcoinRate = this.getRateNumber(monthData?.month_hcoin, compareData?.month_hcoin)
    const starRate = this.getRateNumber(monthData?.month_star, compareData?.month_star)
    return {
      currentMonth,
      compareMonth,
      hcoinRate,
      starRate,
      hcoinTrend: Number(monthData?.month_hcoin || 0) - Number(compareData?.month_hcoin || 0) > 0 ? "增加" : "减少",
      starTrend: Number(monthData?.month_star || 0) - Number(compareData?.month_star || 0) > 0 ? "增加" : "减少"
    }
  }

  buildRewardList (groupBy = []) {
    return groupBy
      .map((item, index) => ({
        name: item?.name || item?.action_name || item?.action || `其他途径${index + 1}`,
        num: Number(item?.num || 0),
        percent: Number(item?.percent || 0),
        color: this.color[index % this.color.length]
      }))
      .filter(item => item.num > 0)
  }

  buildRewardGradient (rewardList = []) {
    if (!rewardList.length) {
      return "conic-gradient(#7d8cff 0deg 360deg)"
    }
    let start = 0
    const segments = rewardList.map(item => {
      const end = start + Math.round((Number(item.percent || 0) / 100) * 360)
      const text = `${item.color} ${start}deg ${end}deg`
      start = end
      return text
    })
    if (start < 360) {
      segments.push(`rgba(255,255,255,0.12) ${start}deg 360deg`)
    }
    return `conic-gradient(${segments.join(", ")})`
  }

  normalizeMonthData (monthData = {}, fallbackYear = moment().year()) {
    const dateText = String(monthData.date || moment().format("YYYY-MM-DD"))
    const dateParts = dateText.split("-")
    const month = Number(monthData.month || 0) || moment().month() + 1
    const key = monthData.data_month || this.formatMonthKey(fallbackYear, month)
    return {
      month,
      data_month: key,
      month_hcoin: Number(monthData.month_hcoin || 0),
      month_star: Number(monthData.month_star || 0),
      month_level: Number(monthData.month_level || 0),
      day_hcoin: Number(monthData.day_hcoin || 0),
      day_star: Number(monthData.day_star || 0),
      date: dateText,
      date_month: Number(dateParts[1] || month),
      date_day: Number(dateParts[2] || moment().date()),
      group_by: Array.isArray(monthData.group_by) ? monthData.group_by : [],
      last_month: Number(monthData.last_month || 0),
      last_month_hcoin: Number(monthData.last_month_hcoin || 0),
      last_month_star: Number(monthData.last_month_star || 0),
      hcoin_rate: Number(monthData.hcoin_rate || 0),
      star_rate: Number(monthData.star_rate || 0)
    }
  }

  async ledger () {
    const { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false

    const currentRes = await mysApi.getData("ledger", { headers })
    const lastRes = await mysApi.getData("ledger_lastMonth", { headers })
    if (!currentRes || currentRes.retcode !== 0 || !lastRes || lastRes.retcode !== 0) return false

    const currentData = this.normalizeMonthData(currentRes.data, moment().year())
    const lastData = this.normalizeMonthData(lastRes.data, moment().subtract(1, "month").year())
    const mode = this.getCurrentMonthFromMsg()
    const monthData = mode === "last" ? lastData : currentData
    const compareData = mode === "last" ? currentData : lastData

    await this.saveLedger(uid, { currentData, lastData })

    return {
      ...this.screenData,
      uid,
      saveId: uid,
      juese_url: this.pickRole(),
      icon_url: this.pickBadge(monthData.month_level),
      MonthData: monthData,
      CompareData: compareData,
      isLastMonth: mode === "last",
      periodText: mode === "last" ? "上月" : "本月",
      compareText: this.buildCompareText(monthData, compareData),
      dailyText: this.buildTodayText(monthData),
      compareSummary: this.buildCompareSummary(monthData, compareData),
      rewardList: this.buildRewardList(monthData.group_by),
      rewardGradient: this.buildRewardGradient(this.buildRewardList(monthData.group_by))
    }
  }

  async saveLedger (uid, preset = null) {
    this.ensureDataDir()
    const dataPath = `${this.dataDir}/${uid}.json`
    let noteData = {}
    if (fs.existsSync(dataPath)) {
      noteData = JSON.parse(fs.readFileSync(dataPath, "utf8"))
    }

    const now = moment()
    let currentData
    let lastData

    if (preset) {
      currentData = this.normalizeMonthData(preset.currentData, now.year())
      lastData = this.normalizeMonthData(preset.lastData, now.clone().subtract(1, "month").year())
    } else {
      const info = await MysInfo.initBh3Api(this.e, "bh3")
      if (!info?.mysApi) return noteData
      const currentRes = await info.mysApi.getData("ledger", { headers: info.headers })
      const lastRes = await info.mysApi.getData("ledger_lastMonth", { headers: info.headers })
      if (!currentRes || currentRes.retcode !== 0 || !lastRes || lastRes.retcode !== 0) return noteData
      currentData = this.normalizeMonthData(currentRes.data, now.year())
      lastData = this.normalizeMonthData(lastRes.data, now.clone().subtract(1, "month").year())
    }

    const currentInfo = this.parseMonthKey(currentData.data_month)
    const lastInfo = this.parseMonthKey(lastData.data_month)
    if (!noteData[currentInfo.year]) noteData[currentInfo.year] = {}
    if (!noteData[lastInfo.year]) noteData[lastInfo.year] = {}

    currentData.isUpdate = false
    lastData.isUpdate = true
    noteData[currentInfo.year][currentInfo.month] = currentData
    noteData[lastInfo.year][lastInfo.month] = lastData

    fs.writeFileSync(dataPath, JSON.stringify(noteData, null, "\t"))
    return noteData
  }

  async ledgerCount () {
    const info = await MysInfo.initBh3Api(this.e, "bh3")
    const uid = info?.uid
    if (!uid) return false
    const noteData = await this.saveLedger(uid)
    this.e.monthRangeText = ""
    return this.ledgerCountData(noteData, "", uid)
  }

  async ledgerCountHistory () {
    let nowYear
    if (this.e.msg.includes("去年")) {
      nowYear = moment().year() - 1
    } else if (this.e.msg.includes("今年")) {
      nowYear = moment().year()
    } else {
      const match = this.e.msg.match(/(\d{4})/)
      nowYear = match ? Number(match[1]) : moment().year()
    }

    const info = await MysInfo.initBh3Api(this.e, "bh3")
    const uid = info?.uid
    if (!uid) return false

    this.ensureDataDir()
    const dataPath = `${this.dataDir}/${uid}.json`
    let noteData = {}
    if (fs.existsSync(dataPath)) {
      noteData = JSON.parse(fs.readFileSync(dataPath, "utf8"))
    }
    if (!noteData || _.isEmpty(noteData)) {
      this.e.reply(["暂无崩三水晶数据，请先发送 #崩三水晶", new Button(this.e).gameLeder()], false, { at: true })
      return false
    }
    const yearData = noteData[nowYear]
    if (!yearData) {
      this.e.reply(`UID:${uid} ${nowYear}年暂无水晶统计数据`, false, { at: true })
      return false
    }
    _.forEach(yearData, val => { val.year = nowYear })
    return this.ledgerCountData(yearData, String(nowYear), uid)
  }

  buildMonthCompareText (items, label) {
    const latest = items[items.length - 1]
    const previous = items[items.length - 2]
    if (!latest || !previous) return `暂无${label}环比数据。`
    const text = this.getRateText(latest.value, previous.value)
    return `与 ${previous.month} 月相比，${latest.month} 月${label}${text}。`
  }

  formatNumber (value) {
    const num = Number(value || 0)
    if (num >= 10000) return `${(num / 10000).toFixed(2)}w`
    return String(num)
  }

  ledgerCountData (noteData, nowYear, uid) {
    let hasMore = false
    let yearText
    let list = []

    if (!nowYear) {
      if (noteData && Object.keys(noteData).length > 0) {
        let len = 0
        Object.values(noteData).forEach(yearData => {
          len += Object.keys(yearData || {}).length
        })
        hasMore = len >= 12
      }
      for (let i = 0; i < 12; i++) {
        const date = moment().subtract(i, "month")
        const year = date.year()
        const month = date.month() + 1
        if (noteData?.[year]?.[month]) {
          noteData[year][month].year = year
          list.push(noteData[year][month])
        }
      }
    } else {
      yearText = `${nowYear}年`
      list = Object.values(noteData || {})
    }

    if (!list.length) return false

    const actualMonthKeys = list
      .map(item => String(item?.data_month || ""))
      .filter(key => /^\d{6}$/.test(key))
      .sort()

    if (!nowYear && actualMonthKeys.length > 0) {
      this.e.monthRangeText = `${actualMonthKeys[0]}-${actualMonthKeys[actualMonthKeys.length - 1]}`
    }

    const data = {
      uid,
      yearText: this.e.monthRangeText || yearText,
      allHcoin: 0,
      allStar: 0,
      totalSupply: 0,
      hcoinMonth: [],
      starMonth: [],
      groupByList: [],
      summaryCards: []
    }

    list.forEach(item => {
      const monthData = this.normalizeMonthData(item, item.year || moment().year())
      const parsed = this.parseMonthKey(monthData.data_month)
      const monthLabel = String(parsed.month)
      data.allHcoin += monthData.month_hcoin
      data.allStar += monthData.month_star
      data.totalSupply += monthData.month_level
      data.hcoinMonth.push({
        value: monthData.month_hcoin,
        month: monthLabel,
        year: String(parsed.year),
        name: "水晶"
      })
      data.starMonth.push({
        value: monthData.month_star,
        month: monthLabel,
        year: String(parsed.year),
        name: "星石"
      })
      monthData.group_by.forEach((group, index) => {
        const key = group.name || group.action_name || group.action || `其他途径${index + 1}`
        const num = Number(group.num || 0)
        const exists = data.groupByList.find(item => item.action === key)
        if (exists) {
          exists.num += num
        } else {
          data.groupByList.push({
            action: key,
            num,
            action_id: Number(group.action_id || index)
          })
        }
      })
    })

    data.hcoinMonth = _.sortBy(data.hcoinMonth, item => Number(item.year) * 100 + Number(item.month))
    data.starMonth = _.sortBy(data.starMonth, item => Number(item.year) * 100 + Number(item.month))
    data.maxHcoin = _.maxBy(data.hcoinMonth, "value") || { month: "-", value: 0 }
    data.maxStar = _.maxBy(data.starMonth, "value") || { month: "-", value: 0 }
    data.groupByList = _.orderBy(data.groupByList, ["num"], ["desc"]).map((item, index) => ({
      ...item,
      color: this.color[item.action_id] || this.color[index % this.color.length]
    }))
    data.color = JSON.stringify(data.groupByList.map(item => item.color))
    data.pieData = JSON.stringify(data.groupByList)
    data.chartData = JSON.stringify(data.hcoinMonth)
    data.latestMonth = data.hcoinMonth[data.hcoinMonth.length - 1] || { month: "-", value: 0 }
    data.hcoinCompareText = this.buildMonthCompareText(data.hcoinMonth, "水晶")
    data.starCompareText = this.buildMonthCompareText(data.starMonth, "星石")
    data.group_by = data.groupByList
    data.primogemsMonth = JSON.stringify(data.hcoinMonth)
    data.allPrimogemsShow = this.formatNumber(data.allHcoin)
    data.allGacha = String(data.totalSupply)
    data.maxPrimogems = data.maxHcoin
    data.allMora = this.formatNumber(data.allStar)
    data.maxMora = data.maxStar
    data.summaryCards = [
      { label: "总水晶", value: this.formatNumber(data.allHcoin) },
      { label: "总星石", value: this.formatNumber(data.allStar) },
      { label: "补给卡", value: String(data.totalSupply) },
      { label: "水晶峰值", value: `${data.maxHcoin.month}月 ${this.formatNumber(data.maxHcoin.value)}` }
    ]
    data.hasMore = hasMore

    return {
      ...this.screenData,
      ...data,
      juese_url: this.pickRole()
    }
  }
}
