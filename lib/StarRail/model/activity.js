import moment from "moment"
import { base, MysInfo, gsCfg } from "#index"

export default class Activity extends base {
  async get () {
    const res = await MysInfo.get(this.e, "activity")
    if (!res || res.retcode !== 0) return false
    return this.dealData(res.data || {})
  }

  dealData (info) {
    const now = moment.unix(Number(info.now) || moment().unix())
    const countPreviousRuns = (pools, name, currentStart) => {
      let count = 0
      const start = Number(currentStart) > 0 ? moment.unix(Number(currentStart)) : null
      const hasStart = !!(start && start.isValid())
      ;(pools || []).forEach(p => {
        const names = [...(p.five || []), ...(p.four || [])]
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
    const rolePoolsCfg = gsCfg.getdefSet("pool", "11") || []
    const weaponPoolsCfg = gsCfg.getdefSet("pool", "12") || []
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
    const formatTsPeriod = (timeInfo) => {
      if (!timeInfo) {
        return { countdown: 0, periodText: "", start: 0, end: 0, nowTs: now.unix() }
      }
      const start = Number(timeInfo.start_ts) || 0
      const end = Number(timeInfo.end_ts) || 0
      const nowTs = Number(timeInfo.now) || now.unix()
      let countdown = 0
      if (end > nowTs) {
        countdown = end - nowTs
      }
      let periodText = ""
      if (timeInfo.start_time && timeInfo.end_time) {
        periodText = `${timeInfo.start_time} ~ ${timeInfo.end_time}`
      }
      return { countdown, periodText, start, end, nowTs }
    }
    const chooseBg = (rarity) => {
      const r = Number(rarity) || 0
      if (r >= 5) return 5
      if (r === 4) return 4
      if (r === 3) return 3
      if (r === 2) return 2
      return 1
    }
    const formatNumText = (num) => {
      const raw = Number(num) || 0
      if (!raw) return "-"
      if (raw >= 10000) {
        const v = raw / 10000
        return (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + "w"
      }
      return String(raw)
    }
    const mapPoolStatus = (start, end, nowTs) => {
      if (nowTs < start) return "未开启"
      if (nowTs >= start && nowTs <= end) return "进行中"
      return "已结束"
    }
    const damageTypeMap = {
      fire: "fire",
      ice: "ice",
      imaginary: "imaginary",
      wind: "wind",
      physical: "physical",
      lightning: "lightning",
      quantum: "quantum"
    }
    const processAvatarPool = (pool) => {
      if (!pool) return null
      const { countdown, periodText, start, end, nowTs } = formatTsPeriod(pool.time_info)
      const remainFull = formatRemainFull(countdown)
      return {
        pool_id: pool.id,
        version_name: pool.version,
        pool_name: pool.name,
        type: pool.type,
        remain_full: remainFull,
        period_text: periodText,
        status_text: mapPoolStatus(start, end, nowTs),
        avatars: (pool.avatar_list || []).map(a => {
          const previousRuns = countPreviousRuns(rolePoolsCfg, a.item_name, start)
          const rerun = previousRuns > 0 ? previousRuns + 1 : 0
          return {
            id: a.item_id,
            name: a.item_name,
            icon: a.item_avatar_icon_path || a.icon_url,
            element: damageTypeMap[a.damage_type_name] || "",
            rarity: a.rarity,
            bg: chooseBg(a.rarity),
            rerun
          }
        })
      }
    }
    const processEquipPool = (pool) => {
      if (!pool) return null
      const { countdown, periodText, start, end, nowTs } = formatTsPeriod(pool.time_info)
      const remainFull = formatRemainFull(countdown)
      return {
        pool_id: pool.id,
        version_name: pool.version,
        pool_name: pool.name,
        type: pool.type,
        remain_full: remainFull,
        period_text: periodText,
        status_text: mapPoolStatus(start, end, nowTs),
        weapons: (pool.equip_list || []).map(w => {
          const previousRuns = countPreviousRuns(weaponPoolsCfg, w.item_name, start)
          const rerun = previousRuns > 0 ? previousRuns + 1 : 0
          return {
            id: w.item_id,
            name: w.item_name,
            icon: w.item_url,
            rarity: w.rarity,
            bg: chooseBg(w.rarity),
            rerun
          }
        })
      }
    }
    const processAct = (act) => {
      const { countdown, periodText, start, end, nowTs } = formatTsPeriod(act.time_info)
      const timeFull = formatRemainFull(countdown)
      const rewards = (act.reward_list || []).map(r => ({
        item_id: r.item_id,
        name: r.name,
        icon: r.icon,
        rarity: r.rarity,
        num: Number(r.num) || 0,
        num_text: formatNumText(r.num),
        bg: chooseBg(r.rarity)
      }))
      let signProgressText = ""
      if (act.act_type === "ActivityTypeSign") {
        const cur = Number(act.current_progress) || 0
        const total = Number(act.total_progress) || 7
        signProgressText = `${cur}/${total}`
      }
      let phase = 2
      let sortKey = Number.MAX_SAFE_INTEGER
      if (nowTs >= start && nowTs <= end && countdown > 0) {
        phase = 0
        sortKey = countdown
      } else if (start > nowTs && start > 0) {
        phase = 1
        sortKey = start - nowTs
      } else {
        phase = 2
        sortKey = Number.MAX_SAFE_INTEGER
      }
      let statusText = act.show_text || ""
      if (act.act_type === "ActivityTypeSign" && signProgressText) {
        statusText = signProgressText
      }
      return {
        id: act.id,
        name: act.name,
        act_type: act.act_type,
        act_time_type: act.act_time_type,
        status_text: statusText,
        time_full: timeFull,
        period_text: periodText,
        rewards,
        sign_progress_text: signProgressText,
        remaining_seconds: countdown,
        phase,
        sort_key: sortKey
      }
    }
    const challengeTypeName = {
      ChallengeTypeStory: "虚构叙事",
      ChallengeTypePeak: "异相仲裁",
      ChallengeTypeChasm: "忘却之庭",
      ChallengeTypeBoss: "末日幻影"
    }
    const challengeLights = (info.challenge_list || []).map(c => {
      const { start, end, nowTs, periodText } = formatTsPeriod(c.time_info)
      let remain = 0
      if (nowTs < start && start > 0) {
        remain = start - nowTs
      } else if (nowTs >= start && nowTs < end && end > 0) {
        remain = end - nowTs
      }
      const timeFull = formatRemain(remain)
      const rewards = (c.reward_list || []).map(r => ({
        name: r.name,
        icon: r.icon,
        rarity: r.rarity,
        num: Number(r.num) || 0,
        num_text: formatNumText(r.num),
        bg: chooseBg(r.rarity)
      }))
      let progress = c.show_text || ""
      if (c.status === "challengeStatusFinish" && typeof c.current_progress !== "undefined" && typeof c.total_progress !== "undefined") {
        const cur = Number(c.current_progress) || 0
        const total = Number(c.total_progress) || 0
        if (total > 0) {
          progress = `${cur}/${total}`
        }
      }
      let phase = 2
      let sortKey = Number.MAX_SAFE_INTEGER
      if (c.status === "challengeStatusInProgress" && remain > 0) {
        phase = 0
        sortKey = remain
      } else if (c.status === "challengeStatusUnopened" && start > nowTs && remain > 0) {
        phase = 1
        sortKey = remain
      } else {
        phase = 2
        sortKey = Number.MAX_SAFE_INTEGER
      }
      return {
        name: c.name_mi18n,
        challenge_type: c.challenge_type,
        challenge_type_name: challengeTypeName[c.challenge_type] || "",
        status: c.status,
        progress,
        time_full: timeFull,
        period_text: periodText,
        rewards,
        remaining_seconds: remain,
        phase,
        sort_key: sortKey,
        is_challenge: true
      }
    })
    const rogueTournActs = (info.act_list || []).filter(a => a.act_type === "ActivityTypeRogueTourn")
    const rogueTournLights = rogueTournActs.map(act => {
      const { countdown, periodText } = formatTsPeriod(act.time_info)
      const timeFull = formatRemain(countdown)
      const rewards = (act.reward_list || []).map(r => ({
        item_id: r.item_id,
        name: r.name,
        icon: r.icon,
        rarity: r.rarity,
        num: Number(r.num) || 0,
        num_text: formatNumText(r.num),
        bg: chooseBg(r.rarity)
      }))
      const currentProgress = Number(act.current_progress) || 0
      const totalProgress = Number(act.total_progress) || 0
      const progress = totalProgress > 0 ? `${currentProgress}/${totalProgress}` : (act.show_text || "")
      const fitLevel = "拟合等级"
      let phase = 2
      let sortKey = Number.MAX_SAFE_INTEGER
      if (act.act_status === "RogueTournActStatusProgress" && countdown > 0) {
        phase = 0
        sortKey = countdown
      } else if (act.act_status === "RogueTournActStatusUnopened" && countdown > 0) {
        phase = 1
        sortKey = countdown
      }
      return {
        name: act.name,
        challenge_type: "",
        challenge_type_name: "",
        status: act.act_status,
        progress,
        fit_level: fitLevel,
        time_full: timeFull,
        period_text: periodText,
        rewards,
        remaining_seconds: countdown,
        phase,
        sort_key: sortKey,
        is_challenge: false
      }
    })
    const allLights = challengeLights.concat(rogueTournLights)
    const lightsByType = {}
    allLights.forEach(light => {
      const key = light.challenge_type || "rogue_tourn"
      if (!lightsByType[key]) {
        lightsByType[key] = []
      }
      lightsByType[key].push(light)
    })
    const lights = []
    Object.keys(lightsByType).forEach(key => {
      const typeLights = lightsByType[key]
      const activeLight = typeLights.find(l => l.phase === 0) ||
                         typeLights.find(l => l.status === "challengeStatusFinish")
      if (activeLight) {
        const futureLights = typeLights
          .filter(l => l.phase === 1 && l.remaining_seconds > 0 && l !== activeLight)
          .sort((a, b) => a.remaining_seconds - b.remaining_seconds)
        let nextOpenTime = ""
        if (futureLights.length > 0) {
          const nextTimes = []
          futureLights.forEach((future, idx) => {
            if (future.period_text) {
              const startTime = future.period_text.split(" ~ ")[0]
              if (idx === 0) {
                nextTimes.push(`下期：${startTime}`)
              } else if (idx === 1) {
                nextTimes.push(`下下期：${startTime}`)
              }
            }
          })
          nextOpenTime = nextTimes.join("，")
        }

        lights.push({
          ...activeLight,
          next_open_time: nextOpenTime
        })
      } else {
        lights.push(typeLights[0])
      }
    })
    const sortActsByPhase = (list) => {
      return list.sort((a, b) => {
        if (a.phase !== b.phase) return a.phase - b.phase
        return a.sort_key - b.sort_key
      })
    }
    const avatarPools = (info.avatar_card_pool_list || []).map(processAvatarPool).filter(Boolean)
    const equipPools = (info.equip_card_pool_list || []).map(processEquipPool).filter(Boolean)
    avatarPools.sort((a, b) => Number(a.pool_id) - Number(b.pool_id))
    equipPools.sort((a, b) => Number(a.pool_id) - Number(b.pool_id))
    const pools = avatarPools.concat(equipPools).sort((a, b) => Number(a.pool_id) - Number(b.pool_id))
    const allActs = (info.act_list || []).map(processAct)
    const sortByRemain = (list) => {
      return list.sort((a, b) => {
        if (a.phase != null && b.phase != null) {
          if (a.phase !== b.phase) return a.phase - b.phase
          return (a.sort_key || Number.MAX_SAFE_INTEGER) - (b.sort_key || Number.MAX_SAFE_INTEGER)
        }
        const ar = a.remaining_seconds > 0 ? a.remaining_seconds : Number.MAX_SAFE_INTEGER
        const br = b.remaining_seconds > 0 ? b.remaining_seconds : Number.MAX_SAFE_INTEGER
        return ar - br
      })
    }
    const acts = sortActsByPhase(allActs.filter(a =>
      a.act_time_type !== "ActTimeTypeLong" && a.act_type !== "ActivityTypeRogueTourn"
    ))
    const fixedActs = sortActsByPhase(allActs.filter(a =>
      a.act_time_type === "ActTimeTypeLong" && a.act_type !== "ActivityTypeRogueTourn"
    ))
    const sortedLights = sortActsByPhase(lights)
    return {
      uid: this.e.uid,
      nowDate: now.format("YYYY年MM月DD日 HH:mm:ss"),
      pools,
      avatarPools,
      equipPools,
      acts,
      fixedActs,
      lights: sortedLights,
      ...this.screenData
    }
  }
}
