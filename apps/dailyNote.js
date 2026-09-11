import { gsCfg } from "#index"
import Note from "../model/note/index.js"

export class dailyNote extends plugin {
  constructor () {
    super({
      name: "[genshin/dailyNote.js]小组件体力查询",
      dsc: "体力查询",
      event: "message",
      priority: -Infinity,
      rule: [
        { reg: "^#?(多|全|全部|原神|星铁|绝区零)?(体力|开拓力|树脂|查询体力|便笺|便签)$", fnc: "note" }
      ]
    })
  }

  /** 小组件体力 */
  async note () {
    if (!gsCfg.getConfig("config", "dailyNote").Note) return false
    await Note.get(this.e)
  }
}