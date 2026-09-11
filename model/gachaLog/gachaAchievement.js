import _ from "lodash"
import fs from "node:fs"
import moment from "moment"
import GachaLog from "./gachaLog.js"
import { base, gsCfg } from "#index"

/** 抽卡成就计算，参考 https://github.com/voderl/genshin-gacha-analyzer */
export default class GachaAchievement extends base {
  constructor (e) {
    super(e)
    const isSr = e.isSr || e.game === "sr" || /星铁|崩坏星穹铁道|铁道/.test(e.msg || "")
    e.isSr = isSr
    e.game = isSr ? "sr" : "gs"
    const game = isSr ? "srJson" : "genshin"
    this.uidKey = `Yz:${game}:mys:qq-uid:${this.userId}`
    this.path = `./data/${isSr ? "sr" : "gacha"}Json/${this.e.user_id}/`
    this.game = e.game
  }

  async getUid () {
    const gachLog = new GachaLog(this.e)
    const uid = await gachLog.getUid()
    if (!uid) return false
    this.uid = uid
    return uid
  }

  /** 卡池类型列表，对应 exportLog.js 的定义 */
  getPoolTypes () {
    return this.game === "gs"
      ? [301, 302, 500, 200]
      : [11, 12, 21, 22, 1, 10]
  }

  getPoolName (type) {
    const names = this.game === "gs"
      ? { 301: "角色活动祈愿", 302: "武器活动祈愿", 500: "集录祈愿", 200: "常驻祈愿" }
      : { 11: "角色活动跃迁", 12: "光锥活动跃迁", 21: "角色联动跃迁", 22: "光锥联动跃迁", 1: "群星跃迁", 10: "群星跃迁" }
    return names[type] || "未知卡池"
  }

  getMaxPity (type) {
    return [302, 12, 22].includes(Number(type)) ? 80 : 90
  }

  getQqAvatar () {
    try {
      if (this.e?.bot?.pickFriend && this.e?.user_id) {
        return this.e.bot.pickFriend(String(this.e.user_id)).getAvatarUrl(100)
      }
    } catch (err) {
      logger?.debug?.(`[抽卡成就] 获取用户头像失败：${err.message}`)
    }
    return ""
  }

  readPoolList (type) {
    const file = `${this.path}${this.uid}/${type}.json`
    if (!fs.existsSync(file)) return []
    try {
      const list = JSON.parse(fs.readFileSync(file, "utf8"))
      if (!Array.isArray(list)) return []
      return list.map(row => ({
        ...row,
        rank_type: Number(row.rank_type),
        gacha_type: Number(row.gacha_type || type),
        pool_type: Number(type)
      }))
    } catch (err) {
      logger?.error?.(`[抽卡成就] 读取${file}失败：${err}`)
      return []
    }
  }

  /** 读取所有卡池记录并合并为按时间排序的列表（用于按日统计等） */
  getAllRecords () {
    let all = []
    for (const type of this.getPoolTypes()) {
      all.push(...this.readPoolList(type))
    }
    all = _.orderBy(all, ["time", "id"], ["asc", "asc"])
    return all
  }

  /** 米游社十连记录通常拥有相同卡池和相同秒级时间，按 10 条切分用于十连成就 */
  getTenPullGroups (all) {
    const groups = []
    const byTime = _.groupBy(all, row => `${row.pool_type}:${row.time}`)
    for (const records of Object.values(byTime)) {
      const sorted = _.orderBy(records, ["id"], ["asc"])
      if (sorted.length < 10) continue
      for (let i = 0; i + 9 < sorted.length; i += 10) {
        groups.push(sorted.slice(i, i + 10))
      }
    }
    return groups
  }

  /** 单池内计算五星保底（当前五星是本轮第几抽，含当次） */
  getFiveStarPitiesInPool (list, gachaType) {
    const pities = []
    let count = 0
    for (const row of list) {
      count++
      if (row.rank_type == 5) {
        pities.push({ num: count, name: row.name, type: gachaType, gacha_type: Number(row.gacha_type), pool_type: Number(row.pool_type || gachaType), time: row.time })
        count = 0
      }
    }
    return pities
  }

  /** 各卡池分别计算保底后合并，再取最非/最欧（不能跨池累计） */
  getAllPities (poolTypesFilter) {
    const allPities = []
    for (const type of this.getPoolTypes()) {
      if (poolTypesFilter && !poolTypesFilter.includes(type)) continue
      let list = this.readPoolList(type)
      list = _.orderBy(list, ["time", "id"], ["asc", "asc"])
      const pities = this.getFiveStarPitiesInPool(list, type)
      allPities.push(...pities)
    }
    return allPities
  }

  /** 原神角色池最非：301.json 整份作为一条时间线（301/400 只存一份文件），按时间正序算保底，与统计页逻辑一致 */
  getCharPoolPitiesForGs () {
    let list = this.readPoolList(301)
    list = _.orderBy(list, ["time", "id"], ["asc", "asc"])
    return this.getFiveStarPitiesInPool(list, 301).filter(p => p.num <= 90)
  }

