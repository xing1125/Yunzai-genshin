import { base, MysInfo, gsCfg } from "#index"

export default class zzzAbyss extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "zzz_index")
  }

  /** 危局强袭战数据 */
  async memDetail () {
    let scheduleType = "1"
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) {
      scheduleType = "2"
    }
    let res = await MysInfo.get(this.e, "mem_detail", { schedule_type: scheduleType })
    if (res?.retcode !== 0) return false
    if (!res.data?.has_data) {
      this.e.reply(`UID:${this.e.uid},暂无危局强袭战挑战数据`)
      return false
    }
    const d = res.data
    const start = `${d.start_time.year}.${String(d.start_time.month).padStart(2, "0")}.${String(d.start_time.day).padStart(2, "0")}`
    const end = `${d.end_time.year}.${String(d.end_time.month).padStart(2, "0")}.${String(d.end_time.day).padStart(2, "0")}`
    const rankPercent = (Number(d.rank_percent) / 100).toFixed(2)
    const list = (d.list || []).map(v => {
      const boss = v.boss?.[0] || {}
      let bgNum = 1
      if (boss.bg_icon) {
        const m = boss.bg_icon.match(/boss_bg_(\d)/)
        if (m && m[1]) bgNum = Number(m[1])
      }
      const buff = v.buffer?.[0] || {}
      let buffDesc = buff.desc || ""
      buffDesc = buffDesc
        .replace(/<[^>]+>/g, "")
        .replace(/\\n/g, " ")
      return {
        score: v.score,
        star: v.star,
        total_star: v.total_star,
        challenge_time: `${v.challenge_time.year}.${String(v.challenge_time.month).padStart(2, "0")}.${String(v.challenge_time.day).padStart(2, "0")} ${String(v.challenge_time.hour).padStart(2, "0")}:${String(v.challenge_time.minute).padStart(2, "0")}:${String(v.challenge_time.second).padStart(2, "0")}`,
        boss: { ...boss, bg_num: bgNum },
        buffer: { ...buff, desc: buffDesc },
        avatars: (v.avatar_list || []).map(a => ({ ...a })),
        buddy: v.buddy || {}
      }
    })
    return {
      ...this.screenData,
      uid: this.e.uid,
      nickname: d.nick_name,
      avatar_icon: d.avatar_icon,
      total_score: d.total_score,
      total_star: d.total_star,
      rank_percent: rankPercent,
      period: `${start} - ${end}`,
      list
    }
  }

  /** 式舆防卫战数据 */
  async challenge () {
    let scheduleType = "1"
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) {
      scheduleType = "2"
    }
    let res = await MysInfo.get(this.e, "challenge", { schedule_type: scheduleType })
    if (res?.retcode !== 0) return false
    if (!res.data?.has_data) {
      this.e.reply(`UID:${this.e.uid},暂无式舆防卫战挑战数据`)
      return false
    }
    const elementMap = {
      200: { key: "phy", name: "物理" },
      201: { key: "fire", name: "火" },
      202: { key: "ice", name: "冰" },
      203: { key: "elec", name: "电" },
      205: { key: "ether", name: "以太" }
    }
    const orderKeys = [
      { field: "physics_weakness", key: "phy" },
      { field: "ice_weakness", key: "ice" },
      { field: "fire_weakness", key: "fire" },
      { field: "elec_weakness", key: "elec" },
      { field: "ether_weakness", key: "ether" }
    ]
    const toTime = (sec) => {
      sec = Number(sec || 0)
      const m = Math.floor(sec / 60)
      const s = sec % 60
      const mm = String(m).padStart(2, "0")
      const ss = String(s).padStart(2, "0")
      return `${mm}:${ss}`
    }
    const fmtDate = (o) => {
      if (!o) return ""
      const y = o.year
      const m = String(o.month).padStart(2, "0")
      const d = String(o.day).padStart(2, "0")
      const hh = String(o.hour).padStart(2, "0")
      const mm = String(o.minute).padStart(2, "0")
      const ss = String(o.second).padStart(2, "0")
      return `${y}.${m}.${d} ${hh}:${mm}:${ss}`
    }
    const parseBuff = (b) => {
      if (!b) return { title: "", text: "" }
      let text = b.text || ""
      text = text.replace(/<[^>]+>/g, "").replace(/\\n/g, " ")
      return { title: b.title || "", text }
    }
    const parseMonster = (m) => {
      let bgNum = 1
      if (m.bg_icon) {
        const mt = m.bg_icon.match(/boss_bg_(\d)/)
        if (mt && mt[1]) bgNum = Number(mt[1])
      }
      const weak = []
      const resist = []
      for (const it of orderKeys) {
        const v = Number(m[it.field] ?? 0)
        if (v === 1) weak.push(it.key)
        if (v === -1) resist.push(it.key)
      }
      return {
        id: m.id,
        name: m.name,
        icon: m.icon_url,
        race_icon: m.race_icon,
        bg_num: bgNum,
        weak,
        resist
      }
    }
    const parseNode = (node) => {
      const elList = (node.element_type_list || []).map(c => ({
        code: c,
        key: elementMap[c]?.key || "",
        name: elementMap[c]?.name || ""
      }))
      const monsters = ((node.monster_info || {}).list || []).map(parseMonster)
      const benefitSet = new Set()
      const resistSet = new Set()
      for (const m of monsters) {
        for (const k of (m.weak || [])) benefitSet.add(k)
        for (const k of (m.resist || [])) resistSet.add(k)
      }
      return {
        avatars: (node.avatars || []).map(a => ({ ...a })),
        buddy: node.buddy || {},
        elements: elList,
        monsters,
        benefit: Array.from(benefitSet),
        resist: Array.from(resistSet),
        battle_time: node.battle_time || 0,
        battle_time_str: toTime(node.battle_time || 0)
      }
    }
    const d = res.data
    const period = (() => {
      const b = d.hadal_begin_time
      const e = d.hadal_end_time
      const bp = `${b.year}.${String(b.month).padStart(2, "0")}.${String(b.day).padStart(2, "0")}`
      const ep = `${e.year}.${String(e.month).padStart(2, "0")}.${String(e.day).padStart(2, "0")}`
      return `${bp}-${ep}`
    })()
    const gradeCount = { S: 0, A: 0, B: 0 }
    for (const r of (d.rating_list || [])) {
      if (r.rating && Object.prototype.hasOwnProperty.call(gradeCount, r.rating)) {
        gradeCount[r.rating] = r.times || 0
      }
    }
    const floors = (d.all_floor_detail || []).map(fl => ({
      layer_index: fl.layer_index,
      rating: fl.rating,
      zone_name: fl.zone_name,
      challenge_time: fmtDate(fl.floor_challenge_time),
      buff: parseBuff((fl.buffs || [])[0]),
      node_1: parseNode(fl.node_1 || {}),
      node_2: parseNode(fl.node_2 || {})
    }))
    const calc47Secs = floors.reduce((sum, fl) => {
      const idx = Number(fl.layer_index || 0)
      const maxL = Number(d.max_layer || 0)
      if (idx >= 4 && idx <= maxL) {
        const n1 = Number(fl.node_1?.battle_time || 0)
        const n2 = Number(fl.node_2?.battle_time || 0)
        return sum + n1 + n2
      }
      return sum
    }, 0)
    const api47Secs = Number(d.battle_time_47 || 0)
    const final47Secs = api47Secs > 0 ? api47Secs : calc47Secs
    const numToCn = (n) => {
      const map = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
      if (n >= 0 && n <= 10) return map[n]
      return String(n)
    }
    return {
      ...this.screenData,
      uid: this.e.uid,
      period,
      grade: gradeCount,
      max_layer: d.max_layer,
      max_layer_str: `第${numToCn(Number(d.max_layer || 0))}防线`,
      fast_layer_time: toTime(d.fast_layer_time || 0),
      battle_time_47: toTime(final47Secs),
      floors
    }
  }

  /** 临界推演数据 */
  async voidFront () {
    const voidInfoRes = await MysInfo.get(this.e, "void_info")
    if (voidInfoRes?.retcode !== 0) return false
    const voidInfoData = voidInfoRes.data || {}
    const brief = voidInfoData.void_front_battle_abstract_info_brief || {}
    if (!voidInfoData.has_detail_record) {
      this.e.reply(`UID:${this.e.uid},暂无临界推演挑战数据`)
      return false
    }
    const voidFrontId = brief.void_front_id
    if (!voidFrontId) {
      this.e.reply(`UID:${this.e.uid},暂无临界推演挑战数据`)
      return false
    }
    const res = await MysInfo.get(this.e, "voidFront", { void_front_id: voidFrontId })
    if (res?.retcode !== 0) return false
    const d = res.data || {}
    const fmtDate = (o) => {
      if (!o) return ""
      const y = o.year
      const m = String(o.month).padStart(2, "0")
      const d = String(o.day).padStart(2, "0")
      const hh = String(o.hour).padStart(2, "0")
      const mm = String(o.minute).padStart(2, "0")
      const ss = String(o.second).padStart(2, "0")
      return `${y}.${m}.${d} ${hh}:${mm}:${ss}`
    }
    const clearHtml = (txt = "") => String(txt).replace(/<[^>]+>/g, "").replace(/\\n/g, " ")
    const parseAvatars = (list = []) => list.map(a => ({ ...a }))
    const parseBuddy = (b = {}) => ({ ...b })
    const parseBuffer = (b = {}) => ({
      icon: b.icon || "",
      name: b.name || "",
      desc: clearHtml(b.desc || b.text || "")
    })
    const bossRec = ((d.boss_challenge_record || {}).main_challenge_record || {})
    const boss = {
      name: (d.boss_challenge_record?.boss_info || {}).name || "",
      icon: (d.boss_challenge_record?.boss_info || {}).icon || "",
      race_icon: (d.boss_challenge_record?.boss_info || {}).race_icon || "",
      bg_icon: (d.boss_challenge_record?.boss_info || {}).bg_icon || ""
    }
    const mainBoss = {
      battle_id: bossRec.battle_id,
      node_id: bossRec.node_id,
      name: bossRec.name,
      score: bossRec.score,
      star: bossRec.star,
      score_ratio: bossRec.score_ratio,
      max_score: bossRec.max_score,
      challenge_time: fmtDate(bossRec.challenge_time),
      buffer: parseBuffer(bossRec.buffer || {}),
      avatars: parseAvatars(bossRec.avatar_list || []),
      buddy: parseBuddy(bossRec.buddy || {}),
      sub: (bossRec.sub_challenge_record || []).map(s => ({
        battle_id: s.battle_id,
        name: s.name,
        star: s.star,
        avatars: parseAvatars(s.avatar_list || []),
        buddy: parseBuddy(s.buddy || {}),
        buffer: parseBuffer(s.buffer || {})
      })),
      boss
    }
    const stages = (d.main_challenge_record_list || []).map(m => ({
      battle_id: m.battle_id,
      node_id: m.node_id,
      name: m.name,
      score: m.score,
      star: m.star,
      score_ratio: m.score_ratio,
      max_score: m.max_score,
      challenge_time: fmtDate(m.challenge_time),
      buffer: parseBuffer(m.buffer || {}),
      avatars: parseAvatars(m.avatar_list || []),
      buddy: parseBuddy(m.buddy || {}),
      sub: (m.sub_challenge_record || []).map(s => ({
        battle_id: s.battle_id,
        name: s.name,
        star: s.star,
        avatars: parseAvatars(s.avatar_list || []),
        buddy: parseBuddy(s.buddy || {}),
        buffer: parseBuffer(s.buffer || {})
      }))
    }))
    const rankPercent = (Number(brief.rank_percent || 0) / 100).toFixed(2)
    let endTime = ""
    if (brief.end_ts && !brief.end_ts_over_42_days) {
      const endDate = new Date(brief.end_ts * 1000)
      const now = new Date()
      const diff = endDate - now
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        endTime = `${days}天${hours}小时${minutes}分钟`
      } else {
        endTime = "已结束"
      }
    }
    return {
      ...this.screenData,
      uid: this.e.uid,
      total_score: brief.total_score || 0,
      rank_percent: rankPercent,
      void_front_battle_abstract_info_brief: {
        end_ts_over_42_days: !!brief.end_ts_over_42_days,
        void_front_id: brief.void_front_id
      },
      end_time: endTime,
      ending_record_name: brief.ending_record_name || "",
      ending_record_bg_pic: brief.ending_record_bg_pic || "",
      boss_main: mainBoss,
      stages,
      role: d.role_basic_info || {}
    }
  }
}