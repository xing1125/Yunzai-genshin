import { base, MysInfo, gsCfg } from "#index"

export default class roleAchievement extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "gs_index")
  }

  // 根据成就数量和总原石数，智能分配不同原石价值的成就
  // 模拟真实的原石分配：大部分5原石，少数10、20原石
  calculateAchievementDistribution (totalCount, totalPrimogems) {
    if (totalCount <= 0 || totalPrimogems <= 0) {
      return { rewards: [], earnedPrimogems: 0 }
    }
    // 可能的原石奖励等级（原神实际的奖励等级）
    const rewardLevels = [5, 10, 20]
    const avgPrimogems = totalPrimogems / totalCount
    // 如果平均值刚好是5，全部都是5原石成就
    if (avgPrimogems <= 5) {
      return {
        rewards: Array(totalCount).fill(5),
        earnedPrimogems: totalCount * 5
      }
    }
    // 智能分配算法：优先分配5原石，然后根据需要添加更高价值的成就
    let remaining = totalCount
    let remainingPrimogems = totalPrimogems
    const distribution = { 5: 0, 10: 0, 20: 0 }
    // 从最高价值开始分配，确保能达到目标总原石数
    for (let i = rewardLevels.length - 1; i >= 0; i--) {
      const rewardValue = rewardLevels[i]
      if (remaining <= 0 || remainingPrimogems <= 0) break
      // 计算这个等级最多能分配多少个
      const maxCount = Math.floor(remaining)
      const neededCount = Math.floor((remainingPrimogems - (remaining - 1) * 5) / (rewardValue - 5))
      const actualCount = Math.max(0, Math.min(maxCount, neededCount))
      if (actualCount > 0) {
        distribution[rewardValue] = actualCount
        remaining -= actualCount
        remainingPrimogems -= actualCount * rewardValue
      }
    }
    // 剩余的都分配为5原石
    if (remaining > 0) {
      distribution[5] = remaining
      remainingPrimogems -= remaining * 5
    }
    // 生成奖励数组
    const rewards = []
    for (const [reward, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) {
        rewards.push(parseInt(reward))
      }
    }
    // 随机打乱数组，让高价值成就分布更自然
    for (let i = rewards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rewards[i], rewards[j]] = [rewards[j], rewards[i]]
    }
    return {
      rewards,
      earnedPrimogems: rewards.reduce((sum, reward) => sum + reward, 0)
    }
  }

  async get () {
    let ApiData = {
      index: "",
      achievement: ""
    }
    let res = await MysInfo.get(this.e, ApiData)
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) return false
    if (res[1].data.has_detail_data === "false") {
      return false
    }
    let resIndex = res[0].data
    let achData = res[1].data
    let list = achData.list
    let totalPrimogems = 0
    let earnedPrimogems = 0
    // 处理成就列表，添加原石计算
    list.forEach(achievement => {
      const labelKey = achievement.name
      const labelValue = this.lable[labelKey]
      if (labelValue && typeof labelValue === "string") {
        const labelParts = labelValue.split(":")
        const totalCount = parseInt(labelParts[0]) || 0
        const totalPrimogemsForCategory = parseInt(labelParts[1]) || 0
        const shortName = labelParts[2] || null
        achievement.totalCount = totalCount
        achievement.totalPrimogems = totalPrimogemsForCategory
        achievement.shortName = shortName
        // 根据成就数量和总原石数，智能分配不同原石价值的成就
        const distribution = this.calculateAchievementDistribution(totalCount, totalPrimogemsForCategory)
        // 按比例计算已获取的原石数
        if (totalCount > 0) {
          const completionRatio = achievement.finish_num / totalCount
          // 计算完成百分比
          achievement.percentage = Math.round(completionRatio * 100)
          // 天地万象成就特殊处理：始终按百分比计算，结果必须被5整除
          if (labelKey === "天地万象") {
            const rawEarned = Math.floor(completionRatio * totalPrimogemsForCategory)
            // 确保结果被5整除
            achievement.earnedPrimogems = Math.floor(rawEarned / 5) * 5
          } else {
            // 其他成就：如果完成度是100%，直接使用最大原石数量
            if (achievement.percentage >= 100 || achievement.finish_num >= totalCount) {
              achievement.earnedPrimogems = totalPrimogemsForCategory
            } else {
              // 根据完成进度计算获得的原石
              // 假设玩家优先完成低价值成就，然后是高价值成就
              const sortedRewards = distribution.rewards.sort((a, b) => a - b)
              const completedCount = Math.floor(completionRatio * totalCount)

              let earnedForThisCategory = 0
              for (let i = 0; i < completedCount; i++) {
                earnedForThisCategory += sortedRewards[i] || 5
              }
              achievement.earnedPrimogems = earnedForThisCategory
            }
          }
        } else {
          achievement.earnedPrimogems = 0
          achievement.percentage = 0
        }
        totalPrimogems += achievement.totalPrimogems
        earnedPrimogems += achievement.earnedPrimogems
      } else {
        achievement.totalCount = 0
        achievement.totalPrimogems = 0
        achievement.earnedPrimogems = 0
        achievement.shortName = null
        achievement.percentage = 0
      }
    })
    let data = {
      ...this.screenData,
      role: resIndex.role,
      roleIndex: resIndex.stats,
      list,
      achData,
      lable: this.lable,
      totalPrimogems,
      earnedPrimogems
    }
    return data
  }
}