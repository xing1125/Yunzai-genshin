import { base, gsCfg } from "#index"
import { exec } from "node:child_process"

export default class Help extends base {
  async getHelp () {
    let helpData = gsCfg.getdefSet("bot", "help")
    const isQQBot = this.e.adapter_name === "QQBot"
    const prefixes = gsCfg.getAllGamePrefixes()
    try {
      const adminConfig = gsCfg.getConfig("config", "admin") || {}
      const toArr = s => (s == null ? [] : String(s).split("|").map(x => x.trim()).filter(Boolean))
      const fallback = {
        gs: prefixes.gsPrefix || "#",
        sr: prefixes.srPrefix || "*",
        zzz: prefixes.zzzPrefix || "%",
        wd: prefixes.wdPrefix || "&",
        bh3: prefixes.bh3Prefix || "!",
        bh2: prefixes.bh2Prefix || "￥"
      }
      const mapping = [
        {
          key: "原神指令",
          name: "原神指令",
          arr: (() => {
            const a = toArr(adminConfig.gsPrefix)
            if (!a.length) return [fallback.gs]
            return a[0] === "*" ? ["#", ...a.slice(1)] : a
          })()
        },
        { key: "星铁指令", name: "星铁指令", arr: (() => { const a = toArr(adminConfig.srPrefix); return a.length ? a : [fallback.sr] })() },
        { key: "绝区零指令", name: "绝区零指令", arr: (() => { const a = toArr(adminConfig.zzzPrefix); return a.length ? a : [fallback.zzz] })() },
        { key: "未定事件簿指令", name: "未定事件簿指令", arr: (() => { const a = toArr(adminConfig.wdPrefix); return a.length ? a : [fallback.wd] })() },
        { key: "崩坏三指令", name: "崩坏三指令", arr: (() => { const a = toArr(adminConfig.bh3Prefix); return a.length ? a : [fallback.bh3] })() },
        { key: "崩坏学园二指令", name: "崩坏学园二指令", arr: (() => { const a = toArr(adminConfig.bh2Prefix); return a.length ? a : [fallback.bh2] })() }
      ]

      for (const val of (helpData || [])) {
        if (!val || !val.group) continue
        const m = mapping.find(mm => val.group.indexOf(mm.key) !== -1)
        if (m) {
          val.prefixList = m.arr
          val.group = m.name
          continue
        }
        if (val.group.indexOf("通用指令") !== -1) {
          val.group = "通用指令"
        }
      }
    } catch (err) {
    }

    return {
      ...this.screenData,
      saveId: "help",
      helpData,
      isQQBot,
      ...prefixes
    }
  }

  async getVersion (plugin = "genshin") {
    const execAsync = (cmd) => {
      return new Promise((resolve, reject) => {
        exec(cmd, { cwd: `plugins/${plugin}` }, (error, stdout, stderr) => {
          if (error) {
            reject(error)
            return
          }
          resolve(stdout.trim())
        })
      })
    }

    try {
      const branch = await this.getBranch(plugin)
      let cm = await execAsync("git log -10 --no-merges --pretty=\"%h||%cI||%s\"")
      const logAll = cm.split("\n")
      if (!logAll.length) return { logs: [] }
      let logs = []
      for (let str of logAll) {
        str = str.split("||")
        if (str[0] === this.oldCommitId) break
        if (str.length >= 3) {
          const diffStat = await execAsync(`git show --shortstat --format= ${str[0]}`)
          const fileChanges = diffStat.match(/(\d+) files? changed/)
          const lineAdditions = diffStat.match(/(\d+) insertions?\(\+\)/)
          const lineDeletions = diffStat.match(/(\d+) deletions?\(-\)/)
          logs.push({
            commitId: str[0],
            branch: branch || "HEAD",
            date: str[1],
            content: str.slice(2).join("||"),
            filesChanged: fileChanges ? parseInt(fileChanges[1]) : 0,
            linesAdded: lineAdditions ? parseInt(lineAdditions[1]) : 0,
            linesDeleted: lineDeletions ? parseInt(lineDeletions[1]) : 0
          })
        }
      }
      const end = await this.getRemoteUrl((await this.getRemoteBranch(false, plugin)).remote, true, plugin)
      let repoLink = "HanaHimeUnica/Mys-plugin"
      if (end) {
        if (end.includes("@")) {
          const match = end.match(/@([^:]+):(.+)\.git/)
          if (match && match[2]) {
            repoLink = match[2]
          }
        } else if (end.includes("//")) {
          const urlParts = end.split("/")
          if (urlParts.length >= 2) {
            const lastPart = urlParts[urlParts.length - 1].replace(".git", "")
            const secondLastPart = urlParts[urlParts.length - 2]
            repoLink = `${secondLastPart}/${lastPart}`
          }
        }
      }
      let log = JSON.stringify(logs, null, 2)
      return {
        plugin: plugin || "Yunzai",
        totalLogs: logs.length,
        log,
        remoteUrl: end || "",
        repoLink
      }
    } catch (error) {
      logger.error(error)
      return {
        error: error.message
      }
    }
  }

  async getBranch (...args) {
    const execAsync = (cmd) => {
      return new Promise((resolve, reject) => {
        exec(cmd, { cwd: `plugins/${args[0]}` }, (error, stdout, stderr) => {
          if (error) {
            reject(error)
            return
          }
          resolve(stdout.trim())
        })
      })
    }
    return await execAsync("git branch --show-current")
  }

  async getRemote (branch, ...args) {
    const execAsync = (cmd) => {
      return new Promise((resolve, reject) => {
        exec(cmd, { cwd: `plugins/${args[0]}` }, (error, stdout, stderr) => {
          if (error) {
            reject(error)
            return
          }
          resolve(stdout.trim())
        })
      })
    }
    return await execAsync(`git config branch.${branch}.remote`)
  }

  async getRemoteBranch (string, ...args) {
    try {
      const branch = await this.getBranch(...args)
      if (!branch && string) return ""
      const remote = await this.getRemote(branch, ...args)
      if (!remote && string) return ""
      return string ? `${remote}/${branch}` : { remote, branch }
    } catch (error) {
      logger.error(error)
      return string ? "" : { remote: "", branch: "" }
    }
  }

  async getRemoteUrl (branch, hide, ...args) {
    const execAsync = (cmd) => {
      return new Promise((resolve, reject) => {
        exec(cmd, { cwd: `plugins/${args[0]}` }, (error, stdout, stderr) => {
          if (error) {
            reject(error)
            return
          }
          resolve(stdout.trim())
        })
      })
    }
    if (branch) {
      const url = await execAsync(`git config remote.${branch}.url`)
      return hide ? url.replace(/\/\/([^@]+)@/, "//") : url
    }
    const ret = await execAsync("git config -l")
    const urls = {}
    const matches = ret.match(/remote\..*?\.url=.+/g) || []
    for (const i of matches) {
      const branch = i.replace(/remote\.(.*?)\.url=.+/g, "$1")
      const url = i.replace(/remote\..*?\.url=/g, "").trim()
      urls[branch] = hide ? url.replace(/\/\/([^@]+)@/, "//") : url
    }
    return urls
  }
}