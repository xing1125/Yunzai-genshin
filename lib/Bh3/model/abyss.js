import { base, MysInfo } from "#index"

export default class bh3Abyss extends base {
  /** 往世乐土 */
  async getGod () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let res = await mysApi.getData("godWar", { headers })
    if (res?.retcode !== 0) return false
    let god = res.data
    const summary = god.summary || {}
    const hasSummaryData = (
      summary.max_level_avatar_number > 0 ||
      summary.max_support_point > 0 ||
      summary.extra_item_number > 0 ||
      summary.max_punish_level > 0 ||
      summary.max_challenge_score > 0 ||
      summary.avatar_numbers > 0 ||
      summary.max_challenge_level > 0
    )
    const hasAvatarTranscript = god.avatar_transcript && god.avatar_transcript.length > 0
    const hasRecords = god.records && god.records.length > 0
    if (!hasSummaryData && !hasAvatarTranscript && !hasRecords) {
      await this.e.reply(`UID:${uid}尚未开启往世乐土`)
      return false
    }
    let records = []
    if (god.records && god.records.length > 0) {
      records = god.records.map(record => {
        let settleTime = new Date(record.settle_time_second * 1000)
        let timeStr = settleTime.getFullYear() + "." + String(settleTime.getMonth() + 1).padStart(2, "0") + "." + String(settleTime.getDate()).padStart(2, "0")
        let costTime = record.cost_time
        let minutes = Math.floor(costTime / 60)
        let seconds = costTime % 60
        let timeText = `${minutes}分${seconds}秒`
        return {
          ...record,
          settle_time: timeStr,
          cost_time_text: timeText
        }
      })
    }
    return {
      ...this.screenData,
      god,
      records,
      saveId: uid,
      uid
    }
  }

  /** 深渊战报 */
  async getAbyss () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let oldAbyss = await mysApi.getData("oldAbyss", { headers })
    let newAbyss = await mysApi.getData("newAbyss", { headers })
    const isNewAbyssValid = newAbyss?.retcode === 0 && newAbyss.data
    const isOldAbyssValid = oldAbyss?.retcode === 0 && oldAbyss.data
    if (!isNewAbyssValid && !isOldAbyssValid) {
      await this.e.reply(`UID:${uid}暂无深渊数据`)
      return false
    }
    let reports = []
    let isOldData = false
    if (isNewAbyssValid && newAbyss.data.reports && newAbyss.data.reports.length > 0) {
      reports = newAbyss.data.reports.map(report => {
        const date = new Date(report.updated_time_second * 1000)
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
        return {
          ...report,
          updated_time: formattedDate,
          score: report.score.toLocaleString()
        }
      })
    } else if (isOldAbyssValid && oldAbyss.data.reports && oldAbyss.data.reports.length > 0) {
      isOldData = true
      reports = oldAbyss.data.reports.map(report => {
        const date = new Date(report.time_second * 1000)
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
        return {
          ...report,
          updated_time: formattedDate,
          score: report.score.toString(),
          isOldData: true
        }
      })
      reports = reports.reverse()
    } else {
      await this.e.reply(`UID:${uid}暂无深渊数据`)
      return false
    }
    return {
      ...this.screenData,
      reports,
      isOldData,
      saveId: uid,
      uid
    }
  }

  async getBattleField () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let res = await mysApi.getData("battleField", { headers })
    if (!res.data.reports || res.data.reports.length === 0) {
      await this.e.reply(`UID:${uid}暂无记忆战场数据`)
      return false
    }
    let reports = res.data.reports.map(report => {
      const date = new Date(report.time_second * 1000)
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
      const battleInfo = report.battle_infos && report.battle_infos[0] ? report.battle_infos[0] : {}
      return {
        ...report,
        updated_time: formattedDate,
        boss: battleInfo.boss || {},
        lineup: battleInfo.lineup || [],
        elf: battleInfo.elf || null,
        score: report.score,
        rank: report.rank,
        ranking_percentage: report.ranking_percentage,
        area: report.area,
        battle_infos: report.battle_infos || []
      }
    })
    return {
      ...this.screenData,
      reports,
      saveId: uid,
      uid
    }
  }
}