import base from "./base.js"
import gsCfg from "./gsCfg.js"
import { fileURLToPath } from "url"
import Button from "./other/button.js"
import MysApi from "./mys/mysApi.js"
import MysInfo from "./mys/mysInfo.js"
import cfg from "../../../lib/config/config.js"
import { join, dirname, basename } from "path"
import common from "../../../lib/common/common.js"
import puppeteer from "../../../lib/puppeteer/puppeteer.js"
import { Common, Version, Data } from "../../miao-plugin/components/index.js"
import { Character, Weapon, Player, Material } from "../../miao-plugin/models/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pluginPath = join(__dirname, "..")
const botPath = join(pluginPath, "../..")
const pluginName = basename(pluginPath)

export {
  cfg,
  Data,
  base,
  gsCfg,
  Player,
  Button,
  MysApi,
  Version,
  MysInfo,
  Weapon,
  Material,
  common,
  Common,
  Character,
  puppeteer,
  botPath,
  pluginPath,
  pluginName
}