import _ from "lodash"
import fs from "node:fs"
import fetch from "node-fetch"
import { Button, MysInfo } from "#index"

export class gameTime extends plugin {
  constructor () {
    super({
      name: "[gameTime.js]游戏注册时间",
      dsc: "查询游戏注册时间",
      event: "message",
      priority: 49,
      rule: [
        { reg: "^(#|\\*)?(我的)?(原神|星铁|绝区零)注册时间$", fnc: "QuerySingleRegTime" },
        { reg: "^(#|\\*)?(我的)?(注册时间|三游注册时间|全部注册时间)$", fnc: "QueryAllRegTime" }
      ]
    })
    this._path = process.cwd().replace(/\\/g, "/")
  }

  getGamesList (targetKey = "") {
    const allGames = [
      {
        key: "gs",
        name: "原神",
        isSr: false,
        getData: this.getGenshinData.bind(this),
        config: {
          host: "https://hk4e-api.mihoyo.com",
          targetMonth: 8,
          targetDay: 28,
          urlTemplate: (h, y, i) => `${h}/event/e${y}0928anniversary/data?badge_uid=${i.game_uid}&badge_region=${i.region}&lang=zh-cn&game_biz=${i.game_biz}`,
          dataPath: "data.data"
        },
        levelName: "冒险等阶",
        defaultAvatar: "https://upload-bbs.mihoyo.com/game/ys/app_icon.png",
        getBg: async () => {
          const metaGsPath = `${this._path}/plugins/miao-plugin/resources/meta-gs/character/`
          const folders = fs.existsSync(metaGsPath)
            ? fs
              .readdirSync(metaGsPath)
              .filter((f) => !f.includes(".") && f !== "common")
            : []
          return folders.length > 0
            ? `${metaGsPath}${_.sample(folders)}/imgs/card.webp`
            : `${this._path}/plugins/genshin/resources/Mys/img/gameTime/bg.webp`
        },
        getAvatar: (resIndex) => resIndex?.data?.role?.game_head_icon
      },
      {
        key: "sr",
        name: "崩坏：星穹铁道",
        isSr: true,
        getData: this.getStarRailData.bind(this),
        config: {
          targetMonth: 3,
          targetDay: 26,
          urlTemplate: (h, y, i) => `${h}/event/e${y}0426anniversary/data?plat=2&lang=zh-cn&badge_uid=${i.game_uid}&badge_region=${i.region}&game_biz=${i.game_biz}`,
          dataPath: "data.raw_data"
        },
        levelName: "开拓等级",
        defaultAvatar: "https://upload-bbs.mihoyo.com/game/sr/app_icon.png",
        getBg: async (resIndex) => {
          const bg = resIndex?.data?.phone_background_image_url
          return bg || `${this._path}/plugins/genshin/resources/Mys/img/gameTime/sr/${_.sample(fs.readdirSync(`${this._path}/plugins/genshin/resources/Mys/img/gameTime/sr/`))}`
        },
        getAvatar: (resIndex) => resIndex?.data?.cur_head_icon_url
      },
      {
        key: "zzz",
        name: "绝区零",
        isSr: false,
        getData: this.getZZZData.bind(this),
        config: {
          host: "https://api-takumi.mihoyo.com",
          targetMonth: 6,
          targetDay: 29,
          urlTemplate: (h, y, i) => `${h}/event/e${y}0729anniversary/data?badge_uid=${i.game_uid}&badge_region=${i.region}&game_biz=${i.game_biz}&lang=zh-cn`,
          dataPath: "data.extra_data"
        },
        levelName: "探索等级",
        defaultAvatar: "https://upload-bbs.mihoyo.com/game/zzz/app_icon.png",
        getBg: async () =>
          `${this._path}/plugins/genshin/resources/Mys/img/gameTime/bg.webp`,
        getAvatar: (resBasicOrIndex) => resBasicOrIndex?.data?.avatar || resBasicOrIndex?.data?.cur_head_icon_url
      }
    ]
    return targetKey ? allGames.filter(g => g.key === targetKey) : allGames
  }

