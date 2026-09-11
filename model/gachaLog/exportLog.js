import _ from "lodash"
import fs from "node:fs"
import path from "node:path"
import moment from "moment"
import XLSX from "xlsx"
import GachaLog from "./gachaLog.js"
import ExcelConvert from "./excelConvert.js"
import { base, common, cfg } from "#index"

export default class ExportLog extends base {
  constructor (e) {
    super(e)
    /** 绑定的uid */
    const game = e.isSr ? "srJson" : "genshin"
    this.uidKey = `Yz:${game}:mys:qq-uid:${this.userId}`
    this.path = `./data/${e.isSr ? "sr" : "gacha"}Json/${this.e.user_id}/`
    this.game = this.e.game
    this.pool = (game = "gs") => {
      let pool = {
        gs: [
          { type: 301, typeName: "角色活动" },
          { type: 302, typeName: "武器活动" },
          { type: 500, typeName: "集录" },
          { type: 200, typeName: "常驻" },
          { type: 100, typeName: "新手" }
        ],
        sr: [
          { type: 11, typeName: "角色活动" },
          { type: 12, typeName: "武器活动" },
          { type: 21, typeName: "角色联动" },
          { type: 22, typeName: "武器联动" },
          { type: 2, typeName: "新手活动" },
          { type: 1, typeName: "常驻" },
          { type: 10, typeName: "常驻" }
        ]
      }
      return pool[game]
    }
    this.typeName = (game = "gs") => {
      let type = {
        gs: {
          301: "角色",
          302: "武器",
          500: "集录",
          200: "常驻",
          100: "新手"
        },
        sr: {
          11: "角色",
          12: "武器",
          21: "角色联动",
          22: "武器联动",
          2: "新手",
          1: "常驻",
          10: "常驻"
        }
      }
      return type[game]
    }
  }

  async exportJson () {
    if (!this.e.isSr) {
      await common.downFile("https://api.uigf.org/dict/genshin/chs.json", "./temp/uigf/genshin.json")
    }
    await this.getUid()
    if (!this.uid) return false
    let list = this.getAllList().list
    let yunzaiName = cfg.package.name
    if (yunzaiName == "miao-yunzai") {
      yunzaiName = "Miao-Yunzai"
    } else if (yunzaiName == "yunzai") {
      yunzaiName = "Yunzai-Bot"
    } else if (yunzaiName == "trss-yunzai") {
      yunzaiName = "TRSS-Yunzai"
    } else {
      yunzaiName = _.capitalize(yunzaiName)
    }
    let basic = {
      export_time: moment().format("YYYY-MM-DD HH:mm:ss"),
      export_timestamp: moment().format("X"),
      export_app: yunzaiName,
      export_app_version: cfg.package.version
    }
    let data = ""
    if (this.e.uigfver === "v2") {
      data = {
        info: {
          uid: this.uid,
          lang: list[0].lang,
          ...basic
        },
        list
      }
      if (this.e.isSr) {
        data.info.srgf_version = "v1.0"
        data.info.region_time_zone = moment(list[0].time).utcOffset() / 60
      } else {
        data.info.uigf_version = "v2.3"
      }
    } else if (this.e.uigfver === "v4") {
      data = {
        info: {
          ...basic,
          version: "v4.0"
        },
        [this.e.game == "sr" ? "hkrpg" : "hk4e"]: [
          {
            uid: this.uid,
            lang: list[0].lang,
            timezone: moment(list[0].time).utcOffset() / 60,
            list
          }
        ]
      }
    }
    let saveFile = `${this.path}${this.uid}/${this.uid}.json`
    fs.writeFileSync(saveFile, JSON.stringify(data, "", "\t"))
    logger.mark(`${this.e.logFnc} 导出成功${this.uid}.json`)
    this.e.reply(`${this.uid}导出成功：${this.uid}.json，共${list.length}条 \n请接收文件`)
    if (this.e.group?.sendFile) { await this.e.group.sendFile(saveFile) } else if (this.e.friend?.sendFile) { await this.e.friend.sendFile(saveFile) } else this.e.reply("导出失败：暂不支持发送文件")
    /** 删除文件 */
    fs.unlink(saveFile, () => { })
  }

