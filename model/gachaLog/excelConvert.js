import _ from "lodash"
import moment from "moment"

const BASE_GACHA_TYPE_MAP = {
  角色活动祈愿: "301",
  武器活动祈愿: "302",
  常驻祈愿: "200",
  新手祈愿: "100",
  集录祈愿: "500"
}

export default class ExcelConvert {
  constructor (e) {
    this.e = e
    this.game = e.isSr ? "sr" : "gs"
    this.missingItems = new Set()
    this.stats = {}
  }

  async getItemIdMap () {
    const cacheKey = "gs_official_gacha_data"
    let cachedData = await redis.get(cacheKey)
    if (!cachedData) {
      const response = await fetch("https://api-takumi.mihoyo.com/event/platsimulator/config?gids=2&game=hk4e")
      if (!response.ok) {
        logger.error("[Excel转抽卡记录] 获取官方数据失败")
        return {}
      }
      const data = await response.json()
      if (data.retcode !== 0) {
        logger.error(`[Excel转抽卡记录] API错误: ${data.message}`)
        return {}
      }
      await redis.set(cacheKey, JSON.stringify(data.data))
      cachedData = JSON.stringify(data.data)
    }
    const gsData = JSON.parse(cachedData)
    const idMap = {}
    if (gsData.all_avatar) {
      gsData.all_avatar.forEach(avatar => {
        idMap[avatar.name] = String(avatar.id)
      })
    }
    if (gsData.all_weapon) {
      gsData.all_weapon.forEach(weapon => {
        idMap[weapon.name] = String(weapon.id)
      })
    }
    return idMap
  }

  determineGachaType (sheetName, remark) {
    const baseType = BASE_GACHA_TYPE_MAP[sheetName]
    if (sheetName === "角色活动祈愿") {
      if (!remark || remark.trim() === "") {
        return "301"
      }
      if (remark.trim() === "祈愿2") {
        return "400"
      }
    }
    return baseType || "301"
  }

  convertExcelToRecords (workbook, itemIdMap) {
    const sheetNames = workbook.SheetNames
    logger.mark(`[Excel转抽卡记录] 找到工作表: ${sheetNames.join(", ")}`)

    let records = []
    this.missingItems = new Set()
    this.stats = {}

    for (const sheetName of sheetNames) {
      if (!BASE_GACHA_TYPE_MAP[sheetName]) {
        logger.debug(`[Excel转抽卡记录] 跳过未知工作表: ${sheetName}`)
        continue
      }

      const sheet = workbook.Sheets[sheetName]
      const jsonData = this.sheetToJson(sheet)

      if (!jsonData || jsonData.length === 0) continue

      const headers = jsonData[0]
      const timeIndex = headers.indexOf("时间")
      const nameIndex = headers.indexOf("名称")
      const typeIndex = headers.indexOf("类别")
      const rankIndex = headers.indexOf("星级")
      const remarkIndex = headers.indexOf("备注")

      if (timeIndex === -1 || nameIndex === -1) {
        logger.warn(`[Excel转抽卡记录] 工作表 ${sheetName} 缺少必要列(时间/名称)`)
        continue
      }

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue

        const time = row[timeIndex]
        const name = row[nameIndex]
        const itemType = row[typeIndex]
        const rankType = String(row[rankIndex] || "3")
        const remark = row[remarkIndex]

        if (!time || !name) continue

        const gachaType = this.determineGachaType(sheetName, remark)
        const itemId = itemIdMap[name] || ""

        if (!itemId) {
          this.missingItems.add(`${name} (${itemType || "未知"})`)
        }

        this.stats[gachaType] = (this.stats[gachaType] || 0) + 1

        records.push({
          gacha_type: gachaType,
          item_id: itemId,
          count: "1",
          time: this.formatTime(time),
          name,
          item_type: itemType || "武器",
          rank_type: rankType,
          uigf_gacha_type: gachaType
        })
      }
    }

    if (records.length === 0) {
      return { records: [], missingItems: [], stats: {} }
    }

    records.sort((a, b) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime()
    })

    const baseId = BigInt("1000000000000000001")
    const finalRecords = records.map((record, index) => {
      const newId = String(baseId + BigInt(index))
      const { uigf_gacha_type, ...rest } = record
      return {
        ...rest,
        id: newId,
        uigf_gacha_type: record.gacha_type
      }
    })

    return {
      records: finalRecords,
      missingItems: Array.from(this.missingItems),
      stats: this.stats
    }
  }

  sheetToJson (sheet) {
    const result = []
    const range = this.decodeRange(sheet["!ref"])
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const row = []
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = this.encodeCell({ r: R, c: C })
        const cell = sheet[cellRef]
        row.push(cell ? cell.v : undefined)
      }
      result.push(row)
    }
    return result
  }

  decodeRange (ref) {
    const match = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!match) return { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
    return {
      s: { r: parseInt(match[2]) - 1, c: this.colToIndex(match[1]) },
      e: { r: parseInt(match[4]) - 1, c: this.colToIndex(match[3]) }
    }
  }

  colToIndex (col) {
    let index = 0
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + col.charCodeAt(i) - 64
    }
    return index - 1
  }

  encodeCell (cell) {
    const col = this.indexToCol(cell.c)
    return col + (cell.r + 1)
  }

  indexToCol (index) {
    let col = ""
    while (index >= 0) {
      col = String.fromCharCode((index % 26) + 65) + col
      index = Math.floor(index / 26) - 1
    }
    return col
  }

  formatTime (time) {
    if (!time) return ""
    if (typeof time === "string") return time
    if (typeof time === "number") {
      const date = moment("1899-12-30").add(time, "days")
      return date.format("YYYY-MM-DD HH:mm:ss")
    }
    if (time instanceof Date) {
      return moment(time).format("YYYY-MM-DD HH:mm:ss")
    }
    return String(time)
  }

  buildUigfData (records, uid) {
    const now = moment()
    return {
      info: {
        export_timestamp: now.format("X"),
        export_app: "Yunzai-Genshin",
        export_app_version: "2.0.0",
        version: "v4.0",
        lang: "zh-cn"
      },
      hk4e: [
        {
          uid,
          lang: "zh-cn",
          timezone: 8,
          list: records
        }
      ]
    }
  }
}
