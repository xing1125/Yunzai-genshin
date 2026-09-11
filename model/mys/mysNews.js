import _ from "lodash"
import fs from "node:fs"
import YAML from "yaml"
import fetch from "node-fetch"
import { gsCfg, base, common, puppeteer } from "#index"

let emoticon

const commentType = {
  1: "最早评论",
  2: "最新评论",
  3: "热门评论"
}

export default class MysNews extends base {
  constructor (e) {
    super(e)
    this.model = "Mys/html/mysNews/mysNews"
    this.lable = gsCfg.getConfig("mys", "set")
  }

  async getNews (gid) {
    let type = 1
    let typeName = "公告"
    if (this.e.msg.includes("资讯")) {
      type = "3"
      typeName = "资讯"
    }
    if (this.e.msg.includes("活动")) {
      type = "2"
      typeName = "活动"
    }
    const res = await this.postData("getNewsList", { gids: gid, page_size: this.e.msg.includes("列表") ? 10 : 20, type })
    if (!res || !res.data || !Array.isArray(res.data.list)) {
      logger.error(`[mysNews.getNews] Unexpected response for gid=${gid}, type=${type}: ${JSON.stringify(res)}`)
      return true
    }
    const data = res.data.list
    if (data.length == 0) {
      return true
    }
    let param = {}
    let game = this.gameName(gid)
    if (this.e.msg.includes("列表")) {
      this.model = "Mys/html/mysNews/mysNews-list"
      const gamePathMap = {
        1: "bh3",
        2: "ys",
        3: "bh2",
        4: "wd",
        6: "sr",
        8: "zzz",
        9: "hna",
        10: "planet"
      }
      const gamePath = gamePathMap[gid] || "ys"
      data.forEach(element => {
        element.post.created_at = new Date(element.post.created_at * 1000).toLocaleString()
        element.qrcodeUrl = `https://bbs.mihoyo.com/${gamePath}/article/${element.post.post_id}`
        if (element.news_meta && element.news_meta.activity_status) {
          const statusMap = {
            1: "进行中",
            2: "评选中",
            3: "已结束"
          }
          const meta = element.news_meta
          const statusNum = Number(meta.activity_status) || 0
          meta.activity_status_label = statusMap[statusNum] || "进行中"
          try {
            const startSec = Number(meta.start_at_sec || meta.start_at || 0)
            const endSec = Number(meta.end_at_sec || meta.end_at || 0)
            const startDt = startSec ? new Date(startSec * 1000) : null
            const endDt = endSec ? new Date(endSec * 1000) : null
            const fmt = dt => {
              if (!dt) return ""
              const y = dt.getFullYear()
              const m = String(dt.getMonth() + 1).padStart(2, "0")
              const d = String(dt.getDate()).padStart(2, "0")
              return `${y}/${m}/${d}`
            }
            if (startDt && endDt) {
              meta.activity_period = `${fmt(startDt)} ~ ${fmt(endDt)}`
            } else {
              meta.activity_period = ""
            }
          } catch (e) {
            meta.activity_period = ""
          }
        }
        if (element.stat) {
          for (const key in element.stat) {
            const val = Number(element.stat[key] || 0)
            element.stat[key] = val > 10000 ? (val / 10000).toFixed(2) + "万" : val
          }
        }
      })
      param = {
        ...this.screenData,
        saveId: this.e.user_id,
        data,
        game,
        typeName
      }
    } else {
      const page = this.e.msg.replace(/#|＃|官方|星铁|原神|崩坏三|崩三|绝区零|崩坏二|崩二|崩坏学园二|未定|未定事件簿|崩坏因缘精灵|因缘精灵|崩坏精灵|精灵|公告|资讯|活动/g, "").trim() || 1
      if (page > data.length) {
        await this.e.reply("目前只查前20条最新的公告，请输入1-20之间的整数。")
        return true
      }
      const postId = data[page - 1].post.post_id
      param = await this.newsDetail(postId, gid)
    }
    const img = await this.render(param)
    return this.replyMsg(img, `${game}${typeName}：${param?.data?.post?.subject || `米游社${game}${typeName}列表`}`)
  }

  async render (param) {
    try {
      const result = await puppeteer.screenshots(this.model, param)
      return Array.isArray(result) ? result : [result]
    } catch (error) {
      const fallbackResult = await this.e.runtime.render("genshin", `${this.model}`, param, { retType: "base64" })
      return [fallbackResult]
    }
  }

  async newsDetail (postId, gid) {
    const res = await this.postData("getPostFull", { gids: gid, read: 1, post_id: postId })
    if (!res?.data?.post) {
      logger.error(`[mysNews.newsDetail] Invalid getPostFull response for postId=${postId}, gid=${gid}: ${JSON.stringify(res)}`)
      return false
    }
    const data = await this.detalData(res.data.post, gid)
    const gamePathMap = {
      1: "bh3",
      2: "ys",
      3: "bh2",
      4: "wd",
      6: "sr",
      8: "zzz",
      9: "hna",
      10: "planet"
    }
    let game = this.gameName(gid)
    const gamePath = gamePathMap[gid] || "ys"
    const qrcodeUrl = `https://bbs.mihoyo.com/${gamePath}/article/${postId}`
    let videos = []
    if (data.vod_list && data.vod_list.length > 0) {
      const vod = data.vod_list[0]
      if (vod.resolutions && vod.resolutions.length > 0) {
        videos = vod.resolutions.map(res => ({
          quality: res.label.replace("P", "p"),
          url: res.url
        }))
      }
    }

    return {
      ...this.screenData,
      saveId: postId,
      dataConent: data.post.content,
      data,
      qrcodeUrl,
      game,
      videos,
      links: data.post.links || []
    }
  }

  postApi (type, data) {
    let host = "https://bbs-api.miyoushe.com/"
    let param = []
    _.forEach(data, (v, i) => param.push(`${i}=${v}`))
    param = param.join("&")
    switch (type) {
      /** 搜索 */
      case "searchPosts":
        host += "post/wapi/searchPosts?"
        break
      case "userInstantSearchPosts":
        host += "painter/api/user_instant/search/list?"
        break
        /** 帖子详情 */
      case "getPostFull":
        host += "post/wapi/getPostFull?"
        break
      /** 帖子评论 */
      case "getComments":
        host += "post/api/getPostReplies?"
        break
        /** 公告列表 */
      case "getNewsList":
        host = "https://bbs-api-static.miyoushe.com/painter/wapi/getNewsList?"
        break
      case "emoticon":
        host += "misc/api/emoticon_set?"
        break
    }
    return host + param
  }

  async postData (type, data) {
    const url = this.postApi(type, data)
    const headers = {
      Referer: "https://www.miyoushe.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
    }
    let response
    try {
      response = await fetch(url, { method: "get", headers })
    } catch (error) {
      logger.error(error.toString())
      return false
    }
    if (!response.ok) {
      logger.error(`[米游社接口错误][${type}] ${response.status} ${response.statusText}`)
      return false
    }
    const res = await response.json()
    return res
  }

  async detalData (data, gid) {
    let json
    try {
      json = JSON.parse(data.post.content)
    } catch (error) {
      // 解析失败说明不是JSON格式，保持原样
    }
    // 如果是JSON格式的内容
    if (json && typeof json === "object") {
      let content = []
      // 处理文字和图片内容
      if (json.text) {
        content.push(json.text)
      }
      if (json.imgs && json.imgs.length > 0) {
        for (const val of json.imgs) {
          content.push(`<div class="ql-image-box"><img src="${val}?x-oss-process=image//resize,s_600/quality,q_80/auto-orient,0/interlace,1/format,png"></div>`)
        }
      }
      data.post.content = content.join("\n")
    } else if (data.post.images && data.post.images.length > 0) {
      // 处理普通富文本内容 & 图片
      let originalContent = data.post.content || ""
      let imgPlaceholders = originalContent.match(/<div class="ql-image">.*?<\/div><\/div><\/div>/g) || []
      // 如果找到了图片占位符
      if (imgPlaceholders.length > 0) {
        // 遍历所有图片，替换对应的占位符
        for (let i = 0; i < data.post.images.length && i < imgPlaceholders.length; i++) {
          const imgHtml = `<div class="ql-image"><div class="ql-image-box"><img src="${data.post.images[i]}?x-oss-process=image//resize,s_600/quality,q_80/auto-orient,0/interlace,1/format,jpg"></div><div class="ql-image-mask"><div class="ql-image-link">超链图片</div></div></div>`
          originalContent = originalContent.replace(imgPlaceholders[i], imgHtml)
        }
      } else {
        // 如果没有找到占位符，则在内容后追加图片
        let imageContent = []
        for (const val of data.post.images) {
          imageContent.push(`<div class="ql-image"><div class="ql-image-box"><img src="${val}?x-oss-process=image//resize,s_600/quality,q_80/auto-orient,0/interlace,1/format,jpg"></div><div class="ql-image-mask"><div class="ql-image-link">超链图片</div></div></div>`)
        }
        originalContent += "\n" + imageContent.join("\n")
      }
      data.post.content = originalContent
    }
    data.post.created_time = new Date(data.post.created_at * 1000).toLocaleString()
    // 提取 content 中的链接（<a href="...">text</a>），供模板显示二维码
    try {
      data.post.links = this.extractLinksFromHtml(data.post.content || "") || []
    } catch (e) {
      data.post.links = []
    }
    // 把浏览量等数字做一下格式化
    for (const i in data.stat) {
      data.stat[i] = data.stat[i] > 10000 ? (data.stat[i] / 10000).toFixed(2) + "万" : data.stat[i]
    }
    if (gid) {
      data.gid = gid
    }
    return data
  }

  async mysEmoticon (gid) {
    const emp = new Map()
    const res = await this.postData("emoticon", { gids: gid })
    if (res.retcode != 0) {
      return emp
    }
    for (const val of res.data.list) {
      if (!val.icon) continue
      for (const list of val.list) {
        if (!list.icon) continue
        emp.set(list.name, list.icon)
      }
    }
    return emp
  }

  async mysSearch (gid) {
    let msg = this.e.msg
    msg = msg.replace(/#|米游社搜索|mys|星铁|原神|崩坏三|崩三|绝区零|崩坏二|崩二|崩坏学园二|未定|未定事件簿|崩坏因缘精灵|因缘精灵|崩坏精灵|精灵|星布谷地|星布|星布谷|星谷|星地/g, "")
    if (!msg) {
      await this.e.reply("请输入关键字，如#米游社搜索原神七七")
      return false
    }
    let page = msg.match(/.*(\d){1}$/) || 0
    if (page && page[1]) {
      page = page[1]
    }
    msg = _.trim(msg, page)
    let res = await this.postData("searchPosts", { gids: gid, size: 10, keyword: msg, sort_type: 2 })
    if (!res) return
    if (res?.data?.posts.length <= 0) {
      await this.e.reply("搜索不到您要的结果，换个关键词试试呗~")
      return false
    }
    let postId = res.data.posts[page].post.post_id
    const param = await this.newsDetail(postId, gid)
    if (!param) {
      await this.e.reply("获取帖子详情失败，可能是米游社接口返回异常，请稍后再试")
      return false
    }
    const img = await this.render(param)
    return this.replyMsg(img, `${param.data.post.subject}`)
  }

  async newsDetailPool (postId, gid) {
    gid = gid || this.parseGidFromMsg(this.e.msg) || 2
    const res = await this.postData("getPostFull", { gids: gid, read: 1, post_id: postId })
    if (!res?.data?.post) {
      logger.error(`[mysNews.newsDetailPool] Invalid getPostFull response for postId=${postId}, gid=${gid}: ${JSON.stringify(res)}`)
      return false
    }
    const data = await this.detalData(res.data.post, gid)
    // 1. 生成 qrcodeUrl 逻辑
    const gamePathMap = {
      1: "bh3",
      2: "ys",
      3: "bh2",
      4: "wd",
      6: "sr",
      8: "zzz",
      9: "hna",
      10: "planet"
    }
    const gamePath = gamePathMap[gid] || "ys"
    const qrcodeUrl = `https://bbs.mihoyo.com/${gamePath}/article/${postId}`
    // 2. 传入 gid 调用评论获取方法，确保评论内的链接也不会失效
    const comments = await this.getPostComments(postId, gid)
    if (comments && comments.length > 0) {
      data.comments = comments.slice(0, 3)
    }
    let videos = []
    if (data.vod_list && data.vod_list.length > 0) {
      const vod = data.vod_list[0] // 取第一个视频
      if (vod.resolutions && vod.resolutions.length > 0) {
        videos = vod.resolutions.map(res => ({
          quality: res.label.replace("P", "p"),
          url: res.url
        }))
      }
    }
    return {
      ...this.screenData,
      saveId: postId,
      dataConent: data.post.content,
      data,
      comments: data.comments || [],
      qrcodeUrl,
      videos,
      links: data.post.links || []
    }
  }

  async mysUrl () {
    let msg = this.e.msg
    const postIdMatch = /[0-9]+/g.exec(msg)
    let postId = postIdMatch?.[0]
    if (!postId) return false
    const gid = this.parseGidFromMsg(msg) || 2
    const param = await this.newsDetailPool(postId, gid)
    if (!param) {
      await this.e.reply("解析米游社链接失败，可能是链接类型不支持或帖子已不可访问")
      return false
    }
    const comments = await this.getPostComments(postId, gid)
    if (comments.length > 0) {
      param.comments = comments
    }
    const img = await this.render(param)
    return this.replyMsg(img, `${param.data.post.subject}`)
  }

  async getPostComments (postId, gid) {
    // 1. 建立映射表
    const gamePathMap = {
      1: "bh3",
      2: "ys",
      3: "bh2",
      4: "wd",
      6: "sr",
      8: "zzz",
      9: "hna",
      10: "planet"
    }
    const currentGid = gid || this.e?.gid || 2
    const gamePath = gamePathMap[currentGid] || "ys"
    const res = await this.postData("getComments", {
      post_id: postId,
      order_type: this.lable.commentSort || 3,
      size: this.lable.commentMaxNum || 10,
      only_master: false,
      is_hot: true,
      from_external_link: false
    })
    if (!res || !res.data || !res.data.list) {
      return []
    }
    return res.data.list.map(item => {
      const created_at = item.reply?.created_at ? Number(item.reply.created_at) * 1000 : Date.now()
      const qrcodeUrl = `https://bbs.mihoyo.com/${gamePath}/article/${item.reply.post_id || postId}`
      const replyHtml = this.decodeHtmlContent(item.reply?.content || "") || ""
      const replyStruct = this.decodeStructContent(item.reply?.struct_content || "") || ""
      const content = replyHtml.trim() ? replyHtml : replyStruct
      return {
        qrcodeUrl,
        user: item.user?.nickname || "用户",
        avatar: item.user?.avatar_url || "",
        pendant: item.user?.pendant || "",
        level: item.user?.level_exp.level || 0,
        ip: item.user?.ip_region || "未知",
        content,
        type: commentType[this.lable.commentSort || 3],
        time: new Date(created_at).toLocaleString("zh-CN"),
        like_num: item.stat?.like_num || 0,
        sub_replies: (item.sub_replies || []).map(sub => {
          const sub_created_at = sub.reply?.created_at ? Number(sub.reply.created_at) * 1000 : Date.now()
          const subReplyHtml = this.decodeHtmlContent(sub.reply?.content || "") || ""
          const subReplyStruct = this.decodeStructContent(sub.reply?.struct_content || "") || ""
          const subContent = subReplyHtml.trim() ? subReplyHtml : subReplyStruct
          return {
            qrcodeUrl,
            user: sub.user?.nickname || "用户",
            type: commentType[this.lable.commentSort || 3],
            avatar: sub.user?.avatar_url || "",
            pendant: sub.user?.pendant || "",
            level: sub.user?.level_exp.level || 0,
            ip: sub.user?.ip_region || "未知",
            content: subContent,
            time: new Date(sub_created_at).toLocaleString("zh-CN")
          }
        })
      }
    })
  }

  decodeHtmlContent (content) {
    if (!content) return ""
    content = content.replace(/&([^;]+);/g, (match, entity) => {
      const entities = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: "\"",
        apos: "'",
        "#34": "\"",
        "#39": "'",
        "#60": "<",
        "#62": ">"
      }
      return entities[entity] || match
    })
    if (!emoticon) {
      emoticon = new Map()
    }
    content = content.replace(/_\([^)]*\)/g, match => {
      const emoteName = match.replace(/_\(|\)/g, "")
      if (emoticon.has(emoteName)) {
        return `<img class="emoticon-image" src="${emoticon.get(emoteName)}"/>`
      }
      return ""
    })
    return content
  }

