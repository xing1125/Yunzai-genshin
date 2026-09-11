import fs from "node:fs"
import moment from "moment"
import { gsCfg, common } from "#index"

export class lots extends plugin {
  constructor () {
    super({
      name: "[Genshin/Game.js]御神签&委托成就&角色生日画片查询",
      dsc: "原神御神签&委托成就查询",
      event: "message",
      priority: 500,
      rule: [
        { reg: "^#?(御神签|求签)", fnc: "lots" },
        { reg: "^#*(.*)(留影叙佳期|留影|生日画片|画片)$", fnc: "birthdaystar" },
        { reg: "", fnc: "wt", log: false }
      ]
    })
  }

  /** #御神签 */
  async lots (e) {
    const key = "todayFortune:" + e.user_id
    const data = JSON.parse(fs.readFileSync(process.cwd() + "/plugins/genshin/resources/Genshin/json/lots.json", "utf8"))
    let msg
    if (await redis.exists(key) === 1) {
      msg = JSON.parse(await redis.get(key))
    } else {
      msg = data[Math.floor(Math.random() * data.length)]
      await redis.set(key, JSON.stringify(msg), { EX: getEXTime() })
    }
    let processedMsg = JSON.stringify(msg).replace(/[{}"]/g, "")
    processedMsg = processedMsg.replace(/,/g, "\n")
    this.reply(processedMsg)
  }

  /** #委托成就查询 */
  async wt (e) {
    if (!e.msg) return false
    let kg = gsCfg.getConfig("config", "admin")
    if (kg.mrRole) {
      if (!e.msg.includes("#")) return false
    }
    let name = e.msg.replace(/#|＃|？|。|,|，|·|!|！|—|《|》|…|「|」|『|』|、|\.|\?/g, "").trim()
    let data = JSON.parse(fs.readFileSync("./plugins/genshin/resources/Genshin/json/mr.json", "utf-8"))
    let name_, msg
    data.map((v) => {
      name_ = v.name.replace(/#|＃|？|。|,|，|·|!|！|—|《|》|…|「|」|『|』|、|\.|\?/g, "").trim()
      if (name == name_) {
        if (v.miaosu) {
          msg = `\n委托名：${v.name}\n地区：${v.city}\n版本：${v.version}\n成就名：${v.achievement}\n重点描述：\n${v.miaosu}\n影月月：${v.video}`
          msg = common.makeForwardMsg(e, msg, `成就：${v.achievement}`)
        } else {
          msg = `${v.city}委托，${v.achievement}`
        }
        return e.reply(msg)
      }
    })
    return false
  }

  /** #角色画片 */
  async birthdaystar (e) {
    let role = gsCfg.getRole(e.msg, "留影叙佳期|留影|生日画片|画片")
    if (!role) {
      await e.reply("请输入角色名，例：#七七生日画片#七七留影叙佳期")
      return
    }
    const data = JSON.parse(fs.readFileSync(process.cwd() + "/plugins/genshin/resources/Genshin/json/birth_draw.json", "utf8"))
    let roleDataList = data.filter(item => {
      return String(item.role_id) === String(role.roleId) || item.role_name === role.name
    })
    if (!roleDataList || roleDataList.length === 0) {
      await e.reply(`暂无${role.name}的留影叙佳期画片数据`)
      return
    }
    roleDataList.sort((a, b) => a.year - b.year)
    let forwardMsg = []
    for (let roleData of roleDataList) {
      let msgList = []
      const [month, day] = roleData.birthday.split("/")
      let dateStr = `${roleData.year}-${month}-${day}`
      if (roleData.word_text) {
        msgList.push(`${dateStr} ${roleData.word_text}`)
      } else {
        msgList.push(dateStr)
      }
      forwardMsg.push(msgList)
      if (roleData.take_picture && roleData.take_picture[0] && roleData.take_picture[0].trim()) {
        let yingMsg = ["莹"]
        yingMsg.push(segment.image(roleData.take_picture[0]))
        yingMsg.push(`图片链接：${roleData.take_picture[0]}`)
        forwardMsg.push(yingMsg)
      }
      if (roleData.take_picture && roleData.take_picture[1] && roleData.take_picture[1].trim()) {
        let emptyMsg = ["空"]
        emptyMsg.push(segment.image(roleData.take_picture[1]))
        emptyMsg.push(`图片链接：${roleData.take_picture[1]}`)
        forwardMsg.push(emptyMsg)
      }
    }
    const summary = `${role.name}的留影叙佳期画片`
    const finalMsg = await common.makeForwardMsg(e, forwardMsg, summary)
    await e.reply(finalMsg)
  }
}

/**
 * 获取今日剩余时间 (秒)
 */
function getEXTime () {
  const now = moment()
  const endOfDay = moment().endOf("day")
  const t = endOfDay.diff(now)
  return Math.floor(t / 1000)
}