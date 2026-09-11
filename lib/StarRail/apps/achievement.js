import fetch from "node-fetch"
import { Button, MysInfo, gsCfg } from "#index"

export class achievement extends plugin {
  constructor () {
    super({
      name: "[StarRail/achievement.js]星铁成就查漏",
      dsc: "星铁成就查漏",
      event: "message",
      priority: 49,
      rule: [
        { reg: "^#星铁成就查漏(第(\\d+)页)?$", fnc: "achievement" }
      ]
    })
    this.lable = gsCfg.getdefSet("index", "sr_index")
  }

  /** 成就查漏 */
  async achievement (e) {
    let pageMatch = e.msg.match(/第(\d+)页/)
    let currentPage = pageMatch ? parseInt(pageMatch[1]) : 1
    let pageSize = 25
    let info = await this.getData(e)
    if (!info) return
    let res = null
    let host = "https://act-api-takumi.mihoyo.com"
    try {
      res = await (await fetch(`${host}/event/rpgcultivate/achievement/list?game=hkrpg&game_biz=${info.game_biz}&badge_region=${info.region}&badge_uid=${info.game_uid}&show_hide=true&page_size=1000000&page_num=1&need_all=false&noSessionRetry=true`, {
        method: "GET",
        headers: { cookie: info.cookie }
      })).json()
      if (!res || res.retcode !== 0 || !res.data) {
        logger.error(`API返回错误: ${JSON.stringify(res)}`)
        this.reply(`UID:${info.game_uid}查询失败！错误代码: ${res?.retcode || "unknown"}`)
        return
      }
      logger.info("成就数据获取成功")
      logger.info(`成就列表长度: ${res.data.achievement_list?.length || 0}`)
      logger.info(`成就系列数量: ${res.data.achievement_series_list?.length || 0}`)
    } catch (err) {
      logger.error(`UID:${info.game_uid}请求成就接口失败: ${err}`)
      this.reply(`UID:${info.game_uid}查询失败！`)
      return
    }
    let allAchievements = this.processAchievements(res.data)
    let totalPages = Math.ceil(allAchievements.total_count / pageSize)
    if (currentPage > totalPages) {
      this.reply(`页数超出范围！总共${totalPages}页，请输入1-${totalPages}之间的页数`)
      return
    }

    let startIndex = (currentPage - 1) * pageSize
    let endIndex = startIndex + pageSize
    let pageAchievements = {
      list: allAchievements.list.slice(startIndex, endIndex),
      total_count: allAchievements.total_count
    }
    logger.info(`第${currentPage}页，显示第${startIndex + 1}-${Math.min(endIndex, allAchievements.total_count)}个成就`)
    this._path = process.cwd().replace(/\\/g, "/")
    let html = {
      info,
      achievements: pageAchievements,
      showTopInfo: true,
      achievement_number: allAchievements.total_count,
      name: info.nickname || "旅行者",
      uid: info.game_uid,
      user_id: e.user_id,
      avater: res?.data?.avatar_url,
      gameResPath: `${this._path}/plugins/genshin/resources/StarRail/`,
      middleHeight: Math.max(180, pageAchievements.list.length * 85 + 150),
      pageInfo: `共${allAchievements.total_count}个未完成成就`,
      currentPage,
      totalPages,
      pageStart: startIndex + 1,
      saveId: this.e.uid,
      pageEnd: Math.min(endIndex, allAchievements.total_count),
      achievement: this.lable.achievement,
      layoutcopyright: "Powered by genshin & Designed by Aozaki Arina(860563585)"
    }
    this.reply([await this.renderImg("genshin", "StarRail/html/achievement/achievementList", html, { retType: "base64" }), new Button(this.e).gameTime()])
  }