  /**
   * 从 HTML 字符串中提取所有 <a href="...">text</a> 链接
   * 返回 [{ url, text }]
   */
  extractLinksFromHtml (html) {
    const links = []
    if (!html) return links
    const regex = /<a[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi
    let match
    while ((match = regex.exec(html)) !== null) {
      let url = match[2] || ""
      let text = match[3] || url
      // 清理文本中的 HTML 标签
      text = text.replace(/<[^>]+>/g, "").trim()
      // 解码常见实体与 HTML 内容（利用已有解码函数）
      try {
        text = this.decodeHtmlContent(text) || text
      } catch (e) {}
      // 解码常见实体
      url = url.replace(/&amp;/g, "&").replace(/#38;/g, "&")
      links.push({ url, text })
    }
    return links
  }

  /**
   * 解析 struct_content（米游社富结构化内容），提取文字与图片/表情等为 HTML 字符串
   * 支持常见字段：insert 为 string、backup_text、custom_emoticon.url、image、vod.cover
   */
  decodeStructContent (structContent) {
    if (!structContent) return ""
    try {
      const arr = typeof structContent === "string" ? JSON.parse(structContent) : structContent
      if (!Array.isArray(arr)) return ""
      // 清理上次解析留下的链接记录
      this._lastStructLinks = []
      const out = []
      for (const node of arr) {
        const ins = node.insert
        if (!ins && typeof ins !== "string") continue
        // 如果是字符串类型，同时可能伴随 attributes（包含 link）
        if (typeof ins === "string") {
          if (node.attributes && node.attributes.link) {
            const url = String(node.attributes.link).replace(/&amp;/g, "&").replace(/#38;/g, "&")
            out.push(`<a href="${url}" target="_blank">${ins}</a>`)
            // 记录到临时链接数组，供调用方使用（如果需要）
            try {
              this._lastStructLinks.push({ url, text: ins.replace(/<[^>]+>/g, "").trim() })
            } catch (e) {}
            continue
          }
          out.push(ins)
          continue
        }
        // backup_text 通常包含替代文本
        if (ins.backup_text) {
          out.push(ins.backup_text)
          continue
        }
        // 自定义表情：网页上只渲染为占位文本（如备选文本），不直接插入图片
        if (ins.custom_emoticon) {
          const text = ins.backup_text || ins.custom_emoticon?.name || "[自定义表情]"
          out.push(text)
          continue
        }
        // 图片字段
        if (ins.image) {
          const url = typeof ins.image === "string" ? ins.image : ins.image.url || ""
          if (url) out.push(`<img class="struct-image" src="${url}"/>`)
          continue
        }
        // 视频封面或其它嵌套结构
        if (ins.vod && ins.vod.cover) {
          out.push(`<img class="struct-image" src="${ins.vod.cover}"/>`)
          continue
        }
      }
      return out.join("")
    } catch (e) {
      return ""
    }
  }

  async mysEstimate (keyword, uid) {
    let res = await this.postData("userInstantSearchPosts", { keyword, uid, size: 20, offset: 0, sort_type: 2 })
    let postList = res?.data?.list
    if (postList.length <= 0) {
      logger.error("暂无数据")
      return false
    }
    let postId = postList[0].post.post.post_id
    if (!postId) {
      logger.error("暂无数据")
      return false
    }
    const gid = postList[0]?.post?.post?.game_id || postList[0]?.post?.post?.gid || 2
    const param = await this.newsDetail(postId, gid)
    if (!param) {
      logger.error(`[mysNews.mysEstimate] Failed to load post detail for postId=${postId}, gid=${gid}`)
      return false
    }
    const img = await this.render(param)
    if (img?.length > 1) {
      img.push("\n")
      img.push(segment.image(param.data.post.images[0] + "?x-oss-process=image//resize,s_600/quality,q_80/auto-orient,0/interlace,1/format,jpg"))
    }
    return this.replyMsg(img, `${param.data.post.subject}`)
  }

  replyMsg (img, title) {
    if (!Array.isArray(img)) {
      img = [img]
    }
    if (!img || img.length <= 0) return false
    if (!Array.isArray(img)) img = [img]
    if (title) img = [title, "\n", ...img]
    if (img.length <= 3) return img
    return common.makeForwardMsg(this.e, [img])
  }

  async mysNewsTaskForGame (targetGid, opt = {}) {
    let cfg = gsCfg.getConfig("mys", "pushNews")
    /** 推送2小时内的公告资讯活动 */
    let interval = 7200
    /** 最多同时推送两条 */
    this.maxNum = cfg.maxNum
    logger.mark(`[米游社推送任务] 开始执行游戏ID: ${targetGid} 的推送任务`)
    const gids = {
      1: "bbb",
      2: "gs",
      3: "bb",
      4: "wd",
      6: "sr",
      8: "zzz",
      9: "hna",
      10: "planet"
    }
    // 只处理指定的游戏
    const gid = targetGid.toString()
    if (gids[gid]) {
      await this.processGameNews(gid, gids[gid], cfg, interval, opt)
    }
  }

  /** 检查新闻是否已经全局推送过 */
  async isNewsAlreadyPushed (postId, type) {
    let globalCacheKey = `Yz:${type}:mys:globalPush:${postId}`
    let pushed = await redis.get(globalCacheKey)
    return !!pushed
  }

  /** 标记新闻为已全局推送 */
  async markNewsAsPushed (postId, type) {
    let globalCacheKey = `Yz:${type}:mys:globalPush:${postId}`
    await redis.set(globalCacheKey, "1", { EX: 3600 * 24 * 7 }) // 缓存7天
  }

  async processGameNews (gid, type, cfg, interval, opt = {}) {
    const newsTypes = [
      { type: 1, name: "公告", groupCfg: `${type}announceGroup` },
      { type: 3, name: "资讯", groupCfg: `${type}infoGroup` },
      { type: 2, name: "活动", groupCfg: `${type}activitysGroup` }
    ]
    let now = Date.now() / 1000
    this.key = `Yz:${type}:mys:newPush:`
    this.e.isGroup = true
    this.pushGroup = []
    for (const newsType of newsTypes) {
      // 检查该类型是否配置了推送群
      if (_.isEmpty(cfg[newsType.groupCfg])) continue
      if (opt.onlyTypeName && opt.onlyTypeName !== newsType.name) continue
      let res = await this.postData("getNewsList", { gids: gid, page_size: 10, type: newsType.type })
      if (!res || !res.data || !res.data.list) continue
      // 对该类型下的前几条进行遍历（比如前3条），防止漏发
      for (let val of res.data.list) {
        let postId = val.post.post_id
        let newsTime = val.post.created_at
        // 1. 检查时间区间（2小时内）
        if (now - newsTime > interval) continue
        // 2. 核心：检查该具体文章是否推送过
        if (await this.isNewsAlreadyPushed(postId, type)) continue
        // 3. 关键词过滤
        if (cfg.banWord && cfg.banWord[type] && new RegExp(cfg.banWord[type]).test(val.post.subject)) continue
        // 执行推送
        let targetGroups = cfg[newsType.groupCfg]
        if (targetGroups) {
          await this.markNewsAsPushed(postId, type)
          for (let botId in targetGroups) {
            for (let groupId of targetGroups[botId]) {
              // 这里内部会有延迟，防止被风控
              await this.sendNews(botId, groupId, newsType.name, postId, gid)
            }
          }
        }
      }
    }
  }

  async mysNewsTask (opt = {}) {
    let cfg = gsCfg.getConfig("mys", "pushNews")
    /** 推送2小时内的公告资讯活动 */
    let interval = 7200
    /** 最多同时推送两条 */
    this.maxNum = cfg.maxNum
    logger.mark("[米游社推送任务] 开始执行全部游戏的推送任务")
    const gids = {
      1: "bbb",
      2: "gs",
      3: "bb",
      4: "wd",
      6: "sr",
      8: "zzz",
      9: "hna",
      10: "planet"
    }
    for (let gid in gids) {
      await this.processGameNews(gid, gids[gid], cfg, interval, opt)
    }
  }

  async ActivityPush () {
    let nowDt = new Date()
    let nowHour = nowDt.getHours()
    if (nowHour < 10) return
    let dateStr = `${nowDt.getFullYear()}-${nowDt.getMonth() + 1}-${nowDt.getDate()}`
    let globalRedisKey = `Yz:mysPush:executed:${dateStr}`
    let hasRun = await redis.get(globalRedisKey)
    if (hasRun) return
    let pushGroupList
    try {
      pushGroupList = YAML.parse(fs.readFileSync("./plugins/genshin/config/config/mys.pushNews.yaml", "utf8"))
    } catch (error) {
      logger.error(`[米游社推送] 配置文件读取失败: ${error}`)
      return
    }
    let gsActivityList = await this.getGsActivity()
    let srActivityList = await this.getSrActivity()
    let zzzActivityList = await this.getZzzActivity()
    let ActivityList = []
    for (let item of srActivityList) {
      ActivityList.push({ game: "sr", subtitle: item.title, banner: item.img, title: item.title, end_time: item.end_time, ann_id: item.ann_id || item.id })
    }
    for (let item of gsActivityList) {
      ActivityList.push({ game: "gs", subtitle: item.subtitle, banner: item.banner, title: item.title, end_time: item.end_time, ann_id: item.ann_id || item.id })
    }
    for (let item of zzzActivityList) {
      ActivityList.push({ game: "zzz", subtitle: item.subtitle || item.title, banner: item.banner || item.img, title: item.title, end_time: item.end_time, ann_id: item.ann_id || item.id })
    }
    if (ActivityList.length === 0) return
    await redis.set(globalRedisKey, "1", { EX: 3600 * 24 })
    logger.mark("[米游社推送] 开始执行每日活动到期提醒...")
    for (let botId in Bot) {
      if (!Bot[botId].pickGroup) continue
      let gsGroups = pushGroupList.gsActivityPush?.[botId] || []
      let srGroups = pushGroupList.srActivityPush?.[botId] || []
      let zzzGroups = pushGroupList.zzzActivityPush?.[botId] || []
      let allTargetGroups = _.uniq([...gsGroups, ...srGroups, ...zzzGroups])
      for (let groupId of allTargetGroups) {
        for (let a of ActivityList) {
          let isEnable = false
          if (a.game === "gs" && gsGroups.includes(groupId)) isEnable = true
          if (a.game === "sr" && srGroups.includes(groupId)) isEnable = true
          if (a.game === "zzz" && zzzGroups.includes(groupId)) isEnable = true
          if (!isEnable) continue
          let redisKey = `Yz:mysPush:sent:${groupId}:${a.ann_id}`
          if (await redis.get(redisKey)) continue
          let gameNameMap = { gs: "原神", sr: "星铁", zzz: "绝区零" }
          let pushGame = gameNameMap[a.game]
          let todayt = new Date()
          let endDt = new Date(a.end_time.replace(/\s/, "T"))
          let sydate = await this.calculateRemainingTime(todayt, endDt)
          let msgList = [
            `【${pushGame}活动即将结束通知】`,
            `\n活动:${a.subtitle}`,
            "\n",
            segment.image(a.banner),
            `\n活动剩余时间:${sydate.days}天${sydate.hours}小时`,
            `\n结束时间:${a.end_time}`
          ]
          try {
            await common.sleep(2000)
            logger.mark(`[米游社推送] 正在推送 ${pushGame}：${a.subtitle} 到群：${groupId}`)
            await Bot[botId].pickGroup(groupId).sendMsg(msgList)
            await redis.set(redisKey, "1", { EX: 3600 * 24 })
          } catch (err) {
            logger.error(`[米游社活动到期推送] 游戏${pushGame} 群${groupId} 推送失败：${err}`)
          }
        }
      }
    }
  }

  async getGsActivity () {
    let gshd
    try {
      gshd = await fetch("https://hk4e-api.mihoyo.com/common/hk4e_cn/announcement/api/getAnnList?game=hk4e&game_biz=hk4e_cn&lang=zh-cn&bundle_id=hk4e_cn&platform=pc&region=cn_gf01&level=60&uid=100000000")
      gshd = await gshd.json()
    } catch {
      return []
    }
    let hdlist = []
    let result = []
    for (let item of gshd.data.list[1].list) {
      if (item.tag_label.includes("活动") && !item.title.includes("传说任务") && !item.title.includes("游戏公告")) hdlist.push(item)
    }
    for (let item of hdlist) {
      let endDt = item.end_time
      endDt = endDt.replace(/\s/, "T")
      let todayt = new Date()
      endDt = new Date(endDt)
      let sydate = await this.calculateRemainingTime(todayt, endDt)
      let label = item.type_label || "原神活动"
      let cleanTitle = this.decodeHtmlContent(item.title || "").replace(/<[^>]+>/g, "").trim()
      // logger.mark(`[原神识别] 标题:${cleanTitle} | 标签:${label} | 剩余:${sydate.days}天`)
      if (sydate.days <= 1) result.push(item)
    }
    return _.uniqBy(result, "title")
  }

  async getSrActivity () {
    let srhd
    try {
      srhd = await fetch("https://hkrpg-api.mihoyo.com/common/hkrpg_cn/announcement/api/getAnnList?game=hkrpg&game_biz=hkrpg_cn&lang=zh-cn&auth_appid=announcement&authkey_ver=1&bundle_id=hkrpg_cn&channel_id=1&level=70&platform=pc&region=prod_gf_cn&sdk_presentation_style=fullscreen&sdk_screen_transparent=true&sign_type=2&uid=100000000")
      srhd = await srhd.json()
    } catch {
      return []
    }
    let hdlist = []
    let result = []
    for (let item of srhd.data.pic_list[0].type_list[0].list) {
      if (item.title) hdlist.push(item)
    }
    for (let item of hdlist) {
      let endDt = item.end_time
      endDt = endDt.replace(/\s/, "T")
      let todayt = new Date()
      endDt = new Date(endDt)
      let sydate = await this.calculateRemainingTime(todayt, endDt)
      let label = item.tag_label || "星铁活动"
      let cleanTitle = this.decodeHtmlContent(item.title || "").replace(/<[^>]+>/g, "").trim()
      // logger.mark(`[星铁识别] 标题:${cleanTitle} | 标签:${label} | 剩余:${sydate.days}天`)
      if (sydate.days <= 1) result.push(item)
    }
    return _.uniqBy(result, "title")
  }

  formatFetchError (err) {
    const cause = err?.cause
    const parts = [
      err?.name,
      err?.message,
      err?.code,
      cause?.code,
      cause?.errno,
      cause?.syscall,
      cause?.hostname,
      cause?.address,
      cause?.port
    ].filter(Boolean)
    return parts.join(" | ") || String(err)
  }

  async fetchJsonWithRetry (url, { retries = 2, retryDelay = 1500, logPrefix = "fetch" } = {}) {
    let lastError
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        return await res.json()
      } catch (err) {
        lastError = err
        logger.error(`[${logPrefix}] 请求失败 ${i + 1}/${retries + 1}：${this.formatFetchError(err)}`)
        if (i < retries) await common.sleep(retryDelay * (i + 1))
      }
    }
    throw lastError
  }

  async getZzzActivity () {
    let zzzhd
    try {
      const url = "https://announcement-api.mihoyo.com/common/nap_cn/announcement/api/getAnnList?game=nap&game_biz=nap_cn&lang=zh-cn&bundle_id=nap_cn&channel_id=1&level=70&platform=pc&region=prod_gf_cn&uid=12345678"
      zzzhd = await this.fetchJsonWithRetry(url, { retries: 2, retryDelay: 2000, logPrefix: "绝区零活动推送" })
    } catch (err) {
      logger.error(`[绝区零活动推送] 获取列表异常：${this.formatFetchError(err)}`)
      return []
    }
    if (zzzhd.retcode !== 0 || !zzzhd.data) return []
    let result = []
    let allItems = []
    if (zzzhd.data.list && Array.isArray(zzzhd.data.list)) {
      zzzhd.data.list.forEach(group => {
        if (group.list) allItems.push(...group.list)
      })
    }
    if (zzzhd.data.pic_list && Array.isArray(zzzhd.data.pic_list)) {
      zzzhd.data.pic_list.forEach(picGroup => {
        if (picGroup.type_list && Array.isArray(picGroup.type_list)) {
          picGroup.type_list.forEach(typeItem => {
            if (typeItem.list) allItems.push(...typeItem.list)
          })
        }
      })
    }
    for (let item of allItems) {
      let label = item.type_label || item.tag_label || ""
      if (label === "活动公告" || label === "丽都资讯") {
        let endDt = item.end_time
        if (!endDt) continue
        let cleanTitle = this.decodeHtmlContent(item.title || "")
        cleanTitle = cleanTitle.replace(/<[^>]+>/g, "").trim()
        let endTimeStr = endDt.replace(/\s/, "T")
        let todayt = new Date()
        let endDtObj = new Date(endTimeStr)
        let sydate = await this.calculateRemainingTime(todayt, endDtObj)
        // logger.mark(`[绝区零识别] 标题:${cleanTitle} | 标签:${label} | 剩余:${sydate.days}天`)
        if (sydate.days <= 1 && sydate.days >= 0) {
          let cleanSubtitle = this.decodeHtmlContent(item.subtitle || item.title || "")
          cleanSubtitle = cleanSubtitle.replace(/<[^>]+>/g, "").trim()
          result.push({
            title: cleanTitle,
            subtitle: cleanSubtitle,
            banner: item.banner || item.img,
            end_time: item.end_time
          })
        }
      }
    }
    return _.uniqBy(result, "title")
  }

  async calculateRemainingTime (startDate, endDate) {
    const difference = endDate - startDate
    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)
    return { days, hours, minutes, seconds }
  }

