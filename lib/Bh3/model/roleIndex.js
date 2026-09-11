import moment from "moment"
import { base, MysInfo, gsCfg } from "#index"
import { saveGameData } from "../../../model/gameData.js"

export default class bh3Index extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "bh3_index")
    this.regionMap = {
      android01: "安卓官服",
      bb01: "哔哩哔哩",
      hun01: "渠道1服",
      hun02: "渠道2服",
      pc01: "全平台（桌面）服",
      ios01: "iOS服",
      yyb01: "应用宝服"
    }
    this.levelMap = {
      1: "禁忌",
      2: "原罪I",
      3: "原罪II",
      4: "原罪III",
      5: "苦痛I",
      6: "苦痛II",
      7: "苦痛III",
      8: "红莲",
      9: "寂灭",
      S: "寂灭",
      A: "红莲",
      B: "苦痛",
      C: "原罪",
      D: "禁忌"
    }
    this.battleFieldLevelMap = {
      1: "一档",
      2: "二档",
      3: "三档",
      4: "四档",
      5: "五档",
      6: "六档",
      7: "七档"
    }
  }

  /** 个人信息 */
  async getRoleCard () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let res = await mysApi.getData("index", { headers })
    let battleField = await mysApi.getData("battleField", { headers })
    let newAbyss = await mysApi.getData("newAbyss", { headers })
    if (res?.retcode !== 0 || battleField?.retcode !== 0 || newAbyss?.retcode !== 0) return false
    let stat = res.data.stats || {}
    let abyssChartData = []
    let maxScore = 0
    let currentLevel = "-"
    let currentLevelName = "-"
    if (newAbyss && newAbyss.data && newAbyss.data.reports) {
      abyssChartData = newAbyss.data.reports.map(report => {
        const timestamp = parseInt(report.updated_time_second)
        const date = new Date(timestamp * 1000)
        return {
          date: date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }),
          level: report.level,
          levelName: this.levelMap[report.level] || report.level,
          score: report.score,
          timestamp
        }
      }).sort((a, b) => a.timestamp - b.timestamp)
      if (abyssChartData.length > 0) {
        maxScore = Math.max(...abyssChartData.map(item => item.score))
        currentLevel = abyssChartData[0].level
        currentLevelName = abyssChartData[0].levelName
      }
    }
    let battleFieldChartData = []
    let battleFieldMaxScore = 0
    let battleFieldCurrentLevel = "-"
    let battleFieldCurrentLevelName = "-"
    if (battleField && battleField.data && battleField.data.reports) {
      battleFieldChartData = battleField.data.reports.map(report => {
        const timestamp = parseInt(report.time_second)
        const date = new Date(timestamp * 1000)
        const level = report.rank
        const levelName = this.battleFieldLevelMap[report.rank] || `${report.rank}档`
        return {
          date: date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }),
          level,
          levelName,
          score: report.score,
          rank: report.rank,
          rankingPercentage: parseFloat(report.ranking_percentage),
          timestamp
        }
      }).sort((a, b) => a.timestamp - b.timestamp)
      if (battleFieldChartData.length > 0) {
        battleFieldMaxScore = Math.max(...battleFieldChartData.map(item => item.score))
        battleFieldCurrentLevel = battleFieldChartData[0].level
        battleFieldCurrentLevelName = battleFieldChartData[0].levelName
      }
    }
    let role = {
      line: [
        { lable: "累计登舰", num: stat.active_day_number || 0, extra: Math.floor((new Date() - new Date("2016-10-14")) / (1000 * 60 * 60 * 24)) + 1 },
        { lable: "装甲数", num: stat.armor_number || 0 }
      ],
      other: [
        { lable: stat.new_abyss ? "超弦空间" : "量子流形", num: stat.new_abyss?.cup_number || this.levelMap[stat.old_abyss?.level_of_greedy] || "-", extra: stat.new_abyss ? (this.levelMap?.[stat.new_abyss?.level] || "-") : undefined },
        { lable: "记忆战场", num: (stat.battle_field_ranking_percentage || 0) + "%" },
        { lable: "往世乐土成绩", num: stat.god_war_max_challenge_score || 0 },
        { lable: "第二部箱庭", num: stat.explore_score || 0, extra: stat.explore_score_sum || 0 },
        { lable: "SSS装甲数", num: stat.sss_armor_number || 0 },
        { lable: "收藏武器数", num: stat.weapon_number || 0, extra: this.lable.weapon_num },
        { lable: "收藏五星武器数", num: stat.five_star_weapon_number || 0 },
        { lable: "收藏圣痕数", num: stat.stigmata_number || 0, extra: this.lable.stigmata_num },
        { lable: "收藏五星圣痕数", num: stat.five_star_stigmata_number || 0 },
        { lable: "服装数", num: stat.suit_number || 0 }
      ]
    }
    saveGameData("bh3", uid, {
      avatar: res.data.role?.AvatarUrl || "",
      name: res.data.role?.nickname || "",
      level: res.data.role?.level || 0,
      server: this.regionMap[res.data.role?.region] || res.data.role?.region || ""
    })
    return {
      ...this.screenData,
      role: {
        ...role,
        nickname: res.data.role?.nickname || "玩家" + uid,
        level: res.data.role?.level || 0,
        AvatarUrl: res.data.role?.AvatarUrl || ""
      },
      uid,
      saveId: uid,
      regionText: this.regionMap[res.data.role?.region] || res.data.role?.region || "未知",
      abyssLevelText: this.levelMap[stat.new_abyss?.level] || this.levelMap[stat.old_abyss?.level_of_greedy] || stat.new_abyss?.level || stat.old_abyss?.level_of_greedy || "-",
      head_background: res.data.head_background || "",
      abyssChartData: JSON.stringify(abyssChartData),
      abyssMaxScore: maxScore,
      abyssCurrentLevel: currentLevel,
      abyssCurrentLevelName: currentLevelName,
      battleFieldChartData: JSON.stringify(battleFieldChartData),
      battleFieldMaxScore,
      battleFieldCurrentLevel,
      battleFieldCurrentLevelName,
      preference: res.data.preference || {
        battle_field: 0,
        main_line: 0,
        god_war: 0,
        open_world: 0,
        abyss: 0,
        comprehensive_score: 0,
        comprehensive_rating: 1
      }
    }
  }

  /** 角色数据 */
  async getCharacter () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let res = await mysApi.getData("Character", { headers })
    if (res?.retcode !== 0) return false
    let data = res.data
    if (data && data.characters) {
      data.characters.sort((a, b) => {
        const aStar = a.character.avatar.star || 0
        const bStar = b.character.avatar.star || 0
        const aLevel = a.character.avatar.level || 0
        const bLevel = b.character.avatar.level || 0
        if (aStar !== bStar) {
          return bStar - aStar
        }
        return bLevel - aLevel
      })
    }
    return {
      ...this.screenData,
      data,
      uid,
      saveId: uid
    }
  }

  /** 武器数据 */
  async getWeapon () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let res = await mysApi.getData("Character", { headers })
    if (res?.retcode !== 0) return false
    let data = res.data
    if (data && data.characters) {
      data.characters.sort((a, b) => {
        const aWeapon = a.character.weapon || {}
        const bWeapon = b.character.weapon || {}
        const aWeaponRarity = aWeapon.rarity || 0
        const bWeaponRarity = bWeapon.rarity || 0
        if (aWeaponRarity !== bWeaponRarity) {
          return bWeaponRarity - aWeaponRarity
        }
        const aWeaponLevel = aWeapon.level || 0
        const bWeaponLevel = bWeapon.level || 0
        if (aWeaponLevel !== bWeaponLevel) {
          return bWeaponLevel - aWeaponLevel
        }
        const aHomology = aWeapon.homology_level || 0
        const bHomology = bWeapon.homology_level || 0
        if (aHomology !== bHomology) {
          return bHomology - aHomology
        }
        const aStar = a.character.avatar.star || 0
        const bStar = b.character.avatar.star || 0
        if (aStar !== bStar) {
          return bStar - aStar
        }
        const aLevel = a.character.avatar.level || 0
        const bLevel = b.character.avatar.level || 0
        return bLevel - aLevel
      })
    }
    return {
      ...this.screenData,
      data,
      uid,
      saveId: uid
    }
  }

  /** 周报数据 */
  async getWeek () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let week = await mysApi.getData("weekly", { headers })
    if (week?.retcode !== 0) return false
    let data = week.data
    if (!data) {
      await this.e.reply("周报数据获取失败")
      return false
    }
    if (!data.favorite_character && data.gold_income === 0 && data.gold_expenditure === 0 && data.active_day_number === 0 && data.online_hours === 0 && data.expended_physical_power === 0 && data.main_line_expended_physical_power_percentage === 0 && data.time_from === 0 && data.time_to === 0) {
      await this.e.reply("舰长本周暂无成绩单哦")
      return false
    }
    const fromDate = moment.unix(data.time_from)
    const toDate = moment.unix(data.time_to)
    data.time_from_text = fromDate.format("MM/DD")
    data.time_to_text = toDate.format("MM/DD")
    return {
      ...this.screenData,
      data,
      uid,
      saveId: uid
    }
  }

  async getRegTime () {
    let { mysApi, headers, uid } = await MysInfo.initBh3Api(this.e, "bh3")
    if (!mysApi) return false
    let day = await mysApi.getData("regTime", { headers })
    logger.error(JSON.stringify(day))
  }
}
