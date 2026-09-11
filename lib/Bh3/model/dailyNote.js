import { base, MysInfo } from "#index"

export default class note extends base {
  /** 体力 */
  async Note () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let note = await mysApi.getData("dailyNote", { headers })
    if (note?.retcode !== 0) return false
    let daily = note.data
    if (!daily) {
      await this.e.reply(`UID:${uid}体力数据获取失败`)
      return false
    }
    daily = this.processTimeData(daily)
    return {
      ...this.screenData,
      daily,
      uid,
      saveId: uid
    }
  }

  formatTimeDiff (timestamp) {
    const now = Math.floor(Date.now() / 1000)
    const diff = timestamp - now
    if (diff <= 0) {
      return "已结束"
    }
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const displayHours = minutes >= 0 ? hours + 1 : hours
    return `${String(days).padStart(2, "0")} 天 / ${String(displayHours).padStart(2, "0")} 小时`
  }

  formatStaminaTime (seconds) {
    if (seconds <= 0) {
      return "已全部恢复"
    }
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h:${String(minutes).padStart(2, "0")}min`
  }

  processTimeData (daily) {
    if (daily.stamina_recover_time !== undefined) {
      daily.stamina_recover_time = this.formatStaminaTime(daily.stamina_recover_time)
    }
    if (daily.greedy_endless && daily.greedy_endless.schedule_end) {
      daily.greedy_endless.schedule_end = this.formatTimeDiff(daily.greedy_endless.schedule_end)
    }
    if (daily.ultra_endless && daily.ultra_endless.schedule_end) {
      daily.ultra_endless.schedule_end = this.formatTimeDiff(daily.ultra_endless.schedule_end)
    }
    if (daily.battle_field && daily.battle_field.schedule_end) {
      daily.battle_field.schedule_end = this.formatTimeDiff(daily.battle_field.schedule_end)
    }
    if (daily.god_war && daily.god_war.schedule_end) {
      daily.god_war.schedule_end = this.formatTimeDiff(daily.god_war.schedule_end)
    }
    return daily
  }
}