  async sendNews (botId, groupId, typeName, postId, gid) {
    if (!this.pushGroup[groupId]) this.pushGroup[groupId] = 0
    if (this.pushGroup[groupId] >= this.maxNum) {
      return
    }
    let cacheKey = `${this.key}${botId}:${groupId}:${postId}`
    let sended = await redis.get(cacheKey)
    if (sended) {
      return
    }
    let game = this.gameName(gid)
    /** 判断是否存在群关系 */
    const group = Bot[botId]?.pickGroup(groupId)
    if (!group) {
      logger.mark(`[米游社${game}${typeName}推送] 群${botId}:${groupId}未关联`)
      return
    }
    if (!this[postId]) {
      const param = await this.newsDetailPool(postId, gid)
      logger.mark(`[米游社${game}${typeName}推送] ${param.data.post.subject}`)
      this[postId] = {
        img: await this.render(param),
        title: param.data.post.subject
      }
    }
    this.pushGroup[groupId]++
    await redis.set(cacheKey, "1", { EX: 3600 * 24 })
    /** 随机延迟10-90秒 */
    await common.sleep(_.random(10000, 90000))
    const msg = await this.replyMsg(this[postId].img, `${game}${typeName}推送：${this[postId].title}`)
    return group.sendMsg(msg)
  }

