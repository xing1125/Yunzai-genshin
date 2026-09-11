import _ from "lodash"
import GsCfg from "../gsCfg.js"
import MysApi from "./mysApi.js"
import MysUser from "./MysUser.js"
import NoteUser from "./NoteUser.js"
import Button from "../other/button.js"
import DailyCache from "./DailyCache.js"

export default class MysInfo {
  static tips = "请【#扫码登录】绑定Cookie"
  static uidMsg = ""

  constructor (e) {
    if (e) {
      this.e = e
      this.userId = String(e.user_id)
    }
    /** 当前查询原神uid */
    this.uid = ""
    /** 当前ck信息 */
    this.ckInfo = {
      ck: "",
      uid: "",
      qq: "",
      ltuid: "",
      type: ""
    }
    /** ck对应MysUser对象 */
    this.ckUser = null
    this.auth = [
      "dailyNote",
      "bbs_sign_info",
      "bbs_sign_home",
      "bbs_sign",
      "ledger",
      "compute",
      "avatarSkill",
      "detail",
      "blueprint",
      "UserGame",
      "deckList",
      "avatar_cardList",
      "action_cardList",
      "avatarInfo",
      "role_combat",
      "spiralAbyss",
      "character",
      "hard_challenge",
      "hard_challenge_popularity"
    ]
    this.gtest = false
  }

  static async init (e, api) {
    await MysInfo.initCache()
    let mysInfo = new MysInfo(e)
    let onlySelfCk = false
    if (mysInfo.checkAuth(api)) {
      /** 获取ck绑定uid */
      mysInfo.uid = await MysInfo.getSelfUid(e)
      /** 标记需要自身ck */
      onlySelfCk = true
    } else {
      /** 获取uid */
      mysInfo.uid = await MysInfo.getUid(e)
    }

    if (!mysInfo.uid) {
      e.noTips = true
      return false
    }

    if (!/^(1[0-9]|[6-9])[0-9]{8}/i.test(mysInfo.uid) && api === "useCdk") {
      e.reply("兑换码使用只支持国际服uid")
      return false
    }
    mysInfo.e.uid = mysInfo.uid
    /** 获取ck */
    await mysInfo.getCookie(e, onlySelfCk)
    /** 判断回复 */
    await mysInfo.checkReply()
    return mysInfo
  }

  /**
   * 获取UID（仅获取已绑定的UID，不触发自动绑定，不返回未绑定的临时UID）
   * @param e
   * @param matchMsgUid 用于判断消息是否为uid数据
   * @returns {Promise<string|boolean|*>}
   */
  static async getUid (e, matchMsgUid = true) {
    MysInfo.setUidMsg(e)
    let user = await NoteUser.create(e)
    const game = e?.game || (e?.isSr ? "sr" : "gs")
    if (!matchMsgUid) {
      let uid = user.getUid(game)
      if (uid) return String(uid)
      if (e.noTips !== true) e.reply([MysInfo.uidMsg, new Button(this.e).bingGameUid()], false, { at: true })
      return false
    }
    let { msg = "", at = "" } = e
    let uid
    /** at用户 */
    if (at) {
      let atUser = await NoteUser.create(at)
      uid = atUser.getUid(game)
      if (uid) return String(uid)
      if (e.noTips !== true) e.reply([MysInfo.uidMsg, new Button(this.e).bingGameUid()], false, { at })
      return false
    }
    /** 严格从用户绑定记录中获取 UID */
    uid = user.getUid(game)
    if (uid) {
      return String(uid)
    }
    // 如果完全没有绑定过的 UID，发送绑定提示并返回 false
    if (e.noTips !== true) e.reply([MysInfo.uidMsg, new Button(this.e).bingGameUid()], false, { at: at || true })
    return false
  }

  /**
   * 获取ck绑定uid
   * @param e
   * @returns {Promise<boolean|*>}
   */
  static async getSelfUid (e) {
    let { msg = "", at = "" } = e
    if (!msg) return false
    let user = await NoteUser.create(e)
    let selfUser = at ? await NoteUser.create(at) : user
    const game = e?.game || (e?.isSr ? "sr" : "gs")
    if (!selfUser.hasCk) {
      if (e.noTips !== true) e.reply(["请【#扫码登录】绑定Cookie", new Button(this.e).mysButton()], false, { at: selfUser.qq })
      e.noTips = true
      return false
    }
    let uid = e?.mysSelfUid ? String(e.uid || "") : ""
    if (uid && selfUser.getUidData(uid, game)?.type === "ck") {
      return uid
    }
    return selfUser.getUid(e)
  }

