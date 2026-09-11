import moment from "moment"
import { base, MysInfo, gsCfg } from "#index"

export default class Activity extends base {
  async get () {
    const res = await MysInfo.get(this.e, "activity")
    if (!res || res.retcode !== 0) return false
    const data = this.dealData(res.data || {})
    return data
  }

  dealData (info) {
    const now = moment()
    const countPreviousRuns = (pools, name, currentStart, keys = ["five", "four"]) => {
      let count = 0
      const start = currentStart ? moment(currentStart) : null
      const hasStart = !!(start && start.isValid())
      ;(pools || []).forEach(p => {
        const names = keys.flatMap(k => p[k] || [])
        if (!names.includes(name)) return
        if (!hasStart) {
          count++
          return
        }
        const end = moment(p.to)
        const from = moment(p.from)
        if (end.isValid()) {
          if (!end.isAfter(start)) count++
        } else if (from.isValid() && from.isBefore(start)) {
          count++
        }
      })
      return hasStart ? count : Math.max(count - 1, 0)
    }
    const rolePoolsCfg = gsCfg.getdefSet("pool", "301") || []
    const weaponPoolsCfg = gsCfg.getdefSet("pool", "302") || []
    const formatRemain = (seconds) => {
      seconds = Number(seconds) || 0
      if (seconds <= 0) return ""
      const d = Math.floor(seconds / 86400)
      const h = Math.floor((seconds % 86400) / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const parts = []
      if (d) parts.push(`${d}天`)
      if (h) parts.push(`${h}时`)
      if (m) parts.push(`${m}分`)
      return parts.join("") || "不足1分钟"
    }
    const formatRemainFull = (seconds) => {
      seconds = Number(seconds) || 0
      if (seconds <= 0) return ""
      const d = Math.floor(seconds / 86400)
      const h = Math.floor((seconds % 86400) / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = Math.floor(seconds % 60)
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      const ss = String(s).padStart(2, "0")
      const dayPart = d > 0 ? `${d}天 ` : ""
      return `${dayPart}${hh}时${mm}分${ss}秒`
    }
    const formatTimeStruct = (t) => {
      if (!t) return ""
      return moment({
        year: t.year,
        month: (t.month || 1) - 1,
        day: t.day || 1,
        hour: t.hour || 0,
        minute: t.minute || 0,
        second: t.second || 0
      }).format("YYYY-MM-DD HH:mm:ss")
    }
    const mapStatusText = (status) => {
      switch (status) {
        case 1:
          return "未开启"
        case 2:
          return "进行中"
        case 3:
          return "已结束"
        default:
          return ""
      }
    }
    const chooseBg = (rarity) => {
      const r = Number(rarity) || 0
      if (r >= 5) return 5
      if (r === 4) return 4
      if (r === 3) return 3
      if (r === 2) return 2
      return 1
    }
    const processPool = (pool) => {
      if (!pool) return null
      const remainFull = formatRemainFull(pool.countdown_seconds)
      const start = formatTimeStruct(pool.start_time)
      const end = formatTimeStruct(pool.end_time)
      return {
        pool_id: pool.pool_id,
        version_name: pool.version_name,
        pool_name: pool.pool_name,
        pool_type: pool.pool_type,
        remain_text: formatRemain(pool.countdown_seconds),
        remain_full: remainFull,
        period_text: start && end ? `${start} ~ ${end}` : "",
        status_text: mapStatusText(pool.pool_status),
        avatars: (pool.avatars || []).map(a => {
          const previousRuns = countPreviousRuns(rolePoolsCfg, a.name, start)
          const rerun = previousRuns > 0 ? previousRuns + 1 : 0
          return {
            id: a.id,
            name: a.name,
            icon: a.icon,
            element: a.element,
            rarity: a.rarity,
            bg: chooseBg(a.rarity),
            rerun
          }
        }),
        weapons: (pool.weapon || []).map(w => {
          const previousRuns = countPreviousRuns(weaponPoolsCfg, w.name, start)
          const rerun = previousRuns > 0 ? previousRuns + 1 : 0
          return {
            id: w.id,
            name: w.name,
            icon: w.icon,
            rarity: w.rarity,
            bg: chooseBg(w.rarity),
            rerun
          }
        })
      }
    }
    const processAct = (act) => {
      const countdown = Number(act.countdown_seconds) || 0
      const startTs = Number(act.start_timestamp) || 0
      const endTs = Number(act.end_timestamp) || 0
      let timeText = ""
      if (countdown > 0 && act.status === 2) {
        timeText = `剩余时间：${formatRemain(countdown)}`
      } else if (act.status === 1 && startTs > 0) {
        const diff = startTs - now.unix()
        if (diff > 0) timeText = `距离开始还有：${formatRemain(diff)}`
      }
      const timeFull = countdown > 0 && act.status === 2 ? formatRemainFull(countdown) : ""
      const start = formatTimeStruct(act.start_time)
      const end = formatTimeStruct(act.end_time)
      const periodText = start && end ? `${start} ~ ${end}` : ""
      const rewards = (act.reward_list || []).map(r => {
        const rawNum = Number(r.num) || 0
        let numText = String(rawNum)
        if (rawNum === 0) {
          numText = "-"
        } else if (rawNum >= 10000) {
          const val = rawNum / 10000
          numText = (val >= 10 ? val.toFixed(0) : val.toFixed(1)) + "w"
        }
        return {
          item_id: r.item_id,
          name: r.name,
          num: rawNum,
          num_text: numText,
          icon: r.icon,
          rarity: r.rarity,
          bg: chooseBg(r.rarity),
          homepage_show: r.homepage_show
        }
      })
      let starText = ""
      if (act.tower_detail && typeof act.tower_detail.max_star !== "undefined" && typeof act.tower_detail.total_star !== "undefined") {
        const maxStar = Number(act.tower_detail.max_star) || 0
        const totalStar = Number(act.tower_detail.total_star) || 0
        starText = `${maxStar}/${totalStar}`
      }
      let hard = null
      if (act.type === "ActTypeHardChallenge" && act.hard_challenge_detail) {
        const detail = act.hard_challenge_detail
        const diff = Number(detail.difficulty) || 0
        const bestSecond = Number(detail.second) || 0
        let level = diff + 1
        if (diff === 6 && bestSecond > 0 && bestSecond < 180) level = 7
        const sub = detail.sub || {}
        hard = {
          best_second: bestSecond,
          best_time_text: bestSecond > 0 ? `${bestSecond}秒` : "-",
          difficulty: diff,
          sub_remain_text: formatRemain(sub.seconds || 0),
          sub_value: sub.x,
          sub_total: sub.y
        }
      }
      let roleCombat = null
      if (act.type === "ActTypeRoleCombat" && act.role_combat_detail) {
        const rc = act.role_combat_detail
        const round = Number(rc.max_round_id) || 0
        const diffId = Number(rc.difficulty_id) || 0
        const tarotCnt = Number(rc.tarot_finished_cnt) || 0
        let roundText = ""
        if (round > 0) {
          if (tarotCnt > 0) {
            roundText = `第${round}幕 圣牌${tarotCnt}`
          } else {
            roundText = `第${round}幕 已抵达`
          }
        }
        roleCombat = {
          round_text: roundText,
          difficulty_id: diffId
        }
      }
      let statusText = mapStatusText(act.status)
      if (act.tower_detail && typeof act.tower_detail.max_star !== "undefined" && typeof act.tower_detail.total_star !== "undefined") {
        const maxStar = Number(act.tower_detail.max_star) || 0
        const totalStar = Number(act.tower_detail.total_star) || 0
        if (maxStar === totalStar && maxStar === 36) {
          statusText = "已完成"
        }
      }
      if (act.type === "ActTypeRoleCombat" && act.role_combat_detail) {
        const round = Number(act.role_combat_detail.max_round_id) || 0
        if (round === 10) {
          statusText = "已完成"
        }
      }
      return {
        id: act.id,
        name: act.name,
        type: act.type,
        status: act.status,
        remaining_seconds: countdown,
        status_text: statusText,
        time_text: timeText,
        time_full: timeFull,
        period_text: periodText,
        desc: act.desc,
        rewards,
        star_text: starText,
        hard,
        role_combat: roleCombat
      }
    }
    const avatarPools = (info.avatar_card_pool_list || []).map(processPool).filter(Boolean)
    const weaponPools = (info.weapon_card_pool_list || []).map(processPool).filter(Boolean)
    const mixedPools = (info.mixed_card_pool_list || []).map(processPool).filter(Boolean)
    const allActs = (info.act_list || []).map(processAct)
    const sortByRemain = (list) => {
      return list.sort((a, b) => {
        const ar = a.remaining_seconds > 0 ? a.remaining_seconds : Number.MAX_SAFE_INTEGER
        const br = b.remaining_seconds > 0 ? b.remaining_seconds : Number.MAX_SAFE_INTEGER
        return ar - br
      })
    }
    const acts = sortByRemain(allActs.filter(act => act.type !== "ActTypeHardChallenge"))
    const hardActs = allActs.filter(act => act.type === "ActTypeHardChallenge")
    const fixedActs = sortByRemain((info.fixed_act_list || []).map(processAct).concat(hardActs))
    return {
      uid: this.e.uid,
      nowDate: now.format("YYYY年MM月DD日 HH:mm:ss"),
      avatarPools,
      weaponPools,
      mixedPools,
      acts,
      fixedActs,
      ...this.screenData
    }
  }
}
