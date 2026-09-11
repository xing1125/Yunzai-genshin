import _ from "lodash"
import fs from "node:fs"
import moment from "moment"
import { Common, cfg } from "#index"

export default class base {
  constructor (e = {}) {
    this.e = e
    this.userId = e?.user_id
    this.model = "genshin"
    this._path = process.cwd().replace(/\\/g, "/")
    this.game = e.game || "gs"
  }

  get prefix () {
    return `Yz:genshin:${this.model}:`
  }

  /** 统一封装渲染 */
  async renderImg (tpl, data, cfg = {}) {
    return Common.render("genshin", `html/${tpl}`, data, {
      ...cfg,
      e: this.e
    })
  }

  /**
   * 截图默认数据
   * @param saveId html保存id
   * @param tplFile 模板html路径
   * @param pluResPath 插件资源路径
   */
  get screenData () {
    const layoutPath = process.cwd() + "/plugins/genshin/resources/other/layout/"
    const KarinLogo = "Powered by Karin-Plugin-MysTool & Designed by Aozaki Arina"
    const layoutcopyright = "Powered by genshin & Designed by Aozaki Arina(860563585)"
    const copyright = moment().locale("en").format("[Created on ]dddd, MMMM Do, YYYY [at] h:mm:ss:SSS A")
    let data = {
      KarinLogo,
      quality: 100,
      layoutcopyright,
      saveId: this.userId,
      gameLayout: layoutPath + "game.html",
      defaultLayout: layoutPath + "default.html",
      pluResPath: `${this._path}/plugins/genshin/resources/`,
      tplFile: `./plugins/genshin/resources/${this.model}.html`
    }
    let gameResPath = data.pluResPath
    const metaGsPath = `${this._path}/plugins/miao-plugin/resources/meta-gs/character/`
    const randomFolder = _.sample(fs.readdirSync(metaGsPath).filter(folder => !folder.includes(".") && folder !== "common"))
    this.headbanner = `${metaGsPath}${randomFolder}/imgs/banner.webp`
    const game = this.game || "gs"
    switch (game) {
      case "zzz": {
        gameResPath += "ZZZero/"
        let banner = _.sample(fs.readdirSync(`${gameResPath}img/worldcard`))
        return {
          ...data,
          game: "zzz",
          uid: this.e.uid,
          gameResPath,
          saveId: this.e.uid,
          headImg: `${gameResPath}img/worldcard/${banner}`
        }
      }
      case "sr": {
        gameResPath += "StarRail/"
        let banner = _.sample(fs.readdirSync(`${gameResPath}img/worldcard`))
        const metaSr = `${this._path}/plugins/miao-plugin/resources/meta-sr/`
        return {
          ...data,
          metaSr,
          game: "sr",
          uid: this.e.uid,
          gameResPath,
          saveId: this.e.uid,
          headImg: `${gameResPath}img/worldcard/${banner}`,
          miaoResPath: `${this._path}/plugins/miao-plugin/resources/`
        }
      }
      case "gs": {
        gameResPath += "Genshin/"
        const metaGs = `${this._path}/plugins/miao-plugin/resources/meta-gs/`
        this.headIndexStyle = `<style> .head_box { background: url(${this.headbanner}) #f5f5f5; background-position-x: 30px; background-repeat: no-repeat; border-radius: 15px; "Number", "55W"; padding: 10px 20px; position: relative; background-size: auto 101%; }</style>`
        if (!this.e.uid) this.e.uid = this.uid
        return {
          ...data,
          metaGs,
          game: "gs",
          uid: this.e.uid,
          gameResPath,
          saveId: this.e.uid,
          headImg: this.headbanner,
          headIndexStyle: this.headIndexStyle
        }
      }
      case "wd": {
        gameResPath += "Wd/"
        if (!this.e.uid) this.e.uid = this.uid
        return {
          ...data,
          game: "wd",
          uid: this.e.uid,
          gameResPath,
          saveId: this.e.uid
        }
      }
      case "bh3": {
        gameResPath += "Bh3/"
        if (!this.e.uid) this.e.uid = this.uid
        return {
          ...data,
          game: "bh3",
          uid: this.e.uid,
          gameResPath,
          headImg: `${gameResPath}img/other/banner.png`
        }
      }
      default: {
        return {
          ...data,
          headImg: this.headbanner
        }
      }
    }
  }
}