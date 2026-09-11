import fs from "node:fs"
import chalk from "chalk"
import { gsCfg } from "#index"
import { fileURLToPath } from "url"
import { dirname, join } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let ret = []
const files = []

/**
 * 导入js
 * @param {string} loadPath 绝对路径
 */
function importApps (loadPath) {
  fs.readdirSync(loadPath).forEach(i => {
    const path = join(loadPath, i)
    if (i.endsWith(".js")) {
      ret.push(import(`file://${path}`))
      const paths = path.split(/\/|\\/)
      const [name, base, dir] = paths.reverse()
      files.push(join(dir, base, name))
    } else {
      const stat = fs.statSync(path)
      if (stat.isDirectory()) {
        importApps(path)
      }
    }
  })
}

/** mys-plugin目录 */
const mysPluginDir = join(__dirname, "..", "mys-plugin")

if (!fs.existsSync(mysPluginDir)) {
  fs.mkdirSync(mysPluginDir, { recursive: true })
  logger.info(chalk.green(`mys-plugin目录创建成功: ${mysPluginDir}`))
  const guobaSupportContent = "export { supportGuoba } from '../genshin/model/guoba/index.js'"
  fs.writeFileSync(join(mysPluginDir, "guoba.support.js"), guobaSupportContent)
  logger.info(chalk.green("guoba.support.js 文件已创建"))
  const indexJsContent = "export { }"
  fs.writeFileSync(join(mysPluginDir, "index.js"), indexJsContent)
  logger.info(chalk.green("index.js 文件已创建"))
}
importApps(join(__dirname, "apps"))
importApps(join(__dirname, "lib", "Genshin", "apps"))
logger.info(chalk.rgb(153, 255, 165)("--------\\原神插件载入成功/--------"))
importApps(join(__dirname, "lib", "StarRail", "apps"))
logger.info(chalk.rgb(153, 255, 165)("--------\\星铁插件载入成功/--------"))
importApps(join(__dirname, "lib", "ZZZero", "apps"))
logger.info(chalk.rgb(153, 255, 165)("-------\\绝区零插件载入成功/-------"))
importApps(join(__dirname, "lib", "Wd", "apps"))
logger.info(chalk.rgb(153, 255, 165)("-----\\未定事件簿插件载入成功/-----"))
importApps(join(__dirname, "lib", "Bh3", "apps"))
logger.info(chalk.rgb(153, 255, 165)("-------\\崩坏三插件载入成功/-------"))
/** if (gsCfg.getConfig("config", "admin").bbRole) { */
/** importApps(join(__dirname, "lib", "BH2", "apps")) */
/** logger.info(chalk.rgb(153, 255, 165)("-------\\崩坏学园2插件载入成功/-------")) */
/** } */
logger.info(chalk.rgb(153, 255, 165)("-------\\米游社插件载入成功/-------"))
logger.info(chalk.rgb(153, 255, 165)("---------\\(≧▽≦)/---------"))
ret = await Promise.allSettled(ret)
let apps = {}
let err = false
for (const i in files) {
  const name = files[i].replace(".js", "")
  if (ret[i].status != "fulfilled") {
    const error = ret[i].reason.message
    err = true
    if (error.includes("ji-plugin")) continue
    logger.error(`载入插件错误：${logger.red(name)}`)
    if (error.includes("Cannot find package")) {
      const pack = /Cannot find package '(.+?)'/.exec(error)?.[1]
      logger.error("--------genshin依赖缺失--------")
      logger.error(`genshin 缺少依赖: ${pack}`)
      logger.error(`如需使用请运行：${logger.red("pnpm i")}`)
      logger.error("---------------------------")
    } else if (error.includes("Cannot find module")) {
      const mod = /Cannot find module '(.+?)'/.exec(error)?.[1]
      logger.error("--------genshin模块缺失--------")
      logger.error(`genshin 缺少模块: ${mod}`)
      logger.error("请检查是否有对应的文件或模块")
    } else {
      logger.error(ret[i].reason)
    }
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }

if (!err) {
  logger.info(chalk.rgb(153, 255, 165)("米游社插件载入成功"))
  logger.info(chalk.rgb(153, 255, 165)("作者 ：Aozaki Arina"))
  logger.info(chalk.rgb(153, 255, 165)("-----感谢以下开发者-----"))
  logger.info(chalk.rgb(153, 255, 165)("----------") + chalk.cyan("@hlhs") + chalk.rgb(153, 255, 165)("---------"))
  logger.info(chalk.rgb(153, 255, 165)("---------") + chalk.cyan("@XasYer") + chalk.rgb(153, 255, 165)("--------"))
  logger.info(chalk.rgb(153, 255, 165)("---------") + chalk.cyan("@Aluxes") + chalk.rgb(153, 255, 165)("--------"))
  logger.info(chalk.rgb(153, 255, 165)("-------") + chalk.cyan("@HDTianRu") + chalk.rgb(153, 255, 165)("--------"))
  logger.info(chalk.rgb(153, 255, 165)("-------") + chalk.cyan("@babanbang") + chalk.rgb(153, 255, 165)("-------"))
  logger.info(chalk.rgb(153, 255, 165)("-----") + chalk.cyan("@Parker Liang") + chalk.rgb(153, 255, 165)("------"))
  logger.info(chalk.rgb(153, 255, 165)("------------------------"))
}