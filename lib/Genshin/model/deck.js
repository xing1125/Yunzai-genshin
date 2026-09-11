import _ from "lodash"
import { base, MysInfo } from "#index"

export default class Deck extends base {
  static async get (e) {
    let deckdataIndex = new Deck(e)
    return await deckdataIndex.getIndexData()
  }

  /** 七圣卡组 */
  async getIndex (id, list = false) {
    let res = await MysInfo.get(this.e, "deckList")
    if (res?.retcode !== 0) return false
    let Data
    if (!list) {
      for (let i of res.data.deck_list) {
        if (i.id == id) Data = i
      }
      if (!Data) {
        this.e.reply(`无牌组${id}，请查看#七圣卡组列表`)
        return false
      }
    } else {
      Data = res.data.deck_list
    }
    let data = {
      ...this.screenData,
      nickname: res.data.nickname,
      level: res.data.level,
      Data
    }
    return data
  }

  /** 七圣卡牌列表 */
  async getcard (id) {
    let res = {}
    for (let api of ["basicInfo", "avatar_cardList", "action_cardList"]) {
      if ((id == 2 && api == "avatar_cardList") || (id == 1 && api == "action_cardList")) continue
      res[api] = (await MysInfo.get(this.e, api)).data
    }
    let data = {
      ...this.screenData,
      ...res
    }
    return data
  }

