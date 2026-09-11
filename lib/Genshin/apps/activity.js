import { Button } from "#index"
import Activity from "../model/activity.js"

export class activity extends plugin {
  constructor () {
    super({
      name: "[Genshin/activity.js]原神活动日历",
      dsc: "原神活动日历查询",
      event: "message",
      priority: 60,
      rule: [
        { reg: "^#*(原神)?(活动日历|活动一览|个人日历|活动)$", fnc: "calendar" }
      ]
    })
  }

  async calendar () {
    const data = await new Activity(this.e).get()
    if (!data) return false
    const img = await this.renderImg("genshin", "Genshin/html/activity/activity", data, { retType: "base64" })
    await this.reply([img, new Button(this.e).roleGs()])
  }
}
