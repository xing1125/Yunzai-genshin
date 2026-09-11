import fs from "node:fs"
import path from "node:path"

const dataDir = path.join(process.cwd(), "data", "gameData")

const serverNameMap = {
  cn_gf01: "天空岛",
  cn_qd01: "世界树",
  prod_gf_cn: "官服",
  prod_qd_cn: "渠道服",
  cn_prod_gf01: "官服",
  cn_prod_qd01: "渠道服",
  cn_prod_bb01: "B服",
  cn_prod_mix01: "渠道服",
  glb_prod_wd01: "国际服",
  tw_prod_wd01: "台服",
  os_usa: "美服",
  os_euro: "欧服",
  os_asia: "亚服",
  os_cht: "港澳台服",
  prod_official_usa: "美服",
  prod_official_euro: "欧服",
  prod_official_eur: "欧服",
  prod_official_asia: "亚服",
  prod_official_cht: "港澳台服",
  android01: "安卓官服",
  ios01: "iOS服",
  pc01: "全平台桌面服",
  yyb01: "应用宝服",
  bb01: "哔哩哔哩服",
  hun01: "渠道1服",
  hun02: "渠道2服",
  usa01: "美服",
  eur01: "欧服",
  asia01: "亚服",
  cht01: "港澳台服",
  jp01: "日服",
  kr01: "韩服"
}

function normalizeServerName (server) {
  if (!server) return ""
  return serverNameMap[server] || server
}

function inferServerByUid (game, uid) {
  uid = String(uid || "")
  if (!uid) return ""
  const first = uid[0]
  const prefix = uid.slice(0, -8)
  if (game === "gs") {
    if (["1", "2", "3"].includes(first)) return "cn_gf01"
    if (first === "5") return "cn_qd01"
    if (first === "6") return "os_usa"
    if (first === "7") return "os_euro"
    if (first === "8" || prefix === "18") return "os_asia"
    if (first === "9") return "os_cht"
    return "cn_gf01"
  }
  if (game === "sr") {
    if (["1", "2"].includes(prefix)) return "prod_gf_cn"
    if (prefix === "5") return "prod_qd_cn"
    if (prefix === "6") return "prod_official_usa"
    if (prefix === "7") return "prod_official_euro"
    if (prefix === "8" || prefix === "18") return "prod_official_asia"
    if (prefix === "9") return "prod_official_cht"
    return "prod_gf_cn"
  }
  if (game === "zzz") {
    if (["1", "2", "3"].includes(first)) return "prod_gf_cn"
    if (first === "5") return "prod_qd_cn"
    if (first === "6") return "prod_official_usa"
    if (first === "7") return "prod_official_euro"
    if (first === "8" || prefix === "18") return "prod_official_asia"
    if (first === "9") return "prod_official_cht"
    return "prod_gf_cn"
  }
  return ""
}

function readJson (file) {
  if (!fs.existsSync(file)) return {}
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) || {}
  } catch (err) {
    globalThis.logger?.error?.(`[gameData] 读取失败：${file}`)
    globalThis.logger?.error?.(err)
    return {}
  }
}

export function saveGameData (game, uid, data = {}) {
  uid = String(uid || "")
  if (!game || !uid) return false
  fs.mkdirSync(dataDir, { recursive: true })
  const file = path.join(dataDir, `${game}.json`)
  const json = readJson(file)
  const oldData = json[uid] || {}
  const nextData = { ...oldData, uid, ...data }
  if (!nextData.name) nextData.name = `玩家${uid}`
  if (!nextData.server) nextData.server = inferServerByUid(game, uid)
  if (nextData.server) nextData.server = normalizeServerName(nextData.server)
  json[uid] = nextData
  fs.writeFileSync(file, JSON.stringify(json, null, 2), "utf8")
  return true
}

export function getGameData (game, uid) {
  uid = String(uid || "")
  if (!game || !uid) return {}
  const file = path.join(dataDir, `${game}.json`)
  const json = readJson(file)
  return json[uid] || {}
}

export { inferServerByUid, normalizeServerName }
