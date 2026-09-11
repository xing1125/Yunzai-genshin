import _ from "lodash"
import fs from "node:fs"
import moment from "moment"
import { base, gsCfg } from "#index"

let imgFile = {}

export default class GachaData extends base {
  /**
   * @param e oicq 消息e
   * @param e.user_id 用户id
   */
  constructor (e) {
    super(e)
    /** 卡池 */
    this.pool = {}
    /** 默认设置 */
    this.def = gsCfg.getdefSet("gacha", "gacha")
    this.newpool = gsCfg.getdefSet("gacha", "newpool")
    this.set = gsCfg.getConfig("gacha", "set")
    /** 角色武器类型 */
    this.ele = gsCfg.element
    /** 默认角色池 */
    this.type = "role"
    /** 抽卡结果 */
    this.res = []
    this.fiveHave = []
    this.fourHave = []
  }

  static async init (e) {
    let gacha = new GachaData(e)
    /** 抽卡类型 */
    gacha.getTpye()
    /** 用户抽卡数据 */
    await gacha.userData()
    /** 卡池 */
    await gacha.getPool()
    return gacha
  }

  /** 抽卡 */
  async run () {
    let list = this.lottery()
    let data = {
      name: this.e.sender.card,
      ...this.screenData,
      ...this.lotteryInfo(),
      list
    }

    return data
  }

  getTpye () {
    if (this.e.msg.includes("2")) this.role2 = true
    if (this.e.msg.includes("3")) this.role3 = true
    if (this.e.msg.includes("4")) this.role4 = true
    if (this.e.msg.includes("0")) this.type = "weapon"
    if (this.e.msg.includes("5")) this.type = "weapon5"
  }

  /** 奖池数据 */
  async getPool () {
    const poolFileList = [
      { type: "role", fileName: "301" },
      { type: "weapon", fileName: "302" }
    ]
    const nowPool = {
      weapon: {},
      role: {},
      permanent: {}
    }
    for (const i of poolFileList) {
      const poolData = gsCfg.getdefSet("pool", i.fileName)
      if (!poolData || !Array.isArray(poolData) || poolData.length === 0) {
        logger.error(`卡池数据读取失败: ${i.fileName}`)
        continue
      }
      const data = poolData.slice(0, 2).reverse()
      const index = data.findIndex((val) => new Date().getTime() <= new Date(val.to).getTime())
      const useIndex = index === -1 ? 0 : index
      const other = (() => {
        if (useIndex + 1 === data.length) {
          return data[useIndex - 1]
        } else {
          return data[useIndex + 1]
        }
      })()
      if (this.newpool.pool3 && this.newpool.pool4) {
        other.five[0] = gsCfg.getdefSet("gacha", "newpool").pool3 || other.five[0]
        other.five[1] = gsCfg.getdefSet("gacha", "newpool").pool4 || other.five[1]
      }
      nowPool[i.type] = {
        ...data[useIndex],
        other
      }
    }

    this.pool = {
      up4: (() => {
        if (this.type === "weapon5") {
          return []
        }
        if (this.type === "role" && (this.role3 || this.role4)) {
          return this.newpool.up4 || []
        }
        return nowPool[this.type]?.four || []
      })(),
      role4: this.type === "role" ? _.difference(this.def.role4, nowPool.role.four) : this.def.role4,
      weapon4: (() => {
        if (this.type === "weapon5") {
          return this.newpool.weapon4 || []
        }
        return this.type === "weapon" ? _.difference(this.def.weapon4, nowPool.weapon.four) : this.def.weapon4
      })(),
      up5: (() => {
        if (this.type === "role") {
          let up5 = nowPool.role.five[0]
          for (let i = 4; i > 1; i--) {
            if (this[`role${i}`]) {
              if (i === 3) {
                up5 = this.newpool.up5 || nowPool.role.other.five[0]
              } else if (i === 4) {
                up5 = this.newpool.up5_2 || nowPool.role.other.five[1]
              } else {
                up5 = i > 2 ? nowPool.role.other.five[i - 3] : nowPool.role.five[i - 1]
              }
            }
          }
          !Array.isArray(up5) && (up5 = [up5])
          return up5
        }
        if (this.type === "weapon5") {
          let weapon5 = this.newpool.weapon5
          return Array.isArray(weapon5) ? weapon5 : [weapon5]
        }
        return nowPool[this.type]?.five || []
      })(),
      five: (() => {
        if (this.type === "permanent") return this.def.role5
        if (this.type === "weapon5") return []
        return _.difference(this.def[`${this.type}5`], nowPool[this.type].five)
      })(),
      weapon3: this.def.weapon3,
      fiveW: this.type === "permanent" ? this.def.weapon5 : undefined
    }
    this.NowPool = {
      up5: [nowPool.role.five[0]],
      up5_2: [nowPool.role.five[1]],
      up5_3: [this.newpool.up5 || nowPool.role.other.five[0]],
      up5_4: [this.newpool.up5_2 || nowPool.role.other.five[1]],
      weapon5: this.newpool.weapon5
    }
  }