  async exportExcel () {
    await this.getUid()
    if (!this.uid) return false

    const poolMap = {
      gs: [
        { type: 301, sheetName: "角色活动祈愿" },
        { type: 302, sheetName: "武器活动祈愿" },
        { type: 500, sheetName: "集录祈愿" },
        { type: 200, sheetName: "常驻祈愿" }
      ],
      sr: [
        { type: 11, sheetName: "角色活动祈愿" },
        { type: 12, sheetName: "武器活动祈愿" },
        { type: 21, sheetName: "角色联动祈愿" },
        { type: 22, sheetName: "武器联动祈愿" },
        { type: 2, sheetName: "新手祈愿" },
        { type: 1, sheetName: "常驻祈愿" }
      ]
    }

    const pools = poolMap[this.game] || poolMap.gs
    const workbook = XLSX.utils.book_new()
    let totalRecords = 0

    for (const pool of pools) {
      const jsonFile = `${this.path}${this.uid}/${pool.type}.json`
      if (!fs.existsSync(jsonFile)) continue

      let records = JSON.parse(fs.readFileSync(jsonFile, "utf8"))
      if (records.length === 0) continue

      records = records.reverse()

      const excelData = records.map(record => ({
        时间: record.time,
        名称: record.name,
        类别: record.item_type,
        星级: record.rank_type,
        备注: ""
      }))

      const worksheet = XLSX.utils.json_to_sheet(excelData)
      XLSX.utils.book_append_sheet(workbook, worksheet, pool.sheetName)

      totalRecords += records.length
      logger.mark(`[Excel导出] ${pool.sheetName}: ${records.length}条`)
    }

    if (totalRecords === 0) {
      this.e.reply("没有可导出的抽卡记录")
      return false
    }

    const saveFile = `${this.path}${this.uid}/${this.uid}_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
    XLSX.writeFile(workbook, saveFile)

    logger.mark(`${this.e.logFnc} 导出Excel成功 ${this.uid}.xlsx`)
    this.e.reply(`${this.uid}导出Excel成功，共${totalRecords}条记录\n请接收文件`)

    if (this.e.group?.sendFile) {
      await this.e.group.sendFile(saveFile)
    } else if (this.e.friend?.sendFile) {
      await this.e.friend.sendFile(saveFile)
    } else {
      this.e.reply("导出失败：暂不支持发送文件")
    }

    fs.unlink(saveFile, () => { })
  }

  async getUid () {
    let gachLog = new GachaLog(this.e)
    let uid = await gachLog.getUid()
    if (!uid) return false
    this.uid = uid
    return this.uid
  }

  getAllList () {
    let uigf = "./temp/uigf/genshin.json"
    try {
      uigf = JSON.parse(fs.readFileSync(uigf, "utf8"))
    } catch (error) {
      uigf = false
    }
    let res = {
      list: []
    }
    let tmpId = {}
    for (let v of this.pool(this.game)) {
      let json = `${this.path}${this.uid}/${v.type}.json`
      if (fs.existsSync(json)) {
        json = JSON.parse(fs.readFileSync(json, "utf8"))
        json = json.reverse()
      } else {
        json = []
      }
      res[v.type] = json
      for (let v of json) {
        if (!v.item_id && uigf) {
          v.item_id = String(uigf[v.name])
        }
        if (!this.e.isSr) {
          if (v.gacha_type == 301 || v.gacha_type == 400) {
            v.uigf_gacha_type = "301"
          } else {
            v.uigf_gacha_type = v.gacha_type
          }
        }
        let id = v.id
        if (!id) {
          id = moment(v.time).format("x") + "000000"
          v.id = id
        } else {
          if (id.length == 13) {
            v.id = `${id}000000`
          }
        }
        if (tmpId[id]) {
          let newId = `${id}00000${tmpId[id].length}`
          tmpId[id].push(newId)
          v.id = newId
        } else {
          tmpId[id] = [id]
        }
        res.list.push(v)
      }
    }
    res.list = _.orderBy(res.list, ["id", "asc"])
    return res
  }

  loadJson (json) {
    if (!fs.existsSync(json)) return []
    return JSON.parse(fs.readFileSync(json, "utf8"))
  }

  getMessageFileUrl (msg = "") {
    if (typeof msg !== "string") return ""
    return msg.match(/https?:\/\/[^\s]+/i)?.[0]?.replace(/[)>】」』"'，。！？；;]+$/g, "") || ""
  }

  getImportFileName (fileName = "", fileUrl = "") {
    if (fileName) return fileName
    if (!fileUrl) return `${this.e.user_id}.json`

    try {
      const url = new URL(fileUrl)
      for (const key of ["filename", "fileName", "name"]) {
        const value = url.searchParams.get(key)
        if (value) return decodeURIComponent(value)
      }

      const baseName = decodeURIComponent(path.basename(url.pathname || ""))
      if (baseName) return baseName
    } catch {}

    return `${this.e.user_id}.json`
  }

  normalizeImportFileName (fileName = "") {
    const baseName = path.basename(fileName).trim()
    if (!baseName || [".", ".."].includes(baseName)) return `${this.e.user_id}.json`

    const safeName = baseName.replace(/[\\/:*?"<>|]/g, "_")
    if (!safeName) return `${this.e.user_id}.json`
    if (path.extname(safeName)) return safeName

    return `${safeName}.json`
  }

  async getImportSource () {
    const msgUrl = this.getMessageFileUrl(this.e.msg)
    let fileUrl = ""
    let fileName = ""

    if (this.e.file) {
      fileName = this.e.file.name || ""
      fileUrl = this.e.file.url || ""

      if (!/https?:\/\//.test(fileUrl)) {
        if (this.e.group?.getFileUrl && this.e.file.fid) {
          fileUrl = await this.e.group.getFileUrl(this.e.file.fid)
        } else if (this.e.friend?.getFileUrl && this.e.file.fid) {
          fileUrl = await this.e.friend.getFileUrl(this.e.file.fid)
        }
      }
    }

    if (!/https?:\/\//.test(fileUrl) && msgUrl) {
      fileUrl = msgUrl
      fileName = this.getImportFileName(fileName, fileUrl)
    }

    if (!/https?:\/\//.test(fileUrl)) return false

    const importName = this.normalizeImportFileName(this.getImportFileName(fileName, fileUrl))

    return {
      fileUrl,
      importName,
      textPath: `${this.path}${importName}`
    }
  }

  /** json导入抽卡记录 */
  async logJson () {
    const importSource = await this.getImportSource()
    if (!importSource) {
      this.e.reply("文件链接获取失败")
      return false
    }
    const { textPath, fileUrl, importName } = importSource

    const ret = await common.downFile(fileUrl, textPath)
    if (!ret) {
      this.e.reply("下载json文件错误")
      return false
    }
    try {
      let json = {}
      try {
        json = JSON.parse(fs.readFileSync(textPath, "utf8"))
      } catch (error) {
        if (/qfile\.qq\.com\/q\//i.test(fileUrl)) {
          this.e.reply("QQ闪传分享链接不是文件直链，机器人无法直接读取其中的json内容。请直接发送json文件，或发送可直接下载的文件链接。")
          return false
        }
        this.e.reply(`${importName},json格式错误`)
        return false
      }

      if (_.isEmpty(json) || (!json.list && !json.hkrpg && !json.hk4e)) {
        this.e.reply("json文件内容错误：非统一祈愿记录标准")
        return false
      }

      const hasSrData = Array.isArray(json.hkrpg) && json.hkrpg.some(item => item?.list?.length)
      const hasGsData = Array.isArray(json.hk4e) && json.hk4e.some(item => item?.list?.length)

      if (json.info?.srgf_version || hasSrData) {
        this.e.isSr = true
        this.game = "sr"
      } else if (hasGsData) {
        this.e.isSr = false
        this.game = "gs"
      }

      const gameKey = this.game === "sr" ? "hkrpg" : "hk4e"
      const accountData = Array.isArray(json[gameKey]) ? json[gameKey].find(item => item?.list?.length) : null
      let list = json.list ? json.list : accountData?.list
      if (!Array.isArray(list) || list.length === 0) {
        this.e.reply(`json文件内容错误：未找到${this.game === "sr" ? "星铁" : "原神"}抽卡记录`)
        return false
      }

      if (list && list.length > 0 && (!list[0].name || !list[0].item_type || !list[0].rank_type)) {
        const configMapping = {
          hk4e: {
            configUrl: "https://api-takumi.mihoyo.com/event/platsimulator/config?gids=2&game=hk4e",
            roleIdLength: 8,
            weaponIdLength: 5,
            roleDataKey: "all_avatar",
            weaponDataKey: "all_weapon",
            rankKey: "level",
            unknownRole: "未知角色",
            unknownWeapon: "未知武器"
          },
          hkrpg: {
            configUrl: "https://api-takumi.mihoyo.com/event/rpgsimulator/config?game=hkrpg",
            roleIdLength: 4,
            weaponIdLength: 5,
            roleDataKey: "avatar",
            weaponDataKey: "equipment",
            rankKey: "rarity",
            unknownRole: "未知角色",
            unknownWeapon: "未知光锥"
          }
        }
        const mapping = this.e.isSr ? configMapping.hkrpg : configMapping.hk4e
        let configData = {}
        try {
          const response = await fetch(mapping.configUrl)
          if (!response.ok) {
            throw new Error("获取配置文件失败")
          }
          configData = await response.json()
        } catch (error) {
          this.e.reply("获取或解析配置文件失败")
          return false
        }
        const getId = obj => String(obj.id || obj.item_id)
        const getName = obj => obj.name || obj.item_name
        const roleList = new Map(configData.data[mapping.roleDataKey].map(i => [getId(i), i]))
        const weaponList = new Map(configData.data[mapping.weaponDataKey].map(i => [getId(i), i]))

        list.forEach(record => {
          const idStr = String(record.item_id)
          if (idStr.length === mapping.roleIdLength) {
            record.item_type = "角色"
            const configRole = roleList.get(idStr)
            if (configRole) {
              record.name = getName(configRole)
              record.rank_type = String(configRole[mapping.rankKey])
            } else {
              record.name = record.name || mapping.unknownRole
              record.rank_type = record.rank_type || ""
            }
          } else if (idStr.length === mapping.weaponIdLength) {
            if (this.e.isSr) {
              record.item_type = "光锥"
              const configWeapon = weaponList.get(idStr)
              if (configWeapon) {
                record.name = getName(configWeapon)
                record.rank_type = String(configWeapon[mapping.rankKey])
              } else {
                record.name = record.name || mapping.unknownWeapon
                record.rank_type = record.rank_type || ""
              }
            } else {
              record.item_type = "武器"
              const configWeapon = weaponList.get(idStr)
              if (configWeapon) {
                record.name = getName(configWeapon)
                record.rank_type = String(configWeapon[mapping.rankKey])
              } else {
                record.name = record.name || mapping.unknownWeapon
                record.rank_type = record.rank_type || ""
              }
            }
          }
        })
      }

      let data = this.dealJson(list)
      if (!data) return false

      /** 保存json */
      let msg = []
      for (let type in data) {
        let typeName = this.typeName(this.game)
        if (!typeName[type]) continue
        let gachLog = new GachaLog(this.e)
        gachLog.uid = json.info?.uid
          ? json.info.uid
          : accountData?.uid || list[0]?.uid
        gachLog.type = type
        gachLog.writeJson(data[type])

        msg.push(`${typeName[type]}记录：${data[type].length}条`)
      }

      await this.e.reply(
        `${importName}，${this.e.isSr ? "星铁" : "原神"}记录导入成功\n${msg.join("\n")}`
      )
    } finally {
      /** 清理文件 */
      if (fs.existsSync(textPath)) fs.unlink(textPath, () => {})
    }
  }

  dealJson (list) {
    let data = {}
    /** 必要字段 */
    let reqField = ["id", "gacha_type", "item_type", "name", "time"]
    let reqFieldv4 = ["id", "gacha_type", "item_id", "time"]
    const missing = reqField.filter(field => !list[0][field])
    const missingV4 = reqFieldv4.filter(field => !list[0][field])

    if (missing.length > 0 && missingV4.length > 0) {
      this.e.reply(`json文件内容错误：缺少必要字段 ${missing.join(", ")} 或 ${missingV4.join(", ")}`)
      return false
    }
    /** 按id倒序，避免长整型id转成Number后精度丢失 */
    list.sort((a, b) => {
      const idA = a.id
      const idB = b.id
      if (idA.length !== idB.length) {
        return idB.length - idA.length
      }
      return idA === idB ? 0 : idB > idA ? 1 : -1
    })
    for (let v of list) {
      if (this.game === "sr") v.uigf_gacha_type = v.gacha_type
      if (!data[v.uigf_gacha_type]) data[v.uigf_gacha_type] = []
      data[v.uigf_gacha_type].push(v)
    }
    return data
  }

  /** Excel导入抽卡记录 */
  async logExcel () {
    const textPath = `${this.path}${this.e.file.name || `${this.e.user_id}.xlsx`}`
    let fileUrl = this.e.file.url
    if (/https?:\/\//.test(fileUrl)) {
    } else if (this.e.group?.getFileUrl) {
      fileUrl = await this.e.group.getFileUrl(this.e.file.fid)
    } else if (this.e.friend?.getFileUrl) {
      fileUrl = await this.e.friend.getFileUrl(this.e.file.fid)
    } else {
      this.e.reply("文件链接获取失败")
      return false
    }
    const ret = await common.downFile(fileUrl, textPath)
    if (!ret) {
      this.e.reply("下载Excel文件错误")
      return false
    }
    try {
      const workbook = XLSX.readFile(textPath)
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        this.e.reply("Excel文件格式错误：没有工作表")
        return false
      }
      logger.mark(`[Excel导入] 读取到工作表: ${workbook.SheetNames.join(", ")}`)
    } catch (error) {
      this.e.reply(`Excel文件读取失败：${error.message}`)
      return false
    }

    await this.e.reply("正在获取角色/武器ID映射...")

    const excelConvert = new ExcelConvert(this.e)
    const itemIdMap = await excelConvert.getItemIdMap()

    if (Object.keys(itemIdMap).length === 0) {
      this.e.reply("获取物品ID映射失败，请稍后重试")
      fs.unlink(textPath, () => { })
      return false
    }

    logger.mark(`[Excel导入] 获取到 ${Object.keys(itemIdMap).length} 个物品ID映射`)
    await this.e.reply("正在转换Excel数据...")

    let workbook
    try {
      workbook = XLSX.readFile(textPath)
    } catch (error) {
      this.e.reply(`Excel文件解析失败：${error.message}`)
      fs.unlink(textPath, () => { })
      return false
    }

    const { records, missingItems, stats } = excelConvert.convertExcelToRecords(workbook, itemIdMap)

    if (records.length === 0) {
      this.e.reply("未找到有效的抽卡记录，请检查Excel文件格式")
      fs.unlink(textPath, () => { })
      return false
    }

    const uid = await this.getExcelUid()
    if (!uid) {
      fs.unlink(textPath, () => { })
      return false
    }

    let data = this.dealJson(records)
    if (!data) return false

    let msg = []
    for (let type in data) {
      let typeName = this.typeName("gs")
      if (!typeName[type]) continue
      let gachLog = new GachaLog(this.e)
      gachLog.uid = uid
      gachLog.type = type
      gachLog.writeJson(data[type])
      msg.push(`${typeName[type]}记录：${data[type].length}条`)
    }

    let warningMsg = ""
    if (missingItems.length > 0) {
      const displayItems = missingItems.slice(0, 5)
      const moreCount = missingItems.length - displayItems.length
      warningMsg = `\n⚠️ 有 ${missingItems.length} 个物品未找到ID映射`
      if (moreCount > 0) {
        warningMsg += `（显示前5个：${displayItems.join(", ")} 等）`
      } else {
        warningMsg += `：${displayItems.join(", ")}`
      }
      logger.warn(`[Excel导入] 未找到ID的物品: ${missingItems.join(", ")}`)
    }

    fs.unlink(textPath, () => { })
    await this.e.reply(`Excel导入成功，共 ${records.length} 条记录\n${msg.join("\n")}${warningMsg}\nUID: ${uid}`)
  }

  async getExcelUid () {
    let uid = ""
    if (this.e.msg) {
      const match = this.e.msg.match(/(\d{9,10})/)
      if (match) {
        uid = match[1]
      }
    }
    if (!uid) {
      uid = this.e.user?._games?.gs?.uid || await redis.get(this.uidKey)
    }
    if (!uid) {
      this.e.at = false
      this.e.reply("未找到绑定的UID，请先绑定UID或发送 #导入记录 UID:你的UID")
      return false
    }
    this.uid = uid
    return uid
  }
}