  async getPushList () {
    let cfg = gsCfg.getConfig("mys", "pushNews")
    const games = [
      { gid: 1, game: "bbb", name: "崩坏三", shortName: "崩3" },
      { gid: 2, game: "gs", name: "原神", shortName: "原神" },
      { gid: 3, game: "bb", name: "崩坏二", shortName: "崩2" },
      { gid: 4, game: "wd", name: "未定事件簿", shortName: "未定" },
      { gid: 6, game: "sr", name: "崩坏星穹铁道", shortName: "星铁" },
      { gid: 8, game: "zzz", name: "绝区零", shortName: "绝区零" },
      { gid: 9, game: "hna", name: "崩坏因缘精灵", shortName: "精灵" },
      { gid: 10, game: "planet", name: "星布谷地", shortName: "星布" }
    ]
    const pushTypes = [
      { type: "announceGroup", name: "公告" },
      { type: "infoGroup", name: "资讯" },
      { type: "activitysGroup", name: "活动" }
    ]
    const activityPushGames = ["原神", "崩坏星穹铁道", "绝区零"]
    let pushData = []
    for (let game of games) {
      let gameData = {
        gameName: game.name,
        shortName: game.shortName,
        pushTypes: []
      }
      for (let pushType of pushTypes) {
        let typeKey = `${game.game}${pushType.type}`
        let typeData = {
          typeName: pushType.name,
          bots: []
        }
        if (cfg[typeKey]) {
          for (let botId in cfg[typeKey]) {
            let botData = {
              botId,
              groups: cfg[typeKey][botId] || []
            }
            typeData.bots.push(botData)
          }
        }
        gameData.pushTypes.push(typeData)
      }
      if (activityPushGames.includes(game.name)) {
        let typeKey = `${game.game}ActivityPush`
        let typeData = {
          typeName: "活动到期推送",
          bots: []
        }
        if (cfg[typeKey]) {
          for (let botId in cfg[typeKey]) {
            let botData = {
              botId,
              groups: cfg[typeKey][botId] || []
            }
            typeData.bots.push(botData)
          }
        }
        gameData.pushTypes.push(typeData)
      }
      pushData.push(gameData)
    }

    this.model = "Mys/html/mysNews/pushList"
    const param = {
      ...this.screenData,
      saveId: this.e.user_id,
      pushData,
      totalBots: this.getTotalBots(cfg),
      totalGroups: this.getTotalGroups(cfg)
    }
    const img = await this.render(param)
    return img
  }