  /** 判断角色/武器是否为UP（需要卡池配置） */
  checkIsUp (record) {
    const permanentList = gsCfg.getdefSet("pool", "other")[this.game === "sr" ? "sr" : "gs"]
    if (permanentList.includes(record.name)) return false
    if (this.game === "sr") return true
    const role5join = gsCfg.getdefSet("pool", "other").role5_join
    if (!role5join || !role5join[record.name]) return true
    const logTime = new Date(record.time).getTime()
    const upPeriods = Array.isArray(role5join[record.name]) ? role5join[record.name] : [role5join[record.name]]
    for (const period of upPeriods) {
      const start = new Date(period.start).getTime()
      const end = new Date(period.end).getTime()
      if (logTime >= start && logTime <= end) return true
    }
    return false
  }

  async compute () {
    const isSr = this.e.isSr || this.e.game === "sr" || /星铁|崩坏星穹铁道|铁道/.test(this.e.msg || "")
    this.e.isSr = isSr
    this.e.game = isSr ? "sr" : "gs"
    this.game = this.e.game

    await this.getUid()
    if (!this.uid) return false

    const all = this.getAllRecords()
    if (all.length === 0) {
      this.e.reply("暂无抽卡记录，无法生成成就")
      return false
    }

    const achievements = []
    const limitedTypes = this.game === "gs" ? [301, 302] : [11, 12]
    const charPoolTypes = this.game === "gs" ? [301] : [11]
    const allPities = this.getAllPities([301, 302, 200, 500, 11, 12, 1, 10, 21, 22])
    const limitedPities = this.getAllPities(limitedTypes).filter(p => p.num <= this.getMaxPity(p.type))
    const validPities = allPities.filter(p => p.num <= this.getMaxPity(p.type))
    const charPoolPities = this.game === "gs"
      ? this.getCharPoolPitiesForGs()
      : this.getAllPities(charPoolTypes).filter(p => p.num <= 90)

    if (charPoolPities.length > 0 && validPities.length > 0) {
      const maxPity = _.maxBy(charPoolPities, "num")
      achievements.push({
        title: "原来非酋竟是我自己",
        desc: `抽了${maxPity.num}次才最终抽到了「${maxPity.name}」，你竟是千里挑一的非酋！`,
        value: maxPity.num,
        valueSub: moment(maxPity.time).format("YYYY/MM/DD"),
        icon: "badge"
      })
      const minPity = _.minBy(validPities, "num")
      achievements.push({
        title: "欧皇时刻",
        desc: `只抽了${minPity.num}次就抽到了「${minPity.name}」，你的欧气无人能敌！`,
        value: minPity.num,
        valueSub: moment(minPity.time).format("YYYY/MM/DD"),
        icon: "lucky"
      })
    }

    for (const type of this.game === "gs" ? [301, 302, 200] : [11, 12, 1]) {
      const count = type === 1 && this.game === "sr"
        ? this.readPoolList(1).length + this.readPoolList(10).length
        : this.readPoolList(type).length
      if (count > 0) continue
      achievements.push({
        title: `${this.getPoolName(type)}？不稀罕！`,
        desc: `没有在「${this.getPoolName(type)}」中进行抽卡`,
        value: 0,
        icon: "novice"
      })
    }

    if (charPoolTypes.length > 0) {
      const charPoolList = all.filter(r => r.rank_type == 5 && charPoolTypes.includes(Number(r.pool_type)))
      let win = 0
      let lose = 0
      for (let i = 0; i < charPoolList.length; i++) {
        if (this.checkIsUp(charPoolList[i])) {
          win++
        } else {
          lose++
          i++
        }
      }
      const total = win + lose
      if (total > 0) {
        let title = "晴雨各半"
        let desc = "在「角色活动祈愿」中小保底歪与不歪持平"
        if (lose === 0) {
          title = "不倒翁"
          desc = "在「角色活动祈愿」中抽中的五星角色均为当期Up角色"
        } else if (win > lose) {
          title = "晴时总比雨时多"
          desc = "在「角色活动祈愿」中，小保底偏向于抽中当期Up角色"
        } else if (win < lose) {
          title = "雨时偏比晴时多"
          desc = "在「角色活动祈愿」中，小保底偏向于没有抽中当期Up角色"
        }
        achievements.push({
          title,
          desc,
          value: `${lose} / ${total}`,
          valueSub: "小保底歪的概率",
          icon: "rate"
        })
      }
    }

    const byDate = _.groupBy(all, r => r.time.substring(0, 10))
    let maxDayCount = 0
    let maxDay = ""
    let maxDayFive = []
    for (const [day, records] of Object.entries(byDate)) {
      if (records.length > maxDayCount) {
        maxDayCount = records.length
        maxDay = day
        maxDayFive = records.filter(r => r.rank_type == 5).map(r => r.name)
      }
    }
    if (maxDayCount >= 10) {
      const fiveStr = maxDayFive.length > 0 ? `，当天抽到了${_.uniq(maxDayFive).slice(0, 3).join("、")}${maxDayFive.length > 3 ? "等" : ""}` : ""
      const dayFormatted = maxDay.replace(/-/g, "/")
      achievements.push({
        title: "豪掷千金",
        desc: `在${dayFormatted}这一天，你共抽取了${maxDayCount}次${fiveStr}。`,
        value: maxDayCount,
        valueSub: dayFormatted,
        icon: "spend"
      })
    }

    if (limitedPities.length >= 2) {
      let maxGapDays = 0
      let maxGapStart = ""
      let maxGapEnd = ""
      for (let i = 1; i < limitedPities.length; i++) {
        const prev = moment(limitedPities[i - 1].time)
        const curr = moment(limitedPities[i].time)
        const days = curr.diff(prev, "days")
        if (days > maxGapDays) {
          maxGapDays = days
          maxGapStart = prev.format("YYYY/MM/DD")
          maxGapEnd = curr.format("YYYY/MM/DD")
        }
      }
      if (maxGapDays >= 7) {
        achievements.push({
          title: "大师仓鼠",
          desc: `从${maxGapStart}到${maxGapEnd}没有使用「纠缠之缘」进行抽卡。作为仓鼠，你就是专家!`,
          value: `${maxGapDays}天`,
          valueSub: "持续时间",
          icon: "hamster"
        })
      }
    }

    const earlyFive = allPities.filter(p => p.num <= 40)
    if (earlyFive.length > 0) {
      achievements.push({
        title: "单抽出奇迹？",
        desc: `在 40 抽内获取 5 星共计 ${earlyFive.length} 次`,
        icon: "single"
      })
    }

    const tenPullGroups = this.getTenPullGroups(all)
    if (tenPullGroups.length > 0) {
      const richGroups = tenPullGroups
        .map(data => ({ data, count: data.filter(row => row.rank_type >= 4).length }))
        .filter(group => group.count >= 4)
      if (richGroups.length > 0) {
        const best = _.maxBy(richGroups, "count")
        const achievedGroups = best.count >= 5
          ? richGroups.filter(group => group.count >= 5)
          : richGroups
        achievements.push({
          title: best.count >= 5 ? "福至五彩" : "四叶草",
          desc: `在一次十连中，抽取到 ${best.count >= 5 ? "5" : "4"} 个或以上的 4 星或 5 星`,
          value: String(achievedGroups.length),
          valueSub: "达成次数",
          icon: "lucky"
        })
      }
    }

    const fiveStars = all.filter(r => r.rank_type == 5 && r.item_type === "角色")
    if (fiveStars.length > 0) {
      const countByName = _.countBy(fiveStars, "name")
      const sorted = _.orderBy(Object.entries(countByName), ["1"], ["desc"])
      const maxCount = sorted[0][1]
      if (maxCount > 1) {
        const topNames = sorted.filter(([, c]) => c === maxCount).map(([n]) => n)
        const charPart = topNames.map(n => `「${n}」×${maxCount}`).join("、")
        const desc = topNames.length > 1
          ? `你共抽取了 ${charPart}，这是上天对你的眷顾还是你对他们的情有独钟呢？`
          : `你共抽取了「${topNames[0]}」×${maxCount}次，这是上天对你的眷顾还是你对他们的情有独钟呢？`
        achievements.push({
          title: "情有独钟(五星角色)",
          desc,
          icon: "love5"
        })
      }
    }

    const fourStars = all.filter(r => r.rank_type == 4 && r.item_type === "角色")
    if (fourStars.length > 0) {
      const countByName = _.countBy(fourStars, "name")
      const sorted = _.orderBy(Object.entries(countByName), ["1"], ["desc"])
      const maxCount = sorted[0][1]
      if (maxCount > 1) {
        const topNames = sorted.filter(([, c]) => c === maxCount).map(([n]) => n)
        const charPart = topNames.map(n => `「${n}」×${maxCount}`).join("、")
        const desc = topNames.length > 1
          ? `你共抽取了 ${charPart}，这是上天对你的眷顾还是你对他们的情有独钟呢？`
          : `你共抽取了「${topNames[0]}」×${maxCount}次，这是上天对你的眷顾还是你对他们的情有独钟呢？`
        achievements.push({
          title: "情有独钟(四星角色)",
          desc,
          icon: "love4"
        })
      }
    }

    return {
      ...this.screenData,
      uid: this.uid,
      userId: this.e.user_id,
      avatar: this.getQqAvatar(),
      game: this.game,
      achievements: achievements.filter(Boolean),
      totalPulls: all.length
    }
  }
}
