import _ from "lodash"
import fs from "node:fs"
import YAML from "yaml"
import path from "node:path"
import gsCfg from "../model/gsCfg.js"
import Help from "../model/other/help.js"
import { update as Update } from "../../other/update.js"

export class help extends plugin {
  constructor () {
    super({
      name: "[genshin/help.js]帮助",
      dsc: "云崽帮助",
      event: "message",
      priority: 500,
      rule: [
        { reg: "^(#|云崽|米游社)*(命令|帮助|菜单|help|功能|指令|使用说明)$", fnc: "help" },
        { reg: "^(#|云崽|米游社)*(README|readme|说明|说明文档|文档)$", fnc: "readme" },
        { reg: "^#*(米游社|原神|genshin)(插件)?(强制)?更新$", fnc: "update" },
        { reg: /^#(米游社|原神|genshin)(版本|更新日志)$/, fnc: "version" }
      ]
    })
    this.typeName = "genshin"
    this.Bmfile = "./plugins/genshin/config/config/role.name.yaml"
  }

  /** 帮助 */
  async help () {
    let data = await new Help(this.e).getHelp()
    if (!data) return
    this.reply(await this.renderImg("genshin", "Mys/html/help/help", data, { retType: "base64" }))
  }

  /** README渲染 */
  async readme () {
    try {
      const readmePath = path.join(process.cwd(), "plugins/genshin/README-HELP.md")
      if (!fs.existsSync(readmePath)) {
        this.reply("README.md文件不存在")
        return
      }
      const readmeContent = fs.readFileSync(readmePath, "utf-8")
      const data = await this.parseReadme(readmeContent)
      this.reply(await this.renderImg("genshin", "Mys/html/readme/readme", data, { retType: "base64" }))
    } catch (error) {
      this.reply("README渲染失败，请稍后重试")
    }
  }

  /** 插件更新 */
  async update (e = this.e, isauto = false) {
    if (!(e.isMaster || e.user_id == 860563585 || e.user_id == 2990740994 || e.user_id == 84227871)) return
    e.isMaster = true
    if (e.at && !e.atme) return
    e.msg = `#${e.msg.includes("强制") ? "强制" : ""}更新${this.typeName}`
    const up = new Update(e)
    up.e = e
    return up.update()
  }

  /** 插件版本 */
  async version (e = this.e) {
    let data = await new Help(this.e).getVersion()
    if (!data) return
    this.reply(await this.renderImg("genshin", "Mys/html/version/version", data, { retType: "base64" }))
  }

  /** 初始化创建配置文件 */
  async init () {
    /** 别名 */
    await this.initRoleNameFile()
    /** 迁移配置文件 */
    await this.migrateConfigFiles()
    /** 初始化配置文件 */
    await this.initRequiredConfigFiles()
    /** 创建文件夹 */
    await this.createDirectories()
    /** 迁移笔记数据 */
    await this.migrateNoteData()
  }

  async initRoleNameFile () {
    if (!fs.existsSync(this.Bmfile)) {
      fs.writeFileSync(this.Bmfile, `神里绫华:
        - 龟龟
        - 小乌龟`)
    }
  }

  async migrateConfigFiles () {
    const oldConfigDir = "./plugins/genshin/config/"
    const newConfigDir = "./plugins/genshin/config/config/"
    if (!fs.existsSync(oldConfigDir)) return
    const files = fs.readdirSync(oldConfigDir)
    await Promise.all(files.map(async file => {
      if (file.endsWith(".yaml")) {
        const oldPath = path.join(oldConfigDir, file)
        const newPath = path.join(newConfigDir, file)
        if (!fs.existsSync(newPath)) {
          fs.renameSync(oldPath, newPath)
          logger.mark(`[配置文件迁移] ${oldPath} -> ${newPath}`)
        }
      }
    }))
  }

  async initRequiredConfigFiles () {
    const requiredFiles = [
      ["config", "uid"],
      ["config", "admin"],
      ["config", "dailyNote"],
      ["mys", "set"],
      ["mys", "pubCk"],
      ["mys", "pushNews"],
      ["gacha", "set"],
      ["gacha", "newpool"]
    ]

    const newConfigDir = "./plugins/genshin/config/config/"
    await Promise.all(requiredFiles.map(async ([app, name]) => {
      const filePath = path.join(newConfigDir, `${app}.${name}.yaml`)
      if (!fs.existsSync(filePath)) {
        gsCfg.cpCfg(app, name)
        logger.mark(`[配置文件初始化] ${app}.${name}.yaml`)
      }
    }))
  }

  async createDirectories () {
    const directories = [
      "./data/bg",
      "./data/gachaJson",
      "./data/NoteData/gs",
      "./data/NoteData/sr",
      "./data/NoteData/zzz",
      "./data/gachaTemp",
      "./data/srJson",
      "./data/payLog/gs",
      "./data/payLog/sr",
      "./temp/uigf",
      "./temp/strategy/gs",
      "./temp/strategy/sr",
      "./temp/strategy/zzz",
      "./temp/material/gs",
      "./temp/material/sr",
      "./temp/material/zzz"
    ]

    await Promise.all(directories.map(dir =>
      fs.promises.mkdir(dir, { recursive: true })
    ))
  }

  async migrateNoteData () {
    const dataDirs = [
      { src: "./data/SR_NoteData", dest: "./data/NoteData/sr" },
      { src: "./data/NoteData", dest: "./data/NoteData/gs" }
    ]
    await Promise.all(dataDirs.map(async ({ src, dest }) => {
      if (fs.existsSync(src) && (!fs.existsSync(dest) || _.isEmpty(fs.readdirSync(dest)))) {
        await this.moveFiles(src, dest)
      }
    }))
    const payLogSrc = "./data/payLog"
    const payLogDest = "./data/payLog/gs"
    if (fs.existsSync(payLogSrc)) {
      fs.mkdirSync(payLogDest, { recursive: true })
      const files = fs.readdirSync(payLogSrc).filter(f => f.endsWith(".yaml"))
      for (const file of files) {
        const yamlPath = path.join(payLogSrc, file)
        try {
          const yamlData = YAML.parse(fs.readFileSync(yamlPath, "utf-8"))
          for (const [uid, data] of Object.entries(yamlData)) {
            const jsonPath = path.join(payLogDest, `${uid}.json`)
            if (!fs.existsSync(jsonPath)) {
              fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8")
            }
          }
          fs.unlinkSync(yamlPath)
          logger.mark(`[充值记录] ${file} 迁移完成并删除`)
        } catch (err) {
          logger.error(`[充值记录] ${file} 迁移失败：${err}`)
        }
      }
      if (fs.readdirSync(payLogSrc).length === 0) {
        fs.rmdirSync(payLogSrc)
        logger.mark("[充值记录] 源目录已清理")
      }
    }
  }

  async moveFiles (srcDir, destDir) {
    if (!fs.existsSync(srcDir)) {
      console.log(`Source directory does not exist: ${srcDir}`)
      return
    }
    await fs.promises.mkdir(destDir, { recursive: true })
    const files = await fs.promises.readdir(srcDir)
    await Promise.all(files.map(async file => {
      const srcFile = path.join(srcDir, file)
      const destFile = path.join(destDir, file)
      const stat = await fs.promises.lstat(srcFile)
      if (stat.isFile()) {
        try {
          await fs.promises.rename(srcFile, destFile)
          console.log(`Moved: ${file}`)
        } catch (err) {
          console.error(`Error moving file ${file}:`, err)
        }
      } else {
        console.log(`Skipped folder: ${file}`)
      }
    }))
  }

  /** 解析README内容 */
  async parseReadme (content) {
    const lines = content.split("\n")
    const sections = []
    let currentSection = null
    let currentContent = []
    let inCodeBlock = false
    let codeBlockContent = []
    let codeBlockLanguage = ""
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          if (currentSection) {
            currentSection.codeBlocks = currentSection.codeBlocks || []
            currentSection.codeBlocks.push({
              language: codeBlockLanguage,
              content: codeBlockContent.join("\n")
            })
          }
          inCodeBlock = false
          codeBlockContent = []
          codeBlockLanguage = ""
        } else {
          if (currentSection) {
            currentSection.content = currentContent.join("\n")
          }
          inCodeBlock = true
          codeBlockLanguage = line.replace("```", "").trim()
        }
        continue
      }
      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }
      if (line.startsWith("#")) {
        if (currentSection) {
          currentSection.content = currentContent.join("\n")
          sections.push(currentSection)
        }
        const level = line.match(/^#+/)[0].length
        const title = line.replace(/^#+\s*/, "")
        currentSection = {
          level,
          title,
          content: "",
          codeBlocks: []
        }
        currentContent = []
        continue
      }
      if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
        if (!currentSection) {
          currentSection = {
            level: 1,
            title: "内容",
            content: "",
            codeBlocks: []
          }
        }
      }
      if (line.includes("|") && line.trim().startsWith("|")) {
        if (!currentSection) {
          currentSection = {
            level: 1,
            title: "表格内容",
            content: "",
            codeBlocks: []
          }
        }
      }
      currentContent.push(line)
    }
    if (currentSection) {
      currentSection.content = currentContent.join("\n")
      sections.push(currentSection)
    }
    const processedSections = sections.map(section => {
      section.content = this.processImages(section.content)
      section.content = this.processLinks(section.content)
      section.content = this.processStrikethrough(section.content)
      section.content = this.processTextFormatting(section.content)
      section.tables = this.extractTables(section.content)
      section.lists = this.extractLists(section.content)
      section.content = section.content.replace(/\n/g, "<br>")
      return section
    })
    return {
      sections: processedSections,
      totalSections: sections.length,
      renderTime: new Date().toLocaleString("zh-CN")
    }
  }

  /** 处理链接 - 保留链接并添加蓝色样式 */
  processLinks (content) {
    // 将markdown链接转换为HTML链接，并添加蓝色样式
    return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" style=\"color: #0066cc !important; text-decoration: none; font-weight: 500;\">$1</a>")
  }

  /** 处理删除线 */
  processStrikethrough (content) {
    return content.replace(/~~([^~]+)~~/g, "<del>$1</del>")
  }

  /** 处理图片 */
  processImages (content) {
    return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "<img src=\"$2\" alt=\"$1\" style=\"max-width: 100%; height: auto;\">")
  }

  /** 处理粗体和斜体 */
  processTextFormatting (content) {
    // 处理粗体 **text** 或 __text__
    content = content.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    content = content.replace(/__([^_]+)__/g, "<strong>$1</strong>")
    // 处理斜体 *text* 或 _text_
    content = content.replace(/\*([^*]+)\*/g, "<em>$1</em>")
    content = content.replace(/_([^_]+)_/g, "<em>$1</em>")
    return content
  }

  /** 提取表格 */
  extractTables (content) {
    const tables = []
    const lines = content.split("\n")
    let currentTable = []
    let inTable = false
    for (const line of lines) {
      if (line.includes("|") && line.trim().startsWith("|")) {
        if (!inTable) {
          inTable = true
          currentTable = []
        }
        currentTable.push(line)
      } else {
        if (inTable && currentTable.length > 0) {
          tables.push(this.parseTable(currentTable))
          currentTable = []
          inTable = false
        }
      }
    }
    if (inTable && currentTable.length > 0) {
      tables.push(this.parseTable(currentTable))
    }

    return tables
  }

  /** 解析表格 */
  parseTable (tableLines) {
    const rows = tableLines.map(line => {
      return line.split("|")
        .map(cell => cell.trim())
        .filter(cell => cell !== "")
    })
    const headers = rows[0] || []
    const dataRows = rows.slice(2) // 跳过标题行和分隔符行
    return {
      headers,
      rows: dataRows
    }
  }

  /** 提取列表 */
  extractLists (content) {
    const lists = []
    const lines = content.split("\n")
    let currentList = []
    let inList = false
    for (const line of lines) {
      if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
        if (!inList) {
          inList = true
          currentList = []
        }
        currentList.push(line.trim())
      } else {
        if (inList && currentList.length > 0) {
          lists.push(this.parseList(currentList))
          currentList = []
          inList = false
        }
      }
    }
    if (inList && currentList.length > 0) {
      lists.push(this.parseList(currentList))
    }
    return lists
  }

  /** 解析列表 */
  parseList (listLines) {
    return listLines.map(line => {
      const match = line.match(/^([-*+]|\d+\.)\s*(.*)/)
      if (match) {
        return {
          type: match[1],
          content: match[2]
        }
      }
      return { type: "-", content: line }
    })
  }
}