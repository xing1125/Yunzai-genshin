import fs from "node:fs"
import fetch from "node-fetch"
import { Button, common } from "#index"

export class material extends plugin {
  constructor () {
    super({
      name: "[ZZZero/Material.js]绝区零角色素材",
      dsc: "角色养成突破素材，来自米游社小橙子啊",
      event: "message",
      priority: -500,
      rule: [
        // { reg: "^#?(绝区零|zzz)(.*)(突破|材料|素材|培养)$", fnc: "material" }
      ]
    })
    this.path = "./temp/material/zzz/小橙子啊"
    this.pathOther = "./temp/material/zzz/other"
    this.url = "https://bbs-api.mihoyo.com/post/wapi/getPostFullInCollection?&gids=2&order_type=2&collection_id="
    this.collection_id = [2721968, 2723511]
    this.special = ["派派", "比利"]
    this.oss = "?x-oss-process=image//resize,s_1000/quality,q_80/auto-orient,0/interlace,1/format,jpg"
  }

  /** 初始化创建配置文件 */
  async init () {
    for (let dir of [this.path, this.pathOther]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }
    }
  }

  /** 派派素材 */
  async material () {
    let isUpdate = this.e.msg.includes("更新")
    let role = this.e.msg.replace(/#|绝区零|zzz|突破|材料|素材|更新/g, "")
    if (!role) return false
    /** if (["???", "???", "???"].includes(String(role.roleId))) { */
    /** await this.e.reply("暂无开拓者素材") */
    /** return */
    /** } */
    this.imgPath = `${this.path}/${role}.jpg`
    if (fs.existsSync(this.imgPath) && !isUpdate) {
      await this.e.reply([segment.image(`file://${this.imgPath}`), new Button(this.e).zzzStrategy(role)])
      return
    }
    if (await this.getImg(role)) {
      return await this.e.reply([segment.image(`file://${this.imgPath}`), new Button(this.e).zzzStrategy(role)])
    }
    this.imgPath = `${this.pathOther}/${role}.jpg`
    if (fs.existsSync(this.imgPath) && !isUpdate) {
      await this.e.reply([segment.image(`file://${this.imgPath}`), new Button(this.e).zzzStrategy(role)])
      return
    }
    if (await this.getImgOther(role)) {
      return await this.e.reply([segment.image(`file://${this.imgPath}`), new Button(this.e).zzzStrategy(role)])
    }
  }

  /** 下载素材图 */
  async getImg (name, role) {
    this.imgPath = `${this.path}/${name}.jpg`
    let ret = await this.getData(this.collection_id[0])
    if (!ret || ret.retcode !== 0) {
      await this.e.reply(`暂无${role}素材数据，请稍后再试`)
      logger.error(`米游社接口报错：${ret.message || "未知错误"}}`)
      return false
    }
    let url
    for (let val of ret.data.posts) {
      if (val.post.subject.includes(name)) {
        url = val.post.images[2]
        break
      }
    }
    if (!url) {
      return false
    }
    logger.mark(`${this.e.logFnc} 下载${name}素材图`)
    if (!await common.downFile(url + this.oss, this.imgPath)) {
      return false
    }
    logger.mark(`${this.e.logFnc} 下载${name}素材成功`)
    return true
  }

  async getImgOther (name, role) {
    this.imgPath = `${this.pathOther}/${name}.jpg`
    let ret = await this.getData(this.collection_id[1])
    if (!ret || ret.retcode !== 0) {
      await this.e.reply(`暂无${role}素材数据，请稍后再试`)
      logger.error(`米游社接口报错：${ret.message || "未知错误"}}`)
      return false
    }
    let url
    for (let val of ret.data.posts) {
      if (val.post.subject.includes(name)) {
        url = val.post.images[2]
        break
      }
    }
    if (!url) {
      return false
    }
    logger.mark(`${this.e.logFnc} 下载${name}素材图`)
    if (!await common.downFile(url + this.oss, this.imgPath)) {
      return false
    }
    logger.mark(`${this.e.logFnc} 下载${name}素材成功`)
    return true
  }

  /** 获取数据 */
  async getData (collectionId) {
    let response = await fetch(this.url + collectionId, { method: "get" })
    if (!response.ok) {
      return false
    }
    const res = await response.json()
    return res
  }
}