  /** 处理成就数据 - 只显示未完成的成就 */
  processAchievements (data) {
    let achievements = []
    logger.info("开始处理成就数据...")
    if (data.achievement_list && data.achievement_list.length > 0) {
      let unfinishedAchievements = data.achievement_list.filter(item => !item.finished)
      achievements = unfinishedAchievements.map(item => {
        let reward = this.getRewardByRarity(item.rarity)
        let isHide = item.is_hide === true || item.is_hide === "true" || item.is_hide === 1
        if (isHide) {
        }
        let achievementData = {
          id: item.id,
          name: this.cleanRichText(item.title) || "暂无名称",
          desc: this.cleanRichText(item.desc) || "暂无描述",
          reward,
          rarity: item.rarity || "Low",
          is_finished: item.finished,
          is_hide: isHide ? "true" : "false",
          icon: item.icon || "",
          sub_achievements: []
        }
        if (item.sub_achievements && item.sub_achievements.length > 0) {
          let unfinishedSubAchievements = item.sub_achievements.filter(subItem => !subItem.finished)
          achievementData.sub_achievements = unfinishedSubAchievements.map(subItem => {
            let subIsHide = subItem.is_hide === true || subItem.is_hide === "true" || subItem.is_hide === 1
            if (subIsHide) {
            }
            return {
              id: subItem.id,
              name: this.cleanRichText(subItem.text) || "未知成就",
              desc: this.cleanRichText(subItem.text) || "暂无描述",
              reward: this.getRewardByRarity(subItem.rarity),
              rarity: subItem.rarity || "Low",
              is_finished: subItem.finished,
              is_hide: subIsHide ? "true" : "false",
              icon: subItem.icon || ""
            }
          })
        }

        return achievementData
      })
    } else {
    }
    return {
      list: achievements,
      total_count: achievements.length
    }
  }

  /** 根据稀有度获取奖励原石数量 */
  getRewardByRarity (rarity) {
    // 将稀有度转换为小写进行匹配
    const rarityLower = rarity ? rarity.toLowerCase() : "low"

    switch (rarityLower) {
      case "low":
        return 5
      case "mid":
        return 10
      case "high":
        return 20
      default:
        return 5
    }
  }

  /** 清理富文本标签，提取颜色信息 */
  cleanRichText (text) {
    if (!text) return text

    // 先处理转义的换行符
    let cleanText = text.toString()
      .replace(/\\n/gi, " ") // 转义换行符替换为空格
      .replace(/\n/gi, " ") // 普通换行符替换为空格

    // 清理所有富文本标签
    return cleanText
      .replace(/<color=#[a-fA-F0-9]{6,8}>/gi, "") // 移除颜色开始标签
      .replace(/<color=[a-zA-Z#0-9]+>/gi, "") // 移除所有颜色开始标签
      .replace(/<\/color>/gi, "") // 移除颜色结束标签
      .replace(/<n>/gi, " ") // 换行标签替换为空格
      .replace(/<\/n>/gi, " ") // 换行结束标签替换为空格
      .replace(/<\/?b>/gi, "") // 移除粗体标签
      .replace(/<\/?i>/gi, "") // 移除斜体标签
      .replace(/<\/?u>/gi, "") // 移除下划线标签
      .replace(/<size=\d+>/gi, "") // 移除字体大小开始标签
      .replace(/<\/size>/gi, "") // 移除字体大小结束标签
      .replace(/<\/?material[^>]*>/gi, "") // 移除材料标签
      .replace(/<\/?sprite[^>]*>/gi, "") // 移除精灵标签
      .replace(/<\/?unbreak>/gi, "") // 移除不换行标签
      .replace(/<[^>]*>/gi, "") // 移除所有其他HTML/富文本标签
      .replace(/\s{2,}/g, " ") // 多个空格合并为一个
      .trim()
  }

  async getData (e) {
    let mysInfo = await MysInfo.init(e, "avatarInfo")
    let cookie = mysInfo.ckInfo.ck
    let response = await fetch(`https://api-takumi.mihoyo.com/common/badge/v1/login/account?game_biz=hkrpg_cn&lang=zh-cn&region=${this.getServer(e.uid)}&uid=${e.uid}`, {
      method: "POST",
      headers: { cookie }
    })
    let res = await response.json()
    logger.error(JSON.stringify(res))
    let setCookie = response.headers.get("set-cookie")
    cookie += setCookie.match(/e_hkrpg_token=([^;]*)/)?.[0] || ""
    return { cookie, ...res.data }
  }

  getServer (uid) {
    switch (String(uid).slice(0, -8)) {
      case "1":
      case "2":
        return "prod_gf_cn" /** 官服 */
      case "5":
        return "prod_qd_cn" /** B服 */
      case "6":
        return "prod_official_usa" /** 美服 */
      case "7":
        return "prod_official_euro" /** 欧服 */
      case "8":
      case "18":
        return "prod_official_asia"/** 亚服 */
      case "9":
        return "prod_official_cht" /** 港澳台服 */
    }
    return "prod_gf_cn"
  }
}