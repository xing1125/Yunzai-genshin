import _ from "lodash"
import md5 from "md5"
import fs from "node:fs"
import YAML from "yaml"
import { MysInfo, base, Button } from "#index"

export default class Explore extends base {
  /** 获取账号数据 */
  async getAchieve (e) {
    let uid = await MysInfo.getUid(this.e)
    if (!uid) return false
    const ck = await MysInfo.checkUidBing(uid, this.e)
    if (!ck?.ltuid) {
      await this.e.reply(["请【#扫码登录】绑定Stoken", new Button(this.e).bingStoken()])
      return false
    }
    this.e.reply(`UID:${uid}正在获取米游社账号信息，请稍后...`)
    const id = ck.ltuid
    const [userInfoRes, tagsRes] = await Promise.all([fetchData(id), fetchPersonalTags(id)])
    if (!userInfoRes?.data?.user_info) {
      e.reply(`UID:${uid}获取用户信息失败`)
      return false
    }
    const { user_info: userInfo } = userInfoRes.data
    const tips = tagsRes?.data?.tag_list || []
    const achieve = userInfoRes?.data?.user_info.achieve || []
    const achievements =
      [
        { label: "粉丝", num: achieve.followed_cnt || 0 },
        { label: "关注", num: achieve.follow_cnt || 0 },
        { label: "获赞", num: achieve.like_num || 0 },
        { label: "帖子", num: achieve.post_num || 0 },
        { label: "回复", num: achieve.replypost_num || 0 },
        { label: "话题", num: achieve.topic_cnt || 0 },
        { label: "新粉", num: achieve.new_follower_num || 0 },
        { label: "收藏", num: achieve.follow_collection_cnt || 0 },
        { label: "优质", num: achieve.good_post_num || 0 }
      ]
    const Card = await this.getGameRecordCard(id)
    const GameCard = Card.data.list
    return {
      ...this.screenData,
      achievements,
      tips,
      mys: userInfo,
      GameCard
    }
  }

  async getCookie () {
    try {
      this.uid = await MysInfo.getSelfUid(this.e)
      let data = YAML.parse(fs.readFileSync(`./plugins/xiaoyao-cvs-plugin/data/yaml/${this.e.user_id}.yaml`, "utf8"))
      let { stoken, stuid, mid = "" } = data[this.uid]
      this.ltuid = stuid
      return `stuid=${stuid};stoken=${stoken};mid=${mid}`
    } catch (err) {
      logger.error(err)
      return ""
    }
  }

  /** 获取游戏记录卡片 */
  async getGameRecordCard (uid) {
    const Cookie = await this.getCookie()
    if (!Cookie) {
      await this.e.reply([`UID:${uid}请【#扫码登录】绑定Stoken`, new Button(this.e).bingStoken()])
      return false
    }
    const headers = {
      "x-rpc-client_type": "2",
      "x-rpc-app_version": "2.71.1",
      "x-rpc-sys_version": "12",
      "x-rpc-channel": "miyousheluodi",
      "x-rpc-device_id": this.uuid,
      "x-rpc-device_fp": "38d804f3ad6d3",
      "x-rpc-device_name": this.uuid,
      "x-rpc-device_model": this.uuid,
      "x-rpc-h265_supported": "1",
      Referer: "https://app.mihoyo.com",
      "x-rpc-verify_key": this.uuid,
      "x-rpc-csm_source": "myself",
      Host: "api-takumi-record.mihoyo.com",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "User-Agent": "okhttp/4.9.3",
      cookie: Cookie,
      DS: this.getDs()
    }
    const url = `https://api-takumi-record.mihoyo.com/game_record/card/api/getGameRecordCard?uid=${uid}`
    const response = await fetch(url, {
      method: "GET",
      headers /** 添加所有请求头 */
    })
    if (!response.ok) {
      console.error(`Error fetching game record card: ${response.status}`)
      return null
    }
    return await response.json()
  }

  get uuid () {
    function S4 () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4())
  }

  getDs (salt = "rtvTthKxEyreVXQCnhluFgLXPOFKPHlA") {
    const randomStr = randomString(6)
    const timestamp = Math.floor(Date.now() / 1000)
    let r = md5(`salt=${salt}&t=${timestamp}&r=${randomStr}`)
    return `${timestamp},${randomStr},${r}`
  }
}

/** 通用的 API 请求函数 */
async function fetchApi (url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        Referer: "https://www.miyoushe.com/"
      }
    })
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    return null
  }
}

/** 获取用户信息 */
async function fetchData (id) {
  return fetchApi(`https://bbs-api.miyoushe.com/user/api/getUserFullInfo?uid=${id}`)
}

/** 获取用户标签信息 */
async function fetchPersonalTags (id) {
  return fetchApi(`https://bbs-api.miyoushe.com/vila/api/personal_tag/user/list?uid=${id}`)
}

export function randomString (length, os = false) {
  let randomStr = ""
  for (let i = 0; i < length; i++) {
    randomStr += _.sample(os ? "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
      : "abcdefghijklmnopqrstuvwxyz0123456789")
  }
  return randomStr
}