  /**
   * @param e
   * @param e.apiSync 多个请求时是否同步请求
   * @param e.noTips  是否回复提示，用于第一次调用才提示，后续不再提示
   * @param api
   * * `index` 米游社原神首页宝箱等数据
   * * `spiralAbyss` 原神深渊
   * * `character` 原神角色详情
   * * `dailyNote` 原神树脂
   * * `bbs_sign` 米游社原神签到
   * * `detail` 详情
   * * `ledger` 札记
   * * `compute` 养成计算器
   * * `avatarSkill` 角色技能
   * @param data 查询数据data
   * @param option 配置
   * @param option.log 是否显示请求日志
   */
  static async get (e, api, data = {}, option = {}) {
    let mysInfo = await MysInfo.init(e, api)
    if (!mysInfo.uid || !mysInfo.ckInfo.ck) return false
    e.uid = mysInfo.uid
    let user = e.user?.getMysUser()
    option.device = user.device
    option.game = e?.game || (e?.isSr ? "sr" : "gs")
    let mysApi = new MysApi(mysInfo.uid, mysInfo.ckInfo.ck, option)
    let res
    if (_.isObject(api)) {
      let all = []
      await mysApi.getData("getFp")
      /** 同步请求 */
      if (e.apiSync) {
        res = []
        for (let i in api) {
          res.push(await mysApi.getData(i, api[i]))
        }
      } else {
        _.forEach(api, (v, i) => {
          all.push(mysApi.getData(i, v))
        })
        res = await Promise.all(all)
      }
      for (let i in res) {
        res[i] = await mysInfo.checkCode(res[i], res[i].api, mysApi, api[res[i].api], false)
        mysInfo.gtest = true
        if (res[i]?.retcode === 0) continue
        break
      }
    } else {
      res = await mysApi.getData(api, data)
      res = await mysInfo.checkCode(res, api, mysApi, data, false)
    }
    return res
  }

  /**
   * 初始化公共CK
   * @returns {Promise<void>}
   */
  static async initPubCk () {
    /** 初始化公共CK */
    let pubCount = 0
    let pubCks = GsCfg.getConfig("mys", "pubCk") || []
    for (let ck of pubCks) {
      let pubUser = await MysUser.create(ck)
      if (pubUser) {
        let ret = await pubUser.initCache({ qq: "pub" })
        if (ret) {
          pubCount++
        }
        if (pubCount >= 20) {
          break
        }
      }
    }
    logger.mark(`加载公共ck：${pubCount}个`)
  }

  /**
   * 初始化用户CK
   * 默认会将用户CK加入查询池
   * @returns {Promise<void>}
   */
  static async initUserCk () {
    /** 初始化用户缓存 */
    let userCount = 0
    await MysUser.forEach(async (mys) => {
      let ret = await mys.initCache()
      if (ret) {
        userCount++
      }
    })
    logger.mark(`加载用户UID：${userCount}个，加入查询池`)
  }

  /**
   * 初始化缓存
   * @param force 若已经初始化是否强制初始化
   * @param clearData 强制初始化时是否清除已有数据 (刷新/重置)
   * @returns {Promise<boolean>}
   */
  static async initCache (force = false, clearData = false) {
    /** 检查缓存标记 */
    const cache = DailyCache.create()
    if ((!force && await cache.get("cache-ready")) || this.initing) { return true }
    this.initing = true
    await DailyCache.clearOutdatedData()
    if (clearData) {
      await MysUser.clearCache()
    }
    /** 先初始化用户CK，减少一些公共CK中ltuid无法识别的情况 */
    await MysInfo.initUserCk()
    /** 初始化公共ck */
    await MysInfo.initPubCk()
    await cache.set("cache-ready", new Date() * 1)
    delete this.initing
    return true
  }

  static async getBingCkUid () {
    let res = await GsCfg.getBingCk()
    return { ...res.ck }
  }

  /** 获取uid绑定的ck信息 */
  static async checkUidBing (uid, game = "gs") {
    let ckUser = await MysUser.getByQueryUid(uid, game, true)
    if (ckUser && ckUser.ck) {
      return ckUser
    }
    return false
  }