  /** 用户数据 */
  async userData () {
    if (this.user) return this.user
    let user = this.readUser()
    if (user) {
      /** 重置今日数据 */
      if (this.getNow() > user.today.expire) {
        user.today = { star: [], expire: this.getEnd().end4, num: 0, weaponNum: 0 }
      }
      /** 重置本周数据 */
      if (this.getNow() > user.week.expire) {
        user.week = { num: 0, expire: this.getWeekEnd() }
      }
    } else {
      let commom = { num4: 0, isUp4: 0, num5: 0, isUp5: 0 }
      user = {
        permanent: commom,
        role: commom,
        weapon: {
          ...commom,
          /** 命定值 */
          lifeNum: 0,
          /** 定轨 0-取消 1-武器1 2-武器2 */
          type: 1
        },
        weapon5: {
          ...commom,
          /** 命定值 */
          lifeNum: 0,
          /** 定轨 0-取消 1-武器1 2-武器2 */
          type: 1
        },
        cons: {},
        today: { star: [], expire: this.getEnd().end4, num: 0, weaponNum: 0 },
        week: { num: 0, expire: this.getWeekEnd() }
      }
    }
    this.user = user
    return user
  }

  /**
   * 抽奖
   */
  lottery (save = true) {
    /** 十连抽 */
    for (let i = 1; i <= 10; i++) {
      this.index = i
      if (this.type == "weapon" || this.type == "weapon5") {
        this.user.today.weaponNum++
      } else {
        this.user.today.num++
      }
      if (this.lottery5()) continue
      if (this.lottery4()) continue
      this.lottery3()
    }
    if (save) this.saveUser()
    /** 排序 星级，角色，武器 */
    this.res = _.orderBy(this.res, ["star", "type", "have", "exceed", "index"], ["desc", "asc", "asc", "asc"])
    return this.res
  }

  lottery5 () {
    /** 是否大保底 */
    let isBigUP = false
    let isBing = false
    let tmpChance5 = this.probability()
    let type = this.type
    /** 没有抽中五星 */
    if (_.random(1, 10000) > tmpChance5) {
      /** 五星保底数+1 */
      this.user[this.type].num5++
      return false
    }
    let nowCardNum = this.user[this.type].num5 + 1
    /** 五星保底清零 */
    this.user[this.type].num5 = 0
    /** 四星保底数+1 */
    this.user[this.type].num4++
    let tmpUp = this.def.wai

    /** 已经小保底 */
    if (this.user[this.type].isUp5 == 1) {
      tmpUp = 101
    }
    if (this.type == "permanent") tmpUp = 0
    let tmpName = ""
    if (this.type == "weapon" && this.user[this.type].lifeNum >= 1) {
      /** 定轨 */
      tmpName = this.getBingWeapon()
      this.user[this.type].lifeNum = 0
      isBing = true
    } else if (_.random(1, 100) <= tmpUp) {
      /** 当祈愿获取到5星角色时，有50%的概率为本期UP角色 */
      if (this.user[this.type].isUp5 == 1) isBigUP = true
      /** 大保底清零 */
      this.user[this.type].isUp5 = 0
      /** 抽取up */
      tmpName = _.sample(this.pool.up5)
      /** 定轨清零 */
      if (tmpName == this.getBingWeapon()) {
        this.user[this.type].lifeNum = 0
      }
    } else {
      if (this.type == "permanent") {
        if (_.random(1, 100) <= 50) {
          tmpName = _.sample(this.pool.five)
          type = "role"
        } else {
          tmpName = _.sample(this.pool.fiveW)
          type = "weapon"
        }
      } else if (this.type === "weapon5") {
        tmpName = _.sample(this.pool.up5)
      } else {
        /** 歪了 大保底+1 */
        this.user[this.type].isUp5 = 1
        tmpName = _.sample(this.pool.five)
      }
    }
    /** 命定值++ */
    if (tmpName != this.getBingWeapon()) {
      this.user[this.type].lifeNum++
    }
    /** 记录今天五星 */
    this.user.today.star.push({ name: tmpName, num: nowCardNum })
    /** 本周五星数 */
    this.user.week.num++
    let have = false
    let exceed = false
    if (!this.user.cons[tmpName]) this.user.cons[tmpName] = 0
    this.user.cons[tmpName] += 1
    /** 重复抽中转换星辉 */
    if (this.user.cons[tmpName] > 1) {
      have = true
    }
    if (this.user.cons[tmpName] > 7) {
      exceed = true
    }
    this.res.push({
      name: tmpName,
      star: 5,
      type: this.type === "weapon5" ? "weapon" : type,
      num: nowCardNum,
      element: this.ele[tmpName] || "",
      index: this.index,
      isBigUP,
      isBing,
      have,
      exceed,
      imgFile: imgFile[tmpName] || `${tmpName}`,
      rand: _.random(1, 10)
    })
    return true
  }

