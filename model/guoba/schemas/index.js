import Config from "./Config.js"
import GsCfg from "../../gsCfg.js"
import MysPush from "./MysPush.js"
import ConfigNote from "./ConfigNote.js"
import GachaPush from "./GachaPush.js"

export const schemas = [
  Config,
  ConfigNote,
  MysPush,
  GachaPush
].flat()

export function getConfigData () {
  return {
    MysSet: GsCfg.getConfig("mys", "set"),
    Config: GsCfg.getConfig("config", "admin"),
    ConfigNote: GsCfg.getConfig("config", "dailyNote"),
    MysPush: GsCfg.getConfig("mys", "pushNews"),
    CookiePush: GsCfg.getConfig("mys", "pubCk"),
    GachaPush: GsCfg.getConfig("gacha", "set"),
    GachaPool: GsCfg.getConfig("gacha", "newpool"),
    UIDList: GsCfg.getConfig("config", "uid")
  }
}

export async function setConfigData (data, { Result }) {
  const configMap = {
    MysSet: "mys.set",
    Config: "config.admin",
    ConfigNote: "config.dailyNote",
    MysPush: "mys.pushNews",
    CookiePush: "mys.pubCk",
    GachaPush: "gacha.set",
    GachaPool: "gacha.newpool",
    UIDList: "config.uid"
  }
  for (const key in data) {
    let split = key.split(".")

    let appName = split[0]
    if (configMap[appName]) {
      appName = configMap[appName]
    }
    GsCfg.modify(appName, split[1], data[key])
  }
  return Result.ok({}, "保存成功,𝑪𝒊𝒂𝒍𝒍𝒐～(∠・ω< )⌒★")
}