  async performRegQuery (games, e) {
    const results = []
    const missingGames = []
    let hasSuccess = false
    for (const game of games) {
      try {
        const gameE = { ...e, game: game.key, isSr: game.isSr, noTips: true }
        const info = await game.getData(gameE)
        if (!info || !info.cookie) {
          logger.mark(`[注册时间] 跳过未绑定 Cookie 的游戏: ${game.key}`)
          missingGames.push(game.name)
          continue
        }
        if (game.key === "sr") {
          game.config.host = info.region.includes("prod_official")
            ? "https://sg-public-api.hoyoverse.com"
            : "https://api-takumi.mihoyo.com"
        }
        const registerTime = await this.getRegTime(
          info,
          game.key,
          game.config
        )
        if (registerTime) {
          const resIndex = await MysInfo.get(gameE, "index")
          let avater
          if (game.key === "zzz") {
            const resBasic = await MysInfo.get(gameE, "basicInfo")
            avater = game.getAvatar(resBasic) || game.defaultAvatar
          } else {
            avater = game.getAvatar(resIndex) || game.defaultAvatar
          }
          const result = {
            name: game.name,
            info,
            registerTime,
            levelName: game.levelName,
            avater,
            bg: await game.getBg(resIndex),
            saveId: this.getSeed_id()
          }
          results.push(result)
          hasSuccess = true
        }
      } catch (err) {
        logger.error(`[注册时间][${game.key.toUpperCase()}] ${err}`)
      }
      if (game !== games[games.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    return { results, missingGames, hasSuccess }
  }

  async QuerySingleRegTime (e) {
    const _origNoTips = e.noTips
    e.noTips = true
    let targetGame = ""
    if (e.msg.includes("原神")) {
      targetGame = "gs"
    } else if (e.msg.includes("星铁")) {
      targetGame = "sr"
    } else if (e.msg.includes("绝区零")) {
      targetGame = "zzz"
    }
    const games = this.getGamesList(targetGame)
    const { results, missingGames, hasSuccess } = await this.performRegQuery(games, e)

    if (!hasSuccess) {
      e.noTips = _origNoTips
      if (missingGames.length > 0) {
        return this.reply("请【#扫码登录】绑定Cookie")
      }
      return this.reply(`${this.getGamesList(targetGame)[0]?.name || "该游戏"}注册时间查询失败，请稍后重试`)
    }

    await this.reply([await this.renderImg("genshin", "Mys/html/gameTime/gameTime", { results }, { retType: "base64" }), new Button(e).gameTime()])
    e.noTips = _origNoTips
  }

  async QueryAllRegTime (e) {
    const _origNoTipsAll = e.noTips
    e.noTips = true
    const games = this.getGamesList()
    const { results, missingGames, hasSuccess } = await this.performRegQuery(games, e)

    if (!hasSuccess) {
      e.noTips = _origNoTipsAll
      if (missingGames.length > 0) {
        return this.reply("请【#扫码登录】绑定Cookie")
      }
      return this.reply("注册时间查询失败，请稍后重试")
    }

    await this.reply([await this.renderImg("genshin", "Mys/html/gameTime/gameTime", { results }, { retType: "base64" }), new Button(e).gameTime()])
    if (missingGames.length > 0) {
      await this.reply(`以下游戏未绑定，已跳过：${missingGames.join("、")}。如需查询请先绑定对应 Cookie/UID。`)
    }
    e.noTips = _origNoTipsAll
  }

  async getRegTime (info, game, config) {
    const regTimePath = `${process.cwd()}/data/regtime/${game}.json`
    try {
      if (fs.existsSync(regTimePath)) {
        const regTimeData = JSON.parse(fs.readFileSync(regTimePath, "utf8"))
        if (regTimeData[info.game_uid]) return regTimeData[info.game_uid]
      }
    } catch (err) {
      logger.error(`读取注册时间缓存失败: ${err}`)
    }
    const now = new Date()
    const y = now.getFullYear()
    const targetYear = (now.getMonth() > config.targetMonth || (now.getMonth() === config.targetMonth && now.getDate() >= config.targetDay)) ? y : y - 1
    try {
      const res = await (await fetch(config.urlTemplate(config.host, targetYear, info), {
        method: "GET",
        headers: { cookie: info.cookie }
      })).json()
      if (!res || res.retcode !== 0) return this.reply(`UID:${info.game_uid}查询失败！`)
      const regTimeData = JSON.parse(_.get(res, config.dataPath))
      let registerTime
      if (game === "zzz") {
        // 绝区零 extra_data 的注册日期在字段 1_a，格式为 YYYYMMDD（无连字符）
        const rawDate = String(regTimeData?.["1_a"] || "").trim()
        if (/^\d{8}$/.test(rawDate)) {
          registerTime = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        }
      } else {
        registerTime = Object.values(regTimeData).find(v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v))
      }
      if (!registerTime) return this.reply(`UID:${info.game_uid}未找到有效的注册时间！`)
      try {
        const dir = `${process.cwd()}/data/regtime`
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const existingData = fs.existsSync(regTimePath) ? JSON.parse(fs.readFileSync(regTimePath, "utf8")) : {}
        existingData[info.game_uid] = registerTime
        fs.writeFileSync(regTimePath, JSON.stringify(existingData))
      } catch (err) {
        logger.error(`UID:${info.game_uid}保存注册时间数据失败: ${err}`)
      }
      return registerTime
    } catch (err) {
      logger.error(`UID:${info.game_uid}请求注册时间接口失败: ${err}`)
      return this.reply(`UID:${info.game_uid}查询失败！`)
    }
  }

  async getGenshinData (e) {
    const mysInfo = await MysInfo.init(e, "avatarInfo")
    if (!mysInfo || !mysInfo.ckInfo || !mysInfo.ckInfo.ck) return false
    let cookie = mysInfo.ckInfo.ck
    const res = await fetch(`https://api-takumi.mihoyo.com/common/badge/v1/login/account?game_biz=hk4e_cn&lang=zh-cn&region=${this.getGenshinServer(e.uid)}&uid=${e.uid}`, {
      method: "POST",
      headers: { cookie }
    })
    const data = await res.json()
    const setCookie = res.headers.get("set-cookie")
    cookie += setCookie?.match(/e_hk4e_token=[^;]*/)?.[0] || ""
    return { cookie, ...data.data }
  }

  async getStarRailData (e) {
    const mysInfo = await MysInfo.init(e, "avatarInfo")
    if (!mysInfo.uid || !mysInfo.ckInfo.ck) return false
    let cookie = mysInfo.ckInfo.ck
    let api = "https://api-takumi.mihoyo.com"
    const body = { game_biz: "hkrpg_cn", lang: "zh-cn", region: this.getStarRailServer(e.uid), uid: e.uid }
    if (body.region.includes("prod_official")) {
      body.game_biz = "hkrpg_global"
      api = "https://sg-public-api.hoyoverse.com"
    }
    const res = await fetch(api + "/common/badge/v1/login/account", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    const setCookie = res.headers.get("set-cookie")
    if (!data || !setCookie || data.retcode !== 0) return false
    cookie += setCookie?.match(/e_hkrpg_token=[^;]*/)?.[0] || ""
    return { cookie, ...data.data }
  }

  async getZZZData (e) {
    const mysInfo = await MysInfo.init(e, "index")
    if (!mysInfo || !mysInfo.ckInfo || !mysInfo.ckInfo.ck) return false
    let cookie = mysInfo.ckInfo.ck
    const res = await fetch(`https://api-takumi.mihoyo.com/common/badge/v1/login/account?game_biz=nap_cn&lang=zh-cn&region=${this.getZZZServer(e.uid)}&uid=${e.uid}`, {
      method: "POST",
      headers: { cookie }
    })
    const data = await res.json()
    const setCookie = res.headers.get("set-cookie")
    cookie += setCookie?.match(/e_nap_token=[^;]*/)?.[0] || ""
    return { cookie, ...data.data }
  }

  /** 获取原神服务器 */
  getGenshinServer (uid) {
    switch (String(uid)[0]) {
      case "1":
      case "2":
      case "3":
        return "cn_gf01" /** 官服 */
      case "5":
        return "cn_qd01" /** B服 */
      case "6":
        return "os_usa" /** 美服 */
      case "7":
        return "os_euro" /** 欧服 */
      case "8":
      case "18":
        return "os_asia" /** 亚服 */
      case "9":
        return "os_cht" /** 港澳台服 */
    }
    return "cn_gf01"
  }

  /** 获取星铁服务器 */
  getStarRailServer (uid) {
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
        return "prod_official_asia" /** 亚服 */
      case "9":
        return "prod_official_cht" /** 港澳台服 */
    }
    return "prod_gf_cn"
  }

  /** 获取绝区零服务器 */
  getZZZServer (uid) {
    switch (String(uid)[0]) {
      case "1":
      case "2":
      case "3":
        return "prod_gf_cn" /** 官服 */
      case "5":
        return "prod_qd_cn" /** B服 */
      case "6":
        return "prod_official_usa" /** 美服 */
      case "7":
        return "prod_official_euro" /** 欧服 */
      case "8":
      case "18":
        return "prod_official_asia" /** 亚服 */
      case "9":
        return "prod_official_cht" /** 港澳台服 */
    }
    return "prod_gf_cn"
  }

  getSeed_id (length = 5) {
    const characters = "0123456789abcdef"
    let result = ""
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)]
    }
    return result
  }
}