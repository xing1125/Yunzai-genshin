import _ from "lodash"
import fs from "node:fs"
import moment from "moment"
import { base, MysInfo, common, Button } from "#index"

export default class Ledger extends base {
  constructor (e) {
    super(e)
    this.model = "ledger"
    if (this.e.msg?.includes("菲林")) { this.e.iszzz = e.game === "zzz" }
    this.actionColor = {
      event_rewards: "#FFDE00",
      daily_activity_rewards: "#5CC83D",
      shiyu_rewards: "#2FA3FF",
      mail_rewards: "#C92ADE",
      growth_rewards: "#A2D104",
      hollow_rewards: "#FF4483",
      other_rewards: "#F1AD3D"
    }
    this.actionOrder = [
      "event_rewards",
      "daily_activity_rewards",
      "shiyu_rewards",
      "mail_rewards",
      "growth_rewards",
      "hollow_rewards",
      "other_rewards"
    ]
  }

  async get () {
    const months = this.parseMonths()
    const month = months[0] || moment().format("YYYYMM")
    if (!month) return false
    const res = await MysInfo.get(this.e, "ledger", { month })
    if (!res || res.retcode !== 0) return false
    this.e.nowData = res.data
    const data = this.formatMain(res.data)
    const mysInfo = await MysInfo.init(this.e, "ledger")
    const uid = mysInfo?.uid
    if (uid) {
      await this.saveLedger(uid)
    }
    return data
  }

  async getCount () {
    const months = this.parseMonths()
    const mysInfo = await MysInfo.init(this.e, "ledger")
    const uid = mysInfo?.uid
    if (!uid) return false
    await this.saveLedger(uid)
    let all = []
    if (months && months.length > 0) {
      this.monthRangeText = `${months[months.length - 1]}-${months[0]}`
      for (const m of months) {
        const r = await MysInfo.get(this.e, "ledger", { month: m })
        if (r && r.retcode === 0) all.push(r.data)
      }
    } else {
      const dataPath = `./data/NoteData/zzz/${uid}.json`
      if (!fs.existsSync(dataPath)) return false
      const fileData = JSON.parse(fs.readFileSync(dataPath, "utf8"))
      const list = []
      for (let i = 0; i < 12; i++) {
        let m = Number(moment().month()) + 1 - i
        let y = Number(moment().year())
        if (m <= 0) { m = 12 + m; y-- }
        if (fileData[y] && fileData[y][m]) {
          list.push(fileData[y][m])
        }
      }
      if (list.length === 0) return false
      const first = list[list.length - 1]?.data_month
      const last = list[0]?.data_month
      if (first && last) this.monthRangeText = `${first}-${last}`
      all = list
    }
    const newE = Object.assign({}, this.e, { isCountView: true })
    this.e = newE
    return this.formatCount(all)
  }

