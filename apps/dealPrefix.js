import { gsCfg } from "#index"

const getGameReg = (game) => {
  const prefix = gsCfg.getGamePrefix(game)
  if (!prefix) return null
  const prefixes = prefix.split("|").map(p => p.trim()).filter(p => p)
  if (prefixes.length === 0) return null
  const escapedPrefixes = prefixes.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  return new RegExp(`^#?\\s*(${escapedPrefixes.join("|")})+`)
}

const gsReg = getGameReg("gs")
const srReg = getGameReg("sr")
const zzzReg = getGameReg("zzz")
const wdReg = getGameReg("wd")
const bh3Reg = getGameReg("bh3")
const bh2Reg = getGameReg("bh2")

export class DealPrefix extends plugin {
  constructor () {
    super({
      event: "message",
      priority: -Infinity
    })
  }

  accept (e) {
    try {
      const bypassPatterns = [
        /^\s*#*\s*(米游社|原神|genshin)(插件)?(强制)?更新\s*$/i,
        /^\s*#\s*(米游社|原神|genshin)(版本|更新日志)\s*$/i,
        /^\s*#*\s*(官方|米游社|原神|崩坏三|崩三|绝区零|星铁|未定|星布谷地)?\s*(公告|资讯|活动|搜索|推送)/i,
        /^\s*#*\s*(原神)注册时间\s*$/i,
        /^\s*#*\s*(原神)(开启|关闭)(到期活动|活动到期)(预警)?(推送)?$/i
      ]
      for (const bp of bypassPatterns) {
        if (bp.test(e.msg)) return
      }
    } catch (err) {
    }
    const gameMappings = [
      { reg: gsReg, game: "gs", replace: "#" },
      { reg: srReg, game: "sr", replace: "#星铁" },
      { reg: zzzReg, game: "zzz", replace: "#绝区零" },
      { reg: wdReg, game: "wd", replace: "#未定" },
      { reg: bh3Reg, game: "bh3", replace: "#崩三" },
      { reg: bh2Reg, game: "bh2", replace: "#崩二" }
    ]

    for (const mapping of gameMappings) {
      if (mapping.reg && mapping.reg.test(e.msg)) {
        e.game = mapping.game
        e.msg = e.msg.replace(mapping.reg, mapping.replace)
        break
      }
    }
    return
  }
}
