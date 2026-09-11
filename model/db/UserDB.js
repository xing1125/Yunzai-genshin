import _ from "lodash"
import MysUtil from "../mys/MysUtil.js"
import { UserGameDB } from "./index.js"
import BaseModel from "./BaseModel.js"
import MysUserDB from "./MysUserDB.js"

const { Types } = BaseModel
const COLUMNS = {
/** 用户ID，qq为数字 */
  id: {
    type: Types.STRING,
    autoIncrement: false,
    primaryKey: true
  },
  type: {
    type: Types.STRING,
    defaultValue: "qq",
    notNull: true
  },
  /** 昵称 */
  name: Types.STRING,
  /** 头像 */
  face: Types.STRING,
  ltuids: Types.STRING,
  games: {
    type: Types.STRING,
    get () {
      let data = this.getDataValue("games")
      let ret = {}
      try {
        data = JSON.parse(data) || {}
      } catch (e) {
        data = {}
      }
      MysUtil.eachGame((game) => {
        let ds = data[game] || {}
        ret[game] = {
          uid: ds.uid || "",
          data: ds.data || {}
        }
      })
      return ret
    },
    set (data) {
      this.setDataValue("games", JSON.stringify(data))
    }
  },
  data: Types.STRING
}

class UserDB extends BaseModel {
  static async find (id, type = "qq", create = false) {
    /** user_id */
    id = type === "qq" ? "" + id : type + id
    /** DB查询 */
    if (create) {
      const [user] = await UserDB.findOrCreate({
        where: { id },
        defaults: { type }
      })
      return user
    }
    const user = await UserDB.findByPk(id)
    return user || false
  }

  async saveDB (user) {
    let db = this
    let ltuids = []
    _.forEach(user.mysUsers, (mys) => {
      if (mys.ck && mys.ltuid) {
        ltuids.push(mys.ltuid)
      }
    })
    db.ltuids = ltuids.join(",")
    let games = {}
    _.forEach(user._games, (gameDs, game) => {
      games[game] = {
        uid: gameDs.uid,
        data: {}
      }
      _.forEach(gameDs.data, (ds, uid) => {
        games[game].data[uid] = {
          uid: ds.uid,
          type: ds.type
        }
      })
    })
    db.games = games
    await this.save()
  }
}

BaseModel.initDB(UserDB, COLUMNS)

await UserDB.sync()

export default UserDB