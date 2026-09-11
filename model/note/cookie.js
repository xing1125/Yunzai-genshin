import _ from "lodash"
import fs from "node:fs"
import YAML from "yaml"
import sqlite3 from "sqlite3"
import { common } from "#index"
import MysApi from "./mysApi.js"
import { promisify } from "node:util"
import MysUser from "../mys/MysUser.js"
import NoteUser from "../mys/NoteUser.js"

const _path = process.cwd().replace(/\\/g, "/")
const dir = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml/`

class CK {
  async get (user_id, note = false) { return { ...await this.getCK(user_id, note), ...await this.getSK(user_id) } }

  async del (type, ltuid, user_id) {
    switch (type) {
      case "ck": {
        let e = { user_id, msg: "删除ck", isSr: false, isZzz: false }

        try {
          let user = await NoteUser.create(e)
          let mys = await MysUser.create(ltuid)
          if (!mys) return

          await user.delMysUser(ltuid)
        } catch (error) {
          logger.error(error)
        }
        return
      }
      case "sk":
        if (ltuid) {
          user_id = String(user_id)
          if (!fs.existsSync(`${dir}${user_id}.yaml`)) return

          let sks = YAML.parse(fs.readFileSync(`${dir}${user_id}.yaml`, "utf-8"))
          for (let i in sks) {
            if (sks[i].stuid === ltuid) { delete sks[i] }
          }
          logger.mark(`[qq:${user_id}][stuid:${ltuid}]删除失效sk`)
          fs.writeFileSync(`${dir}${user_id}.yaml`, YAML.stringify(sks), "utf8")

          if (_.isEmpty(sks)) fs.unlinkSync(`${dir}${user_id}.yaml`)
        }
    }
  }

  async updCK (ck, e = {}) {
    if (ck.region) return false
    try {
      let { sks } = await this.getSK(ck.qq)
      if (_.isEmpty(sks)) return false

      let ltuids = []
      if (ck.ltuid) { ltuids.push(ck.ltuid) } else { ltuids = _.chain(sks).uniqBy("stuid").map("stuid").value() }

      for (let ltuid of ltuids) {
        const sk = sks[`${ltuid}_${ck.qq}`]
        if (!sk?.stoken) continue

        let data = { cookies: `uid=${ltuid}&${sk.stoken}` }
        if (ck.uid[0] > 5) data.method = "post"

        await common.sleep(_.random(1000, 5000))
        let res = await new MysApi(ck.uid, sk.sk, "gs", { _Porxy: ck._Porxy }).getData("BbsGetCookie", data)
        if (!res?.data) return false

        let upck = `ltoken=${sk.ltoken};ltuid=${ltuid};cookie_token=${res.data.cookie_token}; account_id=${ltuid};`
        if (_.isEmpty(e)) { e = { user_id: ck.qq, msg: upck, ck: upck, logFnc: "[ji-plugin]" } } else { e.msg = e.ck = upck }

        let sendMsg = []
        e._reply = e.reply
        e.reply = (msg) => { sendMsg.push(msg) }

        let userck = (await import(`file://${_path}/plugins/genshin/model/user.js`)).default
        await (new userck(e)).bing()

        if (ck.ltuid) { return upck } else { return e._reply(common.makeForwardMsg(e, sendMsg)) }
      }
    } catch (error) {
      logger.error(error)
      return false
    }
    return false
  }

  async getCK (user_id = "", note = false) {
    if (user_id) {
      user_id = Number(user_id) || String(user_id)
    }
    const gameList = ["gs", "sr", "zzz"]
    let userList = []
    let cks = _.fromPairs(gameList.map((i) => [i, {}]))

    const db = new sqlite3.Database(`${_path}/data/db/data.db`)
    const Users = `select id as qq, ltuid, ck, device, uids  from Users left join MysUsers on Users.ltuids Like '%' ||MysUsers.ltuid||'%' where ${user_id ? `Users.id = '${user_id}' and` : ""} Users.id is not null and MysUsers.ck is not null;`
    try {
      const rows = await new Promise((resolve, reject) => {
        db.all(Users, [], (err, rows) => {
          if (err) { reject(err) } else { resolve(rows) }
        })
      })

      for (let row of rows) {
        row.uids = JSON.parse(row.uids)
        for (let game of gameList) {
          let data = {}
          if (row.uids[game]) {
            for (let i of row.uids[game]) {
              data[i] = {
                qq: row.qq,
                ck: row.ck,
                uid: String(i),
                skid: `${row.ltuid}_${row.qq}`,
                region: row[`${game}_${i}_region`] || "",
                device_id: row.device,
                ltuid: row.ltuid
              }
            }
          }

          cks[game] = Object.assign({}, cks[game], data)
        }
        if (!userList.includes(Number(row.qq) || String(row.qq))) { userList.push(Number(row.qq) || String(row.qq)) }
      }
      const uids = _.fromPairs(gameList.map((game) => [game, _.map(cks[game], "uid")]))

      return { cks, uids, rows, userList }
    } catch (error) {
      logger.error(error)
      return { cks, uids: {}, rows: [], userList: [] }
    } finally {
      db.close()
    }
  }

  async getSK (user_id = "") {
    let list = {}; let userList = []
    try {
      let sks = []
      if (!user_id) {
        let files = fs.readdirSync(dir).filter(file => file.endsWith(".yaml"))

        const readFile = promisify(fs.readFile)

        let promises = []

        files.forEach((v) => promises.push(readFile(`${dir}${v}`, "utf8")))
        const res = await Promise.all(promises)
        res.forEach((v, index) => {
          sks.push(YAML.parse(v))
        })
        sks = Object.assign({}, ...sks)
      } else {
        if (!fs.existsSync(`${dir}${String(user_id)}.yaml`)) { return { sks: {}, ltuids: [], userList } }
        sks = YAML.parse(fs.readFileSync(`${dir}${String(user_id)}.yaml`, "utf-8"))
      }

      for (let i in sks) {
        if (sks[i].stoken && sks[i].stuid && (sks[i].ltoken || sks[i].mid)) {
          let id = `${sks[i].stuid}_${sks[i].userId}`
          if (!list[id]) {
            list[id] = {
              userId: sks[i].userId,
              ltoken: sks[i].ltoken,
              stuid: String(sks[i].stuid),
              stoken: `stoken=${sks[i].stoken}${sks[i].mid ? `&mid=${sks[i].mid}` : ""}`,
              sk_id: id,
              sk: `stuid=${sks[i].stuid};stoken=${sks[i].stoken};${sks[i].mid ? `mid=${sks[i].mid}` : `ltoken=${sks[i].ltoken}`};`
            }
          }
        }
        if (!userList.includes(Number(sks[i].userId) || String(sks[i].userId))) { userList.push(Number(sks[i].userId) || String(sks[i].userId)) }
      }
    } catch (error) {
      logger.error(error)
    }
    return { sks: list, ltuids: _.map(list, "sk_id"), userList }
  }
}

export default new CK()