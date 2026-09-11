import _ from "lodash"
import moment from "moment"
import { base, MysInfo, Character, gsCfg } from "#index"

function formatSplendourText (text) {
  if (!text) return ""
  if (typeof text === "object" && text.desc) {
    const total_level = text.total_level
    let desc = text.desc
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "<br>")
      .replace(/\u003ccolor=#([0-9a-fA-F]{6})\u003e(.*?)\u003c\/color\u003e/g, "<span style=\"color:#$1\">$2</span>")
      .replace(/<br><span style="color:#f39001">特邀角色<\/span>获得的祝福等级效果提升<span style="color:#f39001">100%<\/span>。/, "")
    return {
      total_level,
      desc
    }
  }
  return text
}

export default class Abyss extends base {
  /** 深渊数据 */
  async getAbyss () {
    let scheduleType = 1
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) {
      scheduleType = 2
    }
    let ApiData = {
      index: "",
      spiralAbyss: { schedule_type: scheduleType }
    }
    let res = await MysInfo.get(this.e, ApiData, "")
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) return false
    let resIndex = res[0].data
    let abyssData = res[1].data
    if (abyssData?.total_battle_times <= 0) {
      await this.e.reply(`UID:${this.e.uid}，暂无挑战数据。`)
      return false
    }
    if (!abyssData.damage_rank || abyssData.damage_rank.length <= 0) {
      await this.e.reply(`UID:${this.e.uid}，数据还没更新，请稍后再试`)
      return false
    }
    let data = {
      name: this.e.sender.card,
      ...this.screenData,
      ...this.abyssData(abyssData),
      floors: this.buildFloorsData(resIndex, abyssData)
    }
    return data
  }

  abyssData (data) {
    let startTime = moment.unix(data.start_time)
    let time = Number(startTime.month()) + 1 + "月"
    let period = ""
    if (data.start_time && data.end_time) {
      let s = moment.unix(data.start_time)
      let e = moment.unix(data.end_time)
      const fmt = (m) => `${m.year()}.${String(m.month() + 1).padStart(2, "0")}.${String(m.date()).padStart(2, "0")}`
      period = `${fmt(s)}-${fmt(e)}`
    }
    let totalStar = Number(data.total_star) || 0
    let dataName = ["damage", "take_damage", "defeat", "normal_skill", "energy_skill"]
    let rankData = []
    for (let val of dataName) {
      if (_.isEmpty(data[`${val}_rank`]) || data[`${val}_rank`].length <= 0) {
        data[`${val}_rank`] = [
          {
            value: 0,
            avatar_id: 10000007
          }
        ]
      }
      let char = Character.get(data[`${val}_rank`][0].avatar_id)
      rankData[val] = {
        num: data[`${val}_rank`][0].value,
        name: char.abbr,
        icon: char.side
      }
    }
    for (let i in data.reveal_rank) {
      let char = Character.get(data.reveal_rank[i].avatar_id)
      data.reveal_rank[i].name = char.abbr
      data.reveal_rank[i].icon = char.face
      let rarity = data.reveal_rank[i].rarity || char.star || char.rarity || 5
      data.reveal_rank[i].bg = gsCfg.getRoleBg(data.reveal_rank[i].avatar_id, rarity)
    }
    return {
      time,
      period,
      max_floor: data.max_floor,
      total_star: totalStar,
      list: data.reveal_rank,
      total_battle_times: data.total_battle_times,
      ...rankData
    }
  }

  abyssFloorData (floor, index) {
    let roleArr = _.keyBy(index.avatars, "id")
    let list = []
    for (let val of floor.levels) {
      if (!val.battles || val.battles.length < 2) {
        continue
      }
      val.time = moment.unix(val.battles[0].timestamp).format("YYYY-MM-DD HH:mm:ss")
      val.monsters = {
        top: (val.top_half_floor_monster || []).map(m => ({
          icon: m.icon,
          level: m.level
        })),
        bottom: (val.bottom_half_floor_monster || []).map(m => ({
          icon: m.icon,
          level: m.level
        }))
      }
      for (let i in val.battles) {
        for (let j in val.battles[i].avatars) {
          let avatar = val.battles[i].avatars[j]
          let char = Character.get(avatar.id)
          avatar.name = char.abbr
          avatar.icon = char.face
          avatar.life = roleArr[avatar.id].actived_constellation_num
          let rarity = avatar.rarity || char.star || char.rarity || 5
          avatar.bg = gsCfg.getRoleBg(avatar.id, rarity)
        }
      }
      list.push(val)
    }
    let leyLine = ""
    if (Array.isArray(floor.ley_line_disorder) && floor.ley_line_disorder.length > 0) {
      leyLine = floor.ley_line_disorder.join("<br>")
      leyLine = leyLine.replace(/(\d+(?:\.\d+)?%?)/g, "<span class=\"ley-num\">$1</span>")
    }
    return {
      floor,
      list,
      ley_line_disorder: leyLine
    }
  }

  buildFloorsData (index, abyssData) {
    if (!abyssData || _.isEmpty(abyssData.floors) || _.isEmpty(index?.avatars)) {
      return []
    }
    const floors = _.keyBy(abyssData.floors, "index")
    const result = []
    for (const floorIndex of [9, 10, 11, 12]) {
      if (!floors[floorIndex]) continue
      const detail = this.abyssFloorData(floors[floorIndex], index)
      result.push({
        floorIndex,
        ...detail
      })
    }
    return result
  }

  /** 幻想真境剧诗 */
  async getCombat () {
    let scheduleType = 0
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) {
      scheduleType = 1
    }
    let ApiData = {
      index: "",
      role_combat: ""
    }
    let res = await MysInfo.get(this.e, ApiData, "")
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) return false
    let resIndex = res[0].data
    let CombatData = res[1].data
    const targetCombat = (CombatData && Array.isArray(CombatData.data)) ? CombatData.data[scheduleType || 0] : null
    if (!targetCombat) {
      await this.e.reply(`UID:${this.e.uid}，暂无幻想真境剧诗挑战数据，请稍后再试`)
      return false
    }
    if (targetCombat.has_detail_data === "false" || targetCombat.has_detail_data === false) {
      await this.e.reply(`UID:${this.e.uid}，暂无幻想真境剧诗挑战数据，请稍后再试`)
      return false
    }
    if (targetCombat.has_data === "false" || targetCombat.has_data === false) {
      await this.e.reply(`UID:${this.e.uid}，暂无幻想真境剧诗挑战数据，请稍后再试`)
      return false
    }
    let detail = CombatData.data[scheduleType || 0].detail
    let stat = CombatData.data[scheduleType || 0].stat
    let tarot_card = CombatData.tarot_card_state
    let schedule = CombatData.data[scheduleType || 0].schedule
    for (const i of ["start", "end"]) {
      schedule[i] = this.dealTime(schedule[i + "_date_time"], true)
    }

    if (detail?.rounds_data) {
      detail.rounds_data = detail.rounds_data.map(round => {
        if (round.splendour_buff?.summary) {
          round.splendour_buff.summary = formatSplendourText(round.splendour_buff.summary)
        }
        if (round.finish_date_time) {
          round.finish_time = this.dealTime(round.finish_date_time)
        }
        if (round.avatars && round.avatars.length > 0) {
          round.avatars = round.avatars.map(avatar => {
            const id = avatar.avatar_id || avatar.id || 0
            const rarity = avatar.rarity || 5
            avatar.bg = gsCfg.getRoleBg(id, rarity)
            return avatar
          })
        }
        return round
      })
    }
    let data = {
      ...this.screenData,
      role: resIndex.role,
      detail,
      stat,
      schedule,
      roman: gsCfg.roman,
      tarot_card
    }
    return data
  }

  /** 幽境危战数据 */
  async getChallenge () {
    let scheduleIndex = 0
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) {
      scheduleIndex = 1
    }
    let ApiData = {
      hard_challenge: "",
      index: "",
      hard_challenge_popularity: ""
    }
    let res = await MysInfo.get(this.e, ApiData, "")
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) return false
    let popularityData = res[2]?.data?.avatar_list || []
    let popularityNames = popularityData.map(char => char.name)
    let data = res[0].data
    if (!data || !data.data || !data.data[scheduleIndex]) {
      await this.e.reply(`UID:${this.e.uid}，暂无幽境危战挑战数据，请稍后再试`)
      return false
    }
    let schedule = data.data[scheduleIndex].schedule
    let period = ""
    const TEN_DAYS = 10 * 24 * 3600
    const startTimeNum = Number(schedule?.start_time) || 0
    const nowUnix = Math.floor(Date.now() / 1000)
    const background = (startTimeNum > 0 && nowUnix <= (startTimeNum + TEN_DAYS)) ? "light" : "dark"
    if (schedule.start_date_time && schedule.end_date_time) {
      period = `${schedule.start_date_time.year}.${String(schedule.start_date_time.month).padStart(2, "0")}.${String(schedule.start_date_time.day).padStart(2, "0")}` +
        "-" +
        `${schedule.end_date_time.year}.${String(schedule.end_date_time.month).padStart(2, "0")}.${String(schedule.end_date_time.day).padStart(2, "0")}`
    }
    let disorder_period = ""
    if (startTimeNum > 0) {
      const startD = new Date(startTimeNum * 1000)
      const endD = new Date((startTimeNum + TEN_DAYS) * 1000)
      const fmt = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
      disorder_period = `${fmt(startD)}-${fmt(endD)}`
    }
    let resIndex = res[1].data
    let result = {
      ...this.screenData,
      period,
      role: resIndex.role,
      schedule_background: background,
      disorder_period,
      blings: data.data[scheduleIndex].blings?.map(bling => ({
        name: bling.name,
        image: bling.image,
        rarity: bling.rarity,
        element: bling.element,
        side_icon: bling.side_icon,
        is_plus: bling.is_plus
      })) || []
    }
    if (data.data[scheduleIndex].single && data.data[scheduleIndex].single.challenge && data.data[scheduleIndex].single.challenge.length > 0) {
      result.bestTime = data.data[scheduleIndex].single.best?.second || 0
      result.bestDifficulty = data.data[scheduleIndex].single.best?.difficulty || 0
      if (result.bestDifficulty === 6 && result.bestTime < 180) {
        result.bestDifficulty = 7
      }
      result.challenges = data.data[scheduleIndex].single.challenge.map(challenge => ({
        name: challenge.name,
        time: challenge.second,
        team: challenge.teams.map(t => {
          const id = t.avatar_id || t.id || 0
          const rarity = t.rarity || 5
          return {
            name: t.name,
            level: t.level,
            image: t.image,
            rarity: t.rarity,
            rank: t.rank,
            element: t.element,
            isPopular: popularityNames.includes(t.name),
            bg: gsCfg.getRoleBg(id, rarity)
          }
        }),
        bossIcon: challenge.monster.icon,
        bossLevel: challenge.monster.level,
        bestHit: challenge.best_avatar.find(b => b.type === 1),
        totalDmg: challenge.best_avatar.find(b => b.type === 2)
      }))
    }
    if (data.data[scheduleIndex].mp && data.data[scheduleIndex].mp.challenge && data.data[scheduleIndex].mp.challenge.length > 0) {
      result.mpBestTime = data.data[scheduleIndex].mp.best?.second || 0
      result.mpBestDifficulty = data.data[scheduleIndex].mp.best?.difficulty || 0
      if (result.mpBestDifficulty === 6 && result.mpBestTime < 180) {
        result.mpBestDifficulty = 7
      }
      result.mpChallenges = data.data[scheduleIndex].mp.challenge.map(challenge => ({
        name: challenge.name,
        time: challenge.second,
        team: challenge.teams.map(t => {
          const id = t.avatar_id || t.id || 0
          const rarity = t.rarity || 5
          return {
            name: t.name,
            level: t.level,
            image: t.image,
            rarity: t.rarity,
            rank: t.rank,
            element: t.element,
            isPopular: popularityNames.includes(t.name),
            bg: gsCfg.getRoleBg(id, rarity)
          }
        }),
        bossIcon: challenge.monster.icon,
        bossLevel: challenge.monster.level,
        bestHit: challenge.best_avatar.find(b => b.type === 1),
        totalDmg: challenge.best_avatar.find(b => b.type === 2)
      }))
    }
    if (!result.challenges && !result.mpChallenges) {
      await this.e.reply(`UID:${this.e.uid}，暂无幽境危战挑战数据，请稍后再试`)
      return false
    }
    return result
  }

  dealTime (time, dateOnly = false) {
    const pad = (num) => String(num).padStart(2, "0")
    const date = `${time.year}.${pad(time.month)}.${pad(time.day)}`
    if (dateOnly) {
      return date
    }
    return `${date} ${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`
  }
}