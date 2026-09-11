import _ from "lodash"
import fs from "node:fs"
import YAML from "yaml"

const _path = process.cwd()
const getRoot = (root = "") => {
  if (root === "root" || root === "yunzai") {
    root = `${_path}/`
  } else if (root === "data") {
    root = `${_path}/data/FanSky/`
  } else {
    root = `${_path}/plugins/genshin/`
  }
  return root
}

let root = getRoot()
if (!fs.existsSync(`${root}config/alias.yaml`)) {
  await fs.copyFileSync(`${root}config/defSet/profile/sys_alias.yaml`, `${root}config/alias.yaml`)
}

let Data = {
  getRoot,
  /*
    * 根据指定的path依次检查与创建目录
    * */
  async createDir (path = "", root = "", includeFile = false) {
    root = getRoot(root)
    let pathList = path.split("/")
    pathList.forEach((name, idx) => {
      name = name.trim()
      if (name && (!includeFile || idx < pathList.length - 1)) {
        root += name + "/"
      }
    })
    await fs.promises.mkdir(root, { recursive: true })
  },

  /*
    * 读取json
    * */
  readJSON (file = "", root = "") {
    root = getRoot(root)
    if (!fs.existsSync(`${root}${file}`)) return { }
    try {
      return JSON.parse(fs.readFileSync(`${root}${file}`, "utf8"))
    } catch (e) {
      console.log(e)
      return { }
    }
  },

  /*
    * 写JSON
    * */
  async writeJSON (cfg, data, root = "", space = 2) {
    if (arguments.length > 1) {
      return Data.writeJSON({ name: cfg, data, root, space })
    }
    let name = cfg.path ? (cfg.path + "/" + cfg.name) : cfg.name
    Data.createDir(name, cfg.root, true)
    root = getRoot(cfg.root)
    data = cfg.data
    delete data._res
    data = JSON.stringify(data, null, cfg.space || 2)
    if (cfg.rn) {
      data = data.replaceAll("\n", "\r\n")
    }
    return fs.writeFileSync(`${root}${name}`, data)
  },

  readYAML (file = "", root = "") {
    root = getRoot(root)
    if (!fs.existsSync(`${root}${file}`)) return { }
    try {
      return YAML.parse(fs.readFileSync(`${root}${file}`, "utf8"))
    } catch (e) {
      console.log(e)
      return { }
    }
  },

  delFile (file, root = "") {
    try {
      root = getRoot(root)
      if (!fs.existsSync(`${root}${file}`)) return false
      fs.unlinkSync(`${root}${file}`)
      return true
    } catch (error) {
      logger.error(`文件删除失败：${error}`)
    }
  },

  async redisGet (key, def) {
    try {
      if (def === "ttl") {
        return await redis.ttl(key)
      }
      let txt = await redis.get(key)
      return txt ? JSON.parse(txt) : def || {}
    } catch (e) {
      console.log(e)
    }
  },

  async redisSet (key, data, EX = 3600 * 24 * 90) {
    await redis.set(key, JSON.stringify(data), { EX })
  },

  /*
    * 返回一个从 target 中选中的属性的对象
    *
    * keyList : 获取字段列表，逗号分割字符串
    *   key1, key2, toKey1:fromKey1, toKey2:fromObj.key
    *
    * defaultData: 当某个字段为空时会选取defaultData的对应内容
    * toKeyPrefix：返回数据的字段前缀，默认为空。defaultData中的键值无需包含toKeyPrefix
    *
    * */
  getData (target, keyList = "", cfg = {}) {
    let { defaultData, lowerFirstKey, keyPrefix } = cfg
    target = target || {}
    defaultData = defaultData || {}
    let ret = {}

    if (typeof (keyList) === "string") {
      keyList = keyList.split(",")
    }
    _.forEach(keyList, (keyCfg) => {
      let [keyTo, keyFrom] = keyCfg.split(":").map(v => v.trim())
      keyFrom = keyFrom || keyTo
      let keyRet = keyTo
      if (lowerFirstKey) {
        keyRet = _.lowerFirst(keyRet)
      }
      if (keyPrefix) {
        keyRet = keyPrefix + keyRet
      }
      ret[keyRet] = Data.getVal(target, keyFrom, defaultData[keyTo])
    })
    return ret
  },

  getVal (target, keyFrom, defaultValue) {
    return _.get(target, keyFrom, defaultValue)
  },

  sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default Data