  parseMonths () {
    let msg = (this.e.msg || "").replace(/#|绝区零|菲林|统计|月报/g, " ").trim()
    let arr = msg.match(/\d{6}/g) || []
    arr = Array.from(new Set(arr)).sort((a, b) => b.localeCompare(a))
    return arr
  }

  formatMain (data) {
    const list = data?.month_data?.list || []
    const polychromes = list.find(i => i.data_type === "PolychromesData")?.count || 0
    const tape = list.find(i => i.data_type === "MatserTapeData")?.count || 0
    const boopons = list.find(i => i.data_type === "BooponsData")?.count || 0
    const componentsRaw = data?.month_data?.income_components || []
    const components = this.actionOrder
      .map(key => {
        const item = componentsRaw.find(v => v.action === key)
        if (!item) return null
        return {
          name: this.mapActionName(item.action),
          percent: item.percent,
          num: item.num,
          color: this.actionColor[item.action]
        }
      })
      .filter(Boolean)
    const mStr = data?.data_month || ""
    const monthText = mStr ? (mStr.slice(-2).replace(/^0/, "")) + "月" : ""
    return {
      ...this.screenData,
      nickname: data?.role_info?.nickname || "",
      avatar: data?.role_info?.avatar || "",
      uid: data?.uid || "",
      month: data?.data_month || "",
      monthText,
      cards: [
        { icon: "preview-card", title: "菲林", num: polychromes },
        { icon: "preview-card", title: "加密母带&原装母带", num: tape },
        { icon: "preview-card", title: "邦布券", num: boopons }
      ],
      components
    }
  }

  formatCount (list) {
    const merge = {}
    let uid
    const primogemsMonth = []
    list.forEach(d => {
      uid = uid || d?.uid
      const comps = d?.month_data?.income_components || []
      comps.forEach(v => {
        const key = this.mapActionName(v.action)
        const color = this.actionColor[v.action]
        if (!merge[key]) merge[key] = { action: key, color, num: 0 }
        merge[key].num += Number(v.num || 0)
      })
      const pCount = (d?.month_data?.list || []).find(i => i.data_type === "PolychromesData")?.count || 0
      const mStr = d?.data_month || ""
      const year = mStr.slice(0, 4)
      const month = mStr.slice(4).replace(/^0/, "")
      primogemsMonth.push({ value: pCount, month, year, name: "菲林" })
    })
    const components = this.actionOrder
      .map(key => {
        const name = this.mapActionName(key)
        const found = Object.values(merge).find(m => m.action === name)
        if (!found) return null
        return found
      })
      .filter(Boolean)
    primogemsMonth.sort((a, b) => Number(a.year) * 100 + Number(a.month) - (Number(b.year) * 100 + Number(b.month)))
    const yearText = this.monthRangeText || ""
    const group_by = components
    const colorArr = components.map(it => it.color)
    const allPrimogems = primogemsMonth.reduce((s, v) => s + Number(v.value || 0), 0)
    const maxPrimogems = primogemsMonth.length ? primogemsMonth.reduce((a, b) => (a.value > b.value ? a : b)) : { month: "-", value: "-" }
    return {
      ...this.screenData,
      uid,
      yearText,
      allPrimogemsShow: allPrimogems.toString(),
      allGacha: Math.floor(allPrimogems / 160),
      maxPrimogems,
      allMora: (list.reduce((s, d) => s + ((d?.month_data?.list || []).find(i => i.data_type === "BooponsData")?.count || 0), 0)).toFixed(0) + "张",
      maxMora: { month: "-" },
      group_by,
      primogemsMonth: JSON.stringify(primogemsMonth),
      color: JSON.stringify(colorArr),
      pieData: JSON.stringify(group_by),
      hasMore: false
    }
  }

  mapActionName (key) {
    const map = {
      event_rewards: "活动奖励",
      daily_activity_rewards: "日常活跃奖励",
      hollow_rewards: "零号空洞奖励",
      mail_rewards: "邮件奖励",
      other_rewards: "其他奖励",
      shiyu_rewards: this.e?.isCountView ? "防卫&强袭奖励" : "式舆防卫战&危局强袭战奖励",
      growth_rewards: "成长奖励"
    }
    return map[key] || key
  }

  async ledgerCountHistory () {
    let nowYear
    if (this.e.msg.includes("去年")) {
      nowYear = moment().year() - 1
    } else if (this.e.msg.includes("今年")) {
      nowYear = moment().year()
    } else {
      /** 获取年份 */
      nowYear = this.e.msg.match(/(\d{4})/)
    }
    if (nowYear) {
      nowYear = parseInt(nowYear)
    }
    if (!nowYear) {
      nowYear = moment().year()
    }
    const mysInfo = await MysInfo.init(this.e, "ledger")
    const uid = mysInfo?.uid
    if (!uid) return false
    const dataPath = `./data/NoteData/zzz/${uid}.json`
    let noteData = {}
    if (fs.existsSync(dataPath)) {
      try {
        noteData = JSON.parse(fs.readFileSync(dataPath, "utf8"))
      } catch (e) {
        noteData = {}
      }
    }
    if (!noteData || _.isEmpty(noteData)) {
      this.e.reply(["暂无菲林数据，请先发送%菲林", new Button(this.e).gameLeder()], false, { at: true })
      return false
    }
    noteData = noteData[nowYear]
    if (!noteData) {
      this.e.reply(`UID：${uid} ${nowYear}年无菲林统计数据！`, false, { at: true })
      return false
    }
    _.forEach(noteData, (val) => {
      val.year = nowYear
    })
    /** 处理数据 */
    const newE = Object.assign({}, this.e, { isCountView: true })
    this.e = newE
    return this.formatCount(Object.values(noteData))
  }

  async saveLedger (uid) {
    if (!uid) return false
    const dataPath = `./data/NoteData/zzz/${uid}.json`
    let noteData = {}
    if (fs.existsSync(dataPath)) {
      try {
        noteData = JSON.parse(fs.readFileSync(dataPath, "utf8"))
      } catch (e) {
        noteData = {}
      }
    }
    const nowYear = Number(moment().year())
    const nowMonth = Number(moment().month()) + 1
    const monthArr = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].splice(nowMonth - 1, 3)
    for (const m of monthArr) {
      let year = nowYear
      if (nowMonth <= 2 && m >= 11) year--
      if (!noteData[year]) noteData[year] = {}
      // 已有且标记完成则跳过，避免覆盖历史数据
      if (noteData[year][m] && noteData[year][m].isUpdate) continue
      let info
      if (nowMonth === m && this.e.nowData && this.e.nowData?.data_month) {
        info = this.e.nowData
      } else {
        const ym = `${year}${m < 10 ? "0" : ""}${m}`
        const res = await MysInfo.get(this.e, "ledger", { month: ym })
        if (!res || res.retcode !== 0) continue
        info = res.data
      }
      if (nowMonth !== m) info.isUpdate = true
      noteData[year][m] = info
      await common.sleep(100)
    }
    try {
      fs.mkdirSync("./data/NoteData/zzz", { recursive: true })
      fs.writeFileSync(dataPath, JSON.stringify(noteData, "", "\t"))
    } catch (err) {
    }
    return noteData
  }
}