  static async delDisable () {
    return await MysUser.delDisable()
  }

  /** 判断绑定ck才能查询 */
  checkAuth (api) {
    if (api === "cookie") {
      return true
    }
    if (_.isObject(api)) {
      for (let i in api) {
        if (this.auth.includes(i)) {
          return true
        }
      }
    } else if (this.auth.includes(api)) {
      return true
    }
    return false
  }

  async checkReply () {
    if (this.e.noTips === true) return
    MysInfo.setUidMsg(this.e)
    if (!this.uid) {
      this.e.reply([MysInfo.uidMsg, new Button(this.e).bingGameUid()], false, { at: true })
    }
    if (!this.ckInfo.ck && this.uid) {
      this.e.reply([`UID:${this.uid}暂无可用CK，请#扫码登录或#刷新ck`, new Button(this.e).bingStoken()])
    }
    this.e.noTips = true
  }

  /* 获取请求所需ck */
  /**
   * 获取请求所需CK
   * @param game 游戏
   * @param onlySelfCk 是否只获取uid自己对应的ck。为true则只获取uid对应ck，若无则返回为空
   * @returns {Promise<string|string|*>} 查询ck，获取失败则返回空
   */
  async getCookie (game = "gs", onlySelfCk = false) {
    if (this.ckUser?.ck) return this.ckUser?.ck
    let mysUser = await MysUser.getByQueryUid(this.uid, game, onlySelfCk)
    if (mysUser) {
      if (mysUser.ck) {
        this.ckInfo = mysUser.getCkInfo(game)
        this.ckUser = mysUser
        /** 暂时直接记录请求uid，后期优化分析MysApi请求结果分状态记录结果 */
        await mysUser.addQueryUid(this.uid, game)
      } else {
        /** 重新分配 */
        await mysUser.disable(game)
        return onlySelfCk ? "" : await this.getCookie(game)
      }
    }
    return this.ckUser?.ck
  }

