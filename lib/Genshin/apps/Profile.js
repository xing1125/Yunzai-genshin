import { Serv } from "#fansky.models"
import ProfileDmg from "./profile/ProfileDmg.js"

export class Profile extends plugin {
  constructor () {
    super({
      name: "[Genshin/Profile.js]提瓦特小助手",
      dsc: "提瓦特小助手",
      event: "message",
      priority: 2000,
      rule: [
        { reg: /^#(极限)?队伍伤害(详情|过程|全图)?(.*)$/, fnc: "damage" }
      ]
    })
  }

  async damage (e) {
    let msg = e.original_msg || e.msg
    if (!msg) {
      return false
    }
    let uid = await Serv.getUid(e)
    if (!uid) {
      e.reply("尚未绑定uid~ 请【#绑定uid】\n或：#队伍伤害100000000钟离, 阿贝多, 可莉, 魈")
      return true
    }
    if (/极限/.test(msg)) {
      e.isSuper = true
      uid = 100000000
    }
    if (/详情|过程|全图/.test(msg)) {
      e.detail = true
    }
    let roles = msg.replace(/#(极限)?队伍伤害(详情|过程|全图)?/g, "").trim()
    roles = roles.replace(/\d+/g, "")
      .split(/[\s,，、。|\-]+/g).filter(v => v !== "").slice(0, 4) || []
    if (!Array.isArray(roles)) {
      roles = []
    }
    if (!roles.length) {
      e.reply("未指定队伍, 尝试获取面板前4名角色~", true, { recallMsg: 10 })
    }
    return await ProfileDmg.teamDmg(e, roles, uid)
  }
}