  lottery4 () {
    let tmpChance4 = this.def.chance4
    /** 四星保底 */
    if (this.user[this.type].num4 >= 9) {
      tmpChance4 += 10000
    } else if (this.user[this.type].num4 >= 5) {
      tmpChance4 = tmpChance4 + Math.pow(this.user[this.type].num4 - 4, 2) * 500
    }
    /** 没抽中四星 */
    if (_.random(1, 10000) > tmpChance4) {
      /** 四星保底数+1 */
      this.user[this.type].num4++
      return false
    }
    /** 保底四星数清零 */
    this.user[this.type].num4 = 0
    /** 四星保底 */
    let tmpUp = 50
    if (this.type == "weapon") tmpUp = 75

    if (this.user[this.type].isUp4 == 1) {
      this.user[this.type].isUp4 = 0
      tmpUp = 100
    }
    if (this.type == "permanent") tmpUp = 0
    let type = "role"
    let tmpName = ""
    /** weapon5：四星恒定走自定义武器池，避免从空 up4 抽取 */
    if (this.type === "weapon5") {
      tmpName = _.sample(this.pool.weapon4)
      type = "weapon"
    } else if (_.random(1, 100) <= tmpUp) {
      /** up 4星 */
      tmpName = _.sample(this.pool.up4)
      type = this.type
    } else {
      this.user[this.type].isUp4 = 1
      /** 一半概率武器 一半4星 */
      if (_.random(1, 100) <= 50) {
        tmpName = _.sample(this.pool.role4)
        type = "role"
      } else {
        tmpName = _.sample(this.pool.weapon4)
        type = "weapon"
      }
    }
    let have = false
    let exceed = false
    if (!this.user.cons[tmpName]) this.user.cons[tmpName] = 0
    this.user.cons[tmpName] += 1
    /** 重复抽中转换星辉 */
    if (this.user.cons[tmpName] > 1) {
      have = true
    }
    if (this.user.cons[tmpName] > 7) {
      exceed = true
    }
    this.res.push({
      name: tmpName,
      star: 4,
      type: this.type === "weapon5" ? "weapon" : type,
      element: this.ele[tmpName] || "",
      index: this.index,
      imgFile: imgFile[tmpName] || `${tmpName}`,
      have,
      exceed,
      rand: _.random(1, 10)
    })

    return true
  }

  lottery3 () {
    /** 随机三星武器 */
    let tmpName = _.sample(this.pool.weapon3)
    this.res.push({
      name: tmpName,
      star: 3,
      type: "weapon",
      element: this.ele[tmpName] || "",
      index: this.index,
      imgFile: imgFile[tmpName] || `${tmpName}`
    })

    return true
  }

