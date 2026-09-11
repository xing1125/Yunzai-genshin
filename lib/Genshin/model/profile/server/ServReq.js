import fetch from "node-fetch"

/** 小助手请求头 */
const headers = {
  referer: "https://servicewechat.com/wx2ac9dce11213c3a8/192/page-frame.html",
  "user-agent":
        "Mozilla/5.0 (Linux; Android 12; SM-G977N Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.99 XWEB/4375 MMWEBSDK/20221011 Mobile Safari/537.36 MMWEBID/4357 MicroMessenger/8.0.30.2244(0x28001E44) WeChat/arm64 Weixin GPVersion/1 NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android"
}

const ServReq = {
  /**
     * 获取小助手对应功能的数据
     * @param reqData 请求数据
     * @param type 功能对应api 默认为 Single
     * @returns {Object} json数据
     */
  async teyvat (reqData, type = "team") {
    const apiMap = {
      single: "https://api.lelaer.com/ys/getDamageResult.php",
      team: "https://api.lelaer.com/ys/getTeamResult.php"
    }
    try {
      const response = await fetch(apiMap[type], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers
        },
        body: JSON.stringify(reqData)
      })
      return await response.json()
    } catch (error) {
      logger.error(`提瓦特小助手接口无法访问或返回错误~ ${error}`)
      return { }
    }
  },

  /**
     * 请求 Enka API
     * @param uid 服务器UID
     * @returns {Object} avatarInfoList 数组
     */
  async enka (uid) {
    const urls = [
      { api: "enka", url: "https://enka.network" },
      { api: "microgg", url: "http://profile.microgg.cn" }
    ]
    if (Number(uid[0]) === 5) urls.reverse()
    let result = { }
    try {
      for (let [idx, { api, url }] of urls.entries()) {
        const res = await fetch(`${url}/api/uid/${uid}`, {
          headers: {
            "User-Agent": "Miao-Plugin/3.1"
          }
        })
        const errorMsg = {
          400: `玩家 ${uid} UID 格式错误！`,
          404: `玩家 ${uid} 不存在！`,
          424: `${api} 正在维护中！`,
          429: `${api} 访问过于频繁！`,
          500: `${api} 服务器普通故障！`,
          503: `${api} 服务器严重错误！`
        }
        let status = res.status
        if (!res.ok || status in errorMsg) {
          if ([400, 404].includes(status) || idx === urls.length - 1) return { error: `获取面板失败: ${errorMsg[status]}` }
          logger.info(`>>>获取面板失败: ${errorMsg[status]}, 自动切换api重试...`)
          continue
        }
        result = await res.json()
        break
      }
      let { avatarInfoList } = result
      if (!avatarInfoList) return { error: `uid: ${uid} 更新面板失败, 角色柜详细已隐藏！` }
      return avatarInfoList
    } catch (e) {
      logger.error(e)
      return { error: `[${e.name}] 获取面板数据失败...` }
    }
  }
}

export default ServReq
