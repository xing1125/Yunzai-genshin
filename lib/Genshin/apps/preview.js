import { Data } from "#fansky"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const EL_COLOR = {
  冰: "#7fd4ff",
  火: "#ff6b4a",
  雷: "#c98bff",
  水: "#4aa8ff",
  风: "#5fd6a0",
  岩: "#f0c050",
  草: "#8be36b"
}

// miao-plugin 角色元数据目录（取不到时静默跳过，不影响主流程）
const META_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../miao-plugin/resources/meta-gs/character")
const WEAPON_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../miao-plugin/resources/meta-gs/weapon")
let _wIdx = null
const W_TYPE = { sword: "单手剑", claymore: "双手剑", polearm: "长柄武器", catalyst: "法器", bow: "弓" }
const E_TYPE = { cryo: "冰", pyro: "火", electro: "雷", hydro: "水", anemo: "风", geo: "岩", dendro: "草" }

export class preview extends plugin {
  constructor () {
    super({
      name: "[Genshin/preview.js]原神版本前瞻总结",
      dsc: "版本前瞻总结卡片",
      event: "message",
      priority: -2000,
      rule: [
        { reg: "^#?(版本)?前瞻\\s*([\\d.]+)?$", fnc: "preview" },
        { reg: "^#?前瞻列表$", fnc: "list" }
      ]
    })
  }

  /** #前瞻 / #7.0前瞻 */
  async preview () {
    const m = /^#?(版本)?前瞻\s*([\d.]+)?$/.exec(this.e.msg)
    const ver = m && m[2]
    const data = this.loadData()
    const versions = (data && data.versions) || {}
    const keys = Object.keys(versions)
    if (!keys.length) {
      await this.e.reply("暂无前瞻数据，请先在 config/defSet/preview/versions.yaml 添加版本内容")
      return
    }
    const target = ver || data.current || keys[keys.length - 1]
    const v = versions[target]
    if (!v) {
      await this.e.reply(`未找到「${target}」的前瞻数据。可用版本：\n` + keys.map(k => `#${k}前瞻`).join("、"))
      return
    }
    const view = this.decorate(Object.assign({ version: target }, JSON.parse(JSON.stringify(v))))
    const img = await this.renderImg("genshin", "Genshin/html/preview/preview", view, { retType: "base64" })
    await this.reply([img])
  }

  /** #前瞻列表 */
  async list () {
    const data = this.loadData()
    const keys = Object.keys((data && data.versions) || {})
    if (!keys.length) return this.e.reply("暂无前瞻数据")
    await this.e.reply("可用版本前瞻：\n" + keys.map(k => `#${k}前瞻`).join("\n") + "\n（#前瞻 查看默认版本）")
  }

  /** 读 miao-plugin 角色元数据；角色不存在/插件缺失时返回 null */
  meta (name) {
    try {
      const f = path.join(META_DIR, name, "data.json")
      if (!fs.existsSync(f)) return null
      return JSON.parse(fs.readFileSync(f, "utf8"))
    } catch (e) {
      return null
    }
  }

  /** 武器图鉴索引：武器名 -> { cn, star }（汇总 miao-plugin 各类型目录，缺失时返回空对象） */
  weaponIdx () {
    if (_wIdx) return _wIdx
    const idx = {}
    try {
      for (const t of Object.keys(W_TYPE)) {
        const f = path.join(WEAPON_DIR, t, "data.json")
        if (!fs.existsSync(f)) continue
        const d = JSON.parse(fs.readFileSync(f, "utf8"))
        for (const w of Object.values(d)) idx[w.name] = { cn: W_TYPE[t], star: w.star }
      }
    } catch (e) { /* 图鉴缺失时静默降级 */ }
    _wIdx = idx
    return idx
  }

  /** 给元素/星级/标签附上展示用颜色与样式类；缺失的元素/武器类型先尝试从元数据补齐 */
  decorate (v) {
    const starColor = (r) => (r >= 5 ? "#ffcf5a" : "#c98bff")
    // 角色：缺 element / weapon 时从元数据补（真实角色有效，虚构角色 meta 返回 null 直接跳过）
    const fill = (x) => {
      const m = this.meta(x.name)
      if (!m) return x
      if (!x.element && E_TYPE[m.elem]) x.element = E_TYPE[m.elem]
      if (!x.weapon && W_TYPE[m.weapon]) x.weapon = W_TYPE[m.weapon]
      return x
    }
    // 武器：优先查武器图鉴（名字 -> 类型/星级），图鉴没有再按 note 的「XX专武」反查角色武器类型
    const fillW = (w) => {
      const hit = this.weaponIdx()[w.name]
      if (hit) {
        if (!w.type) w.type = hit.cn + "·限定"
        if (!w.rarity) w.rarity = hit.star
        return w
      }
      if (!w.type) {
        const mm = /^(.+?)专武/.exec(w.note || "")
        const m = mm ? this.meta(mm[1]) : null
        if (m && W_TYPE[m.weapon]) w.type = W_TYPE[m.weapon] + "·限定"
      }
      return w
    }
    const fix = (arr) => (arr || []).map(x => {
      const o = Object.assign({}, x, {
        elColor: EL_COLOR[x.element] || "#9fb3c8",
        starColor: starColor(x.rarity)
      })
      if (x.type === "新角色") o.tagClass = "new"
      else if (x.type === "复刻") o.tagClass = "re"
      else o.tagClass = ""
      return o
    })
    if (v.phases) v.phases.forEach(p => {
      if (p.characters) p.characters = fix((p.characters || []).map(fill))
      if (p.weapons) p.weapons = fix((p.weapons || []).map(fillW))
    })
    if (v.weapons) v.weapons = fix((v.weapons || []).map(fillW))
    if (v.artifacts) v.artifacts = (v.artifacts || []).map(x => Object.assign({}, x))
    return v
  }

  /** 读取前瞻数据：用户配置优先，其次 defSet */
  loadData () {
    let d = Data.readYAML("config/config/preview/versions.yaml")
    if (!d || !d.versions) d = Data.readYAML("config/defSet/preview/versions.yaml")
    return d || {}
  }
}