  probability () {
    let tmpChance5 = this.def.chance5
    if (this.type == "role" || this.type == "permanent") {
      /** 增加双黄概率 */
      if (this.user.week.num == 1) {
        tmpChance5 *= 2
      }
      /** 保底 */
      if (this.user[this.type].num5 >= 90) {
        tmpChance5 = 10000
      } else if (this.user[this.type].num5 >= 74) {
        /** 74抽之后逐渐增加概率 */
        tmpChance5 = 590 + (this.user[this.type].num5 - 74) * 530
      } else if (this.user[this.type].num5 >= 60) {
        /** 60抽之后逐渐增加概率 */
        tmpChance5 = this.def.chance5 + (this.user[this.type].num5 - 50) * 40
      }
    }
    if (this.type == "weapon" || this.type == "weapon5") {
      tmpChance5 = this.def.chanceW5
      /** 增加双黄概率 */
      if (this.user.week.num == 1) {
        tmpChance5 = tmpChance5 * 3
      }
      /** 80次都没中五星 */
      if (this.user[this.type].num5 >= 80) {
        tmpChance5 = 10000
      } else if (this.user[this.type].num5 >= 62) {
        /** 62抽后逐渐增加概率 */
        tmpChance5 = tmpChance5 + (this.user[this.type].num5 - 61) * 700
      } else if (this.user[this.type].num5 >= 45) {
        /** 50抽后逐渐增加概率 */
        tmpChance5 = tmpChance5 + (this.user[this.type].num5 - 45) * 60
      } else if (this.user[this.type].num5 >= 10 && this.user[this.type].num5 <= 20) {
        tmpChance5 = tmpChance5 + (this.user[this.type].num5 - 10) * 30
      }
    }
    return tmpChance5
  }

  /** 获取定轨的武器 */
  getBingWeapon (sortName = false) {
    if (this.type != "weapon") return false
    let name = this.pool.up5[this.user[this.type].type - 1]
    if (sortName) name = gsCfg.shortName(name, true)
    return name
  }

  lotteryInfo () {
    let info = `累计「${this.user[this.type === "weapon5" ? "weapon5" : this.type].num5}抽」`
    let nowFive = 0
    let nowFour = 0
    this.res.forEach((v, i) => {
      if (v.star == 5) {
        nowFive++
        if (v.type == "role") {
          info = gsCfg.shortName(v.name)
        } else {
          info = gsCfg.shortName(v.name, true)
        }
        info += `「${v.num}抽」`
        if (v.isBigUP) info += "大保底"
        if (v.isBing) info += "定轨"
      }
      if (v.star == 4) {
        nowFour++
      }
    })
    let poolName = `角色池：${gsCfg.shortName(this.pool.up5[0])}`
    if (this.type == "permanent") poolName = "常驻池"
    let res = {
      info,
      nowFive,
      nowFour,
      poolName,
      isWeapon: this.type == "weapon",
      bingWeapon: this.getBingWeapon(true),
      lifeNum: this.user[this.type]?.lifeNum || 0
    }
    logger.debug(`[${poolName}] [五星数：${nowFive}] [${info}] [定轨：${res.lifeNum}]`)
    return res
  }

  saveUser () {
    this.user.today.expire = this.getEnd().end4
    let path = `./temp/gachaTemp/${this.userId}`
    if (!fs.existsSync("./temp")) {
      fs.mkdirSync("./temp")
    }
    if (!fs.existsSync("./temp/gachaTemp")) {
      fs.mkdirSync("./temp/gachaTemp")
    }
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path)
    }
    fs.writeFileSync(`${path}/${this.e.uid}.json`, JSON.stringify(this.user, null, 2))
  }

  readUser () {
    try {
      return JSON.parse(fs.readFileSync(`./temp/gachaTemp/${this.userId}/${this.e.uid}.json`, "utf8"))
    } catch (err) {
      return false
    }
  }

  static async getStr () {
    global.strr = ""
  }

  getNow () {
    return moment().format("X")
  }

  getEnd () {
    let end = moment().endOf("day").format("X")
    let end4 = 3600 * 4
    if (moment().format("k") < 4) {
      end4 += Number(moment().startOf("day").format("X"))
    } else {
      end4 += Number(end)
    }
    return { end, end4 }
  }

  getWeekEnd () {
    return Number(moment().day(7).endOf("day").format("X"))
  }
}