  async checkCode (res, type, mysApi = {}, data = {}, isTask = false) {
    if (!res) {
      if (!isTask) this.e.reply([`UID:${this.uid}，米游社接口请求失败，暂时无法查询`, new Button(this.e).mysButton()])
      return false
    }
    res.retcode = Number(res.retcode)
    if (type === "bbs_sign") {
      if ([-5003].includes(res.retcode)) {
        res.retcode = 0
      }
    }
    switch (res.retcode) {
      case 0:
        break
      case -1:
      case -100:
      case 1001:
      case 10001:
      case 10103:
      case 10104:
        if (/(登录|login)/i.test(res.message)) {
          if (this.ckInfo.uid) {
            logger.mark(`[ Cookie失效][UID:${this.uid}][qq:${this.userId}]`)
            if (!isTask) {
              this.e.reply([`UID:${this.uid}，CK失效，请重新绑定`, new Button(this.e).mysButton()])
            }
          } else {
            logger.mark(`[公共Cookie失效][ltuid:${this.ckInfo.ltuid}]`)
            if (!isTask) this.e.reply([`UID:${this.uid}，米游社查询失败，请稍后再试`, new Button(this.e).mysButton()])
          }
        } else {
          if (!isTask) this.e.reply([`UID:${this.uid}，米游社接口报错，请稍后再试：${res.message}`, new Button(this.e).mysButton()])
        }
        break
      case 1008:
        if (!isTask) this.e.reply([`UID:${this.uid}，请先去米游社绑定角色`, new Button(this.e).mysButton()], false, { at: this.userId })
        break
      case 10101:
        if (!isTask) {
          await this.disableToday()
          this.e.reply([`UID:${this.uid}，查询已达今日上限`, new Button(this.e).mysButton()])
        }
        break
      case 10102:
        if (res.message === "Data is not public for the user") {
          if (!isTask) this.e.reply([`UID:${this.uid}，米游社数据未公开`, new Button(this.e).mysButton()], false, { at: this.userId })
        } else {
          if (!isTask) this.e.reply([`UID:${this.uid}，请先去米游社绑定角色`, new Button(this.e).mysButton()])
        }
        break
        /** 伙伴不存在~ */
      case -1002:
        if (type === "detail") res.retcode = 0
        break
      case 1034:
      case 5003:
      case 10035:
      case 10041:{
        let handler = this.e.runtime?.handler || {}
        /** 如果有注册的mys.req.err，调用 */
        if (handler.has("mys.req.err")) {
          logger.mark(`[米游社查询][UID:${this.uid}][qq:${this.userId}] 遇到验证码，尝试调用 Handler mys.req.err`)
          res = await handler.call("mys.req.err", this.e, { mysApi, type, res, data, mysInfo: this }) || res
        }
        if (res?.retcode !== 0 && res?.retcode !== 10103) {
          logger.mark(`[米游社查询失败][UID:${this.uid}][qq:${this.userId}][code:${res.retcode}]遇到验证码`)
          if (!isTask) {
            if ([5003, 10041].includes(res.retcode)) {
              this.e.reply([`UID:${this.uid}，米游社账号异常\n您可通过#绑定设备帮助  \n绑定设备id解决此问题`, new Button(this.e).mysButton()])
              break
            }
            this.e.reply([`UID:${this.uid}，米游社查询遇到验证码\n您可通过#绑定设备帮助  \n绑定设备id解决此问题`, new Button(this.e).mysButton()])
          }
        }
        if (!res || res?.retcode == 1034) {
          logger.mark(`[米游社查询失败][UID:${this.uid}][qq:${this.userId}] 遇到验证码`)
          if (!isTask) this.e.reply([`UID:${this.uid}，米游社查询遇到验证码\n您可通过#绑定设备帮助  \n绑定设备id解决此问题`, new Button(this.e).mysButton()])
        }
        break
      }
      case 10307:
        if (!isTask) this.e.reply([`UID:${this.uid}，版本更新期间，数据维护中`, new Button(this.e).mysButton()])
        break
      default:
        if (!isTask) this.e.reply([`UID:${this.uid}，米游社接口报错，暂时无法查询：${res.message || "error"}`, new Button(this.e).mysButton()])
        break
    }
    if (res.retcode !== 0) {
      logger.mark(`[mys接口报错]${JSON.stringify(res)}，UID：${this.uid}`)
    }
    if (type === "character" && res.data?.list) res.data.avatars = res.data?.list
    /** 添加请求记录（公共Cookie查询时 ckUser 为 null，需兜底避免崩溃） */
    if (!isTask && this.ckUser) await this.ckUser.addQueryUid(this.uid)
    return res
  }

  /** 删除失效ck */
  async delCk () {
    if (!this.ckUser) {
      return false
    }
    let ckUser = this.ckUser
    /** 删除记录，并清除对应user ck记录 */
    await ckUser.delWithUser()
  }

  /** 查询次数满，今日内标记失效 */
  async disableToday (game = "gs") {
    if (!this.ckUser) return
    /** 统计次数设为超限 */
    await this.ckUser.disable(game)
  }

  static setUidMsg (e) {
    const game = e?.game || (e?.isSr ? "sr" : "gs")
    switch (game) {
      case "sr":
        this.uidMsg = "请先绑定星铁UID\n示例：*绑定123456789"
        break
      case "zzz":
        this.uidMsg = "请先绑定绝区零UID\n示例：%绑定12345678"
        break
      case "wd":
        this.uidMsg = "请先绑定未定UID\n示例：&绑定12345678"
        break
      case "bh2":
        this.uidMsg = "请先绑定崩二UID\n示例：  ￥绑定12345678"
        break
      case "bh3":
        this.uidMsg = "请先绑定崩三UID\n示例：  !绑定12345678"
        break
      default:
        this.uidMsg = "请先绑定原神UID\n示例：#绑定123456789"
    }
  }

  /**
   * 初始化崩坏3 API 和 headers
   * @param {Object} e 事件对象
   * @param {string} game 游戏类型，默认为 "bh3"
   * @returns {Promise<{mysApi: MysApi, headers: Object, uid: string}>}
   */
  static async initBh3Api (e, game = "bh3") {
    let { uid, ck, game_biz, region } = await GsCfg.othergame(e)
    if (!uid) return false
    let mysApi = new MysApi(uid, ck, { game }, region, game_biz)
    let device_fp = await mysApi.getData("getFp")
    let headers = { "x-rpc-device_fp": device_fp?.data?.device_fp }
    return { mysApi, headers, uid }
  }
}
