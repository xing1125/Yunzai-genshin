import Activity from "../model/activity.js"
import { Button } from "#index"

export class activity extends plugin {
  constructor () {
    super({
      name: "[StarRail/activity.js]星铁活动日历",
      dsc: "星穹铁道活动日历查询",
      event: "message",
      priority: 60,
      rule: [
        {
          reg: "^#*(星铁)(活动日历|活动一览|个人日历|活动)$",
          fnc: "calendar"
        }
      ]
    })
  }

  async calendar () {
    const data = await new Activity(this.e).get()
    if (!data) return false
    const img = await this.renderImg("genshin", "StarRail/html/activity/activity", data, { retType: "base64" })
    if (!img) return false
    await this.reply([img, new Button(this.e).roleSr()])
  }
}