  async getIndexData () {
    let ApiData = {
      index: "",
      basicInfo: "",
      avatar_cardList: "",
      action_cardList: ""
    }
    let res = await MysInfo.get(this.e, ApiData)
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) return false
    let ret = []
    res.forEach(v => ret.push(v.data))
    let data = {
      ...this.screenData,
      ...this.dealData(ret)
    }
    return data
  }

  dealData (data) {
    let [resIndex, basicInfo, avatar_cardList, action_cardList] = data
    let nickname = resIndex.role.nickname
    let rolecardList = avatar_cardList.card_list || []
    let actioncList = action_cardList.card_list || []
    let all_count = 0
    let all_proficiency = 0
    let used_card = []
    let used_role = []
    for (let j in actioncList) {
      if (actioncList[j].use_count != 0) {
        used_card.push(actioncList[j])
      }
    }
    for (let i in rolecardList) {
      if (rolecardList[i].use_count != 0) {
        used_role.push(rolecardList[i])
      }
      let proficiency = rolecardList[i].proficiency
      let use_count = rolecardList[i].use_count
      all_count = all_count + use_count
      all_proficiency = all_proficiency + proficiency
    }
    all_count = Math.ceil(all_count / 3)
    all_proficiency = Math.ceil(all_proficiency / 3)
    let winning_probability = all_proficiency / all_count * 100
    winning_probability = winning_probability.toFixed(2)
    jsonSort(used_card, "use_count")
    jsonSort(used_role, "proficiency")
    let frequently_win = used_role.slice(0, 4)
    let used_role_index = 1
    for (let i in used_role) {
      if (used_role[i].proficiency != 0) {
        used_role[i].role_win_rate = (used_role[i].proficiency / used_role[i].use_count * 100).toFixed(2)
      } else {
        used_role[i].role_win_rate = 0
      }
      used_role[i].index = used_role_index
      used_role[i].oc_rate = (used_role[i].use_count / all_count * 100).toFixed(2)
      used_role_index = used_role_index + 1
    }
    let used_card_index = 1
    for (let i in used_card) {
      used_card[i].index = used_card_index
      used_card_index = used_card_index + 1
    }
    if (used_card_index > 50) {
      used_card = used_card.slice(0, 50)
    }
    let line = [
      [
        { label: "总局数", num: all_count },
        { label: "胜场数", num: all_proficiency },
        { label: "胜率", num: `${winning_probability}%` }
      ]
    ]
    return {
      nickname,
      line,
      basicInfo,
      used_card,
      used_role,
      frequently_win,
      all_count
    }
  }

  /** 七圣战绩 */
  async getData () {
    let res = {}
    await this.e.reply("正在获取数据，请稍后...")
    for (let api of ["basicInfo", "avatar_cardList", "action_cardList"]) {
      res[api] = (await MysInfo.get(this.e, api)).data
    }
    const uid = this.e.uid
    if (!res.basicInfo || !res.avatar_cardList || !res.action_cardList) {
      return false
    }
    if (res.basicInfo.avatar_card_num_gained === 0) {
      await this.e.reply("您还没有获得任何卡牌，无法查询。", true, { recallMsg: 60 })
      return false
    }
    let gcgData = {
      uid
    }
    /** 读取gcgBasicInfo 获取等级和卡牌数量 */
    gcgData.level = res.basicInfo.level /** 牌手等级 */
    gcgData.nickname = res.basicInfo.nickname /** 牌手昵称 */
    gcgData.avatar_card_num_gained = res.basicInfo.avatar_card_num_gained /** 角色卡牌数量 */
    gcgData.avatar_card_num_total = res.basicInfo.avatar_card_num_total /** 全角色卡牌数量 */
    gcgData.action_card_num_gained = res.basicInfo.action_card_num_gained /** 行动卡牌数量 */
    gcgData.action_card_num_total = res.basicInfo.action_card_num_total /** 全行动卡牌数量 */
    if (!res.avatar_cardList.card_list || res.avatar_cardList.card_list.length === 0) {
      this.e.reply("卡牌数据为空", true)
      return false
    }
    const [replayList, avatarCardResults, actionCardResult] =
      await Promise.all([
        this.getReplayData(res.basicInfo?.replays),
        this.getAvatarData(res.avatar_cardList.card_list),
        this.getActionData(res.action_cardList.card_list)
      ])
    const { totalRound, totalWinRound, avatarCardResult } = avatarCardResults
    gcgData.total_round = totalRound
    gcgData.total_win_round = totalWinRound
    gcgData.avatar_card_list = avatarCardResult
    gcgData.action_card_list = actionCardResult
    /** 处理胜率 */
    gcgData.win_rate = (totalWinRound === 0 ? 0 : (totalWinRound / totalRound * 100))
    let baseRenderData = {
      ...this.screenData,
      gcgData
    }
    const avatarRenderData = {
      ...baseRenderData,
      omitBackground: true,
      renderType: "avatar"
    }
    const actionRenderData = {
      ...baseRenderData,
      omitBackground: true,
      renderType: "action"
    }
    return { avatarRenderData, actionRenderData }
  }

  /**
 * 处理接口返回的角色卡牌数据
 * @param avatarCardList
 * @return {Promise<{avatarCardResult: *, totalRound: number, totalWinRound: number}>}
 */
  async getAvatarData (avatarCardList) {
    let totalWinRound = 0
    let totalRound = 0
    let result = avatarCardList
      .filter(card => {
        if (card.proficiency > card.use_count) {
          card.use_count = card.proficiency
        }
        /** 如果使用次数为0，不显示 */
        if (card.use_count === 0) {
          return false
        }
        totalWinRound += card.proficiency
        totalRound += card.use_count
        return true
      })
      .map(card => {
        return {
          card_id: card.id,
          card_name: card.name,
          use_count: card.use_count,
          proficiency: card.proficiency,
          card_num: card.num,
          win_rate: (card.proficiency / card.use_count * 100).toFixed(3)
        }
      })
    totalRound = Math.ceil(totalRound / 3)
    totalWinRound = Math.ceil(totalWinRound / 3)
    /** 计算使用率 */
    result = result.map(card => {
      const usage_rate = ((card.use_count / totalRound) * 100).toFixed(3)
      return { ...card, usage_rate }
    })
    /** 按熟练度排序 */
    result = _.sortBy(result, (o) => {
      return -o.proficiency
    })
    return {
      totalRound,
      totalWinRound,
      avatarCardResult: result
    }
  }

  /**
   * 处理接口返回的行动卡牌数据
   * @param actionCardList
   * @return {Promise<*>}
   */
  async getActionData (actionCardList) {
    let totalUsage = 0
    let result = actionCardList
      .filter(card => {
        /** 如果使用次数为0，不显示 */
        totalUsage += card.use_count
        return card.use_count !== 0
      })
      .map(card => {
        const card_type = this.getActionCardType(card.card_type)
        return {
          card_id: card.id,
          card_name: card.name,
          card_type,
          use_count: card.use_count,
          card_num: card.num
        }
      })
    /** 计算使用率 */
    result = result.map(card => {
      const usage_rate = ((card.use_count / totalUsage) * 100).toFixed(3)
      return { ...card, usage_rate }
    })
    /** 按使用次数排序 */
    result = _.sortBy(result, (o) => {
      return -o.use_count
    })

    return result
  }

  /**
   * 比较新旧角色卡牌数据的熟练度和使用次数变化
   * @param avatarCardResult
   * @return {Promise<*>}
   */
  async compareAvatarDataChanges (avatarCardResult) {
    /** 获取上一次查询的数据 */
    const oldAvatarCardResult = await redis.get(`${this.cacheKey.avatarCardResultCacheKey}:${this.e.uid}`)
    if (!oldAvatarCardResult) {
      console.log("没有上一次查询的数据，跳过比较")
      return false
    }
    const oldAvatarCardResultObj = JSON.parse(oldAvatarCardResult)
    /** 比较新旧数据的熟练度和使用次数变化 */
    let changedData = []
    /** 校验新数据数量是否比旧数据少 */
    if (avatarCardResult.length < oldAvatarCardResultObj.length) {
      this.e.reply("数据异常", true)
      throw new Error("数据异常")
    }
    for (let val of avatarCardResult) {
      const oldCard = oldAvatarCardResultObj.find(card => card.card_id === val.card_id)
      if (!oldCard) {
        /** 如果旧数据中不存在该卡牌，说明是新卡牌 */
        changedData.push({
          card_name: val.card_name,
          use_count_change: val.use_count,
          proficiency_change: val.proficiency,
          proficiency: val.proficiency,
          isNew: true
        })
        continue
      }
      const oldProf = oldCard.proficiency
      const newProf = val.proficiency
      const oldUsage = oldCard.use_count
      const newUsage = val.use_count
      /** 理论上来说要检查新数据的值是否比旧数据小，但是我懒得写了 */
      if (oldProf !== newProf || oldUsage !== newUsage) {
        changedData.push({
          card_name: val.card_name,
          use_count_change: newUsage - oldUsage,
          proficiency_change: newProf - oldProf,
          proficiency: val.proficiency,
          isNew: false
        })
      }
    }
    /** 排序，熟练度变动多的在前 */
    changedData = _.sortBy(changedData, (o) => {
      return -o.proficiency_change
    })
    return changedData
  }

  /**
   * 根据接口返回的 card_type 获取行动牌类型
   * @param card_type
   * @return {string}
   */
  getActionCardType (card_type) {
    switch (card_type) {
      case "CardTypeModify":
        return "装备牌"
      case "CardTypeAssist":
        return "支援牌"
      case "CardTypeEvent":
        return "事件牌"
      default:
        return "未知"
    }
  }

  /**
   * 从 GcgBasicInfo 里获取最近2场对局信息
   * @param replays
   * @return {Promise<void>}
   */
  async getReplayData (replays) {
    let replayList = []
    try {
      /** 用于卡组胜率测试 */
      for (let i = 0; i < replays.length; i++) {
        const replay = replays[i]
        const game_id = replay.game_id
        const matchType = replay.match_type
        const isWin = replay.is_win
        const selfOverflow = replay.self.is_overflow
        const oppositeOverflow = replay.opposite.is_overflow
        const oppositeName = replay.opposite.name
        replayList.push({
          game_id,
          match_type: matchType,
          is_win: isWin,
          oppositeName,
          selfOverflow,
          oppositeOverflow
        })
      }
    } catch (err) {
      logger.error("获取对局数据错误", err)
    }
    return replayList
  }
}

function jsonSort (array, field, order) {
/** 数组长度小于2 或 没有指定排序字段 或 不是json格式数据 */
  if (array.length < 2 || !field || typeof array[0] !== "object") {
    console.log("警告: 当前数组长度小于2 或 没有指定排序字段 或 不是json格式数据。返回原始数据！")
    return array
  }
  /** json中没有field对应的字段 */
  if (array[0][field] == undefined) {
    console.log("错误: 当前Json没有字段: " + field)
  } else {
    /** field的内容是数字 */
    if (typeof array[0][field] === "number") {
      array.sort(function (y, x) { return x[field] - y[field] })
    } else if (typeof array[0][field] === "string") {
      /** field的内容是字符串 */
      /** 当field的值为null时，按当成大值处理 */
      array.sort(function (x, y) {
        if (x[field] == null) return 1
        else if (y[field] == null) return -1
        else {
          return x[field].localeCompare(y[field])
        }
      })
    }
    if (order != false) {
      order = true
    }
    if (order) return array
    else return array.reverse()
  }
}