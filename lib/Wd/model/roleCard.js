import { MysInfo, base, Button } from "#index"
import { saveGameData } from "../../../model/gameData.js"

export default class RoleIndex extends base {
  async getData () {
    let ApiData = {
      index: "",
      UserGame: ""
    }
    let res = await MysInfo.get(this.e, ApiData, "")
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) {
      MysInfo.setUidMsg(this.e)
      this.e.reply([MysInfo.uidMsg, new Button(this.e).bingGameUid()], false)
      return false
    }
    let stats = res[0].data.stats || {}
    let avatars = res[0].data.avatar || {}
    let roleIndex = res[1].data.list
    let uid = String(this.e.uid || "")
    let userGame = roleIndex.find(item => String(item.game_uid) === uid) || {}
    saveGameData("wd", uid || userGame.game_uid, {
      name: userGame.nickname || res[0].data.role?.nickname || "",
      server: userGame.region_name || userGame.region || res[0].data.role?.region || "",
      level: userGame.level || res[0].data.role?.level || stats.level || 0
    })
    let role = {
      line: [
        { lable: "累计签到天数", num: stats.active_day_number, extra: Math.floor((new Date() - new Date("2020-07-30")) / (1000 * 60 * 60 * 24)) + 1 },
        { lable: "女神的试炼", num: stats.tower_progress || "-" },
        { lable: "主线", num: stats.mainline_progress }
      ],
      other: [
        { lable: "思绪收集进度", num: stats.collected_card_number, extra: stats.total_card_number },
        { lable: "插画收集进度", num: stats.collected_photo_number, extra: stats.total_photo_number },
        { lable: "图鉴收集度", num: (stats.collection_base_point / 100).toFixed(0) + "%" },
        { lable: "徽章获取数", num: stats.emblem_number },
        { lable: "家具收集件数", num: stats.furniture_number },
        { lable: "基地等级", num: stats.base_level }
      ]
    }
    return {
      ...this.screenData,
      role,
      roleIndex,
      avatars
    }
  }
}