  getTotalBots (cfg) {
    let botSet = new Set()
    for (let key in cfg) {
      if (key.includes("Group") && cfg[key]) {
        for (let botId in cfg[key]) {
          botSet.add(botId)
        }
      }
    }
    return botSet.size
  }

  getTotalGroups (cfg) {
    let groupSet = new Set()
    for (let key in cfg) {
      if (key.includes("Group") && cfg[key]) {
        for (let botId in cfg[key]) {
          if (Array.isArray(cfg[key][botId])) {
            cfg[key][botId].forEach(groupId => groupSet.add(`${botId}:${groupId}`))
          }
        }
      }
    }
    return groupSet.size
  }

  gameName (gid) {
    switch (Number(gid)) {
      case 1:
        return "崩坏三"
      case 2:
        return "原神"
      case 3:
        return "崩坏二"
      case 4:
        return "未定事件簿"
      case 6:
        return "崩坏星穹铁道"
      case 8:
        return "绝区零"
      case 9:
        return "崩坏因缘精灵"
      case 10:
        return "星布谷地"
    }
    return ""
  }

  parseGidFromMsg (msg = "") {
    const lowerMsg = String(msg).toLowerCase()
    const pathMatch = lowerMsg.match(/bbs\.(?:mihoyo|miyoushe)\.com\/([a-z0-9]+)\//)
    const gamePath = pathMatch?.[1]
    const gamePathMap = {
      bh3: 1,
      ys: 2,
      bh2: 3,
      wd: 4,
      sr: 6,
      zzz: 8,
      hna: 9,
      planet: 10
    }
    if (gamePathMap[gamePath]) {
      return gamePathMap[gamePath]
    }
    if (/星铁|崩坏星穹铁道|sr/.test(msg)) return 6
    if (/绝区零|zzz/.test(msg)) return 8
    if (/未定事件簿|wd/.test(msg)) return 4
    if (/崩坏3|崩三|bh3/.test(msg)) return 1
    if (/崩坏2|崩二|bh2/.test(msg)) return 3
    if (/原神|ys/.test(msg)) return 2
    return undefined
  }
}
