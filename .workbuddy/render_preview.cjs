const path = require("path")
const fs = require("fs")
const template = require("D:/yunzai-yingbot/Yunzai/app/node_modules/.ignored/art-template")

const RES = "D:/yunzai-yingbot/Yunzai/app/plugins/genshin/resources/Bh3"
const gameResPath = "../../"

// 本地真实素材（resources/Bh3/img 下已有）
const WEAPON_IMG = "../../img/other/weapon-1.png"
const STIG_IMG = "../../img/other/weapon-2.png"

function char (name, star, attr, level, avatarFile, weapon, stigs, extra) {
  extra = extra || {}
  return {
    character: {
      avatar: {
        id: extra.avatarId,
        star,
        attribute_id: attr,
        sec_part_icon: `../../img/ledger/${avatarFile}`,
        icon_path: `../../img/ledger/${avatarFile}`,
        name,
        level,
        element_name: extra.element_name || "",
        intro: extra.avatarIntro || ""
      },
      weapon: weapon
        ? {
            id: extra.weaponId,
            name: weapon,
            icon: WEAPON_IMG,
            level: 80,
            rarity: star >= 6 ? 6 : 5,
            max_rarity: 6,
            homology_level: star >= 5 ? 3 : 2,
            type_name: extra.weaponType || "武器",
            intro: extra.weaponIntro || ""
          }
        : null,
      stigmatas: stigs.map((n, i) => ({
        id: extra.stigIds ? extra.stigIds[i] : undefined,
        name: n,
        icon: STIG_IMG,
        level: 50,
        type_name: ["上", "中", "下"][i],
        intro: extra.stigIntros ? extra.stigIntros[i] : ""
      }))
    }
  }
}

const characters = [
  char("识之律者", 5, 4, 80, "Coralie.png", "终焉之杖·识", ["无量塔姬子·上", "无量塔姬子·中", "无量塔姬子·下"], {
    avatarId: 1001, element_name: "量子", avatarIntro: "量子之力的化身，以理之律者的姿态降临战场，擅长高频连击与时空断裂。",
    weaponId: 2001, weaponType: "镰刀", weaponIntro: "终焉系列武器，满共鸣后大幅提升全队量子伤害。",
    stigIds: [3001, 3002, 3003], stigIntros: ["姬子套装·上：生命值提升。", "姬子套装·中：物理伤害提升。", "姬子套装·下：攻击速度提升。"]
  }),
  char("爱莉希雅", 5, 5, 80, "Helia.png", "无存之钥·爱", ["爱莉希雅·上", "爱莉希雅·中", "爱莉希雅·下"], {
    avatarId: 1002, element_name: "虚无", weaponType: "弩",
    stigIds: [3101, 3102, 3103]
  }),
  char("终焉之律者", 6, 6, 90, "Senadina.png", "终焉之杖·终", ["终焉·上", "终焉·中", "终焉·下"], {
    avatarId: 1003, element_name: "支配", weaponType: "炮", stigIds: [3201, 3202, 3203]
  }),
  char("琪亚娜·抢修", 4, 1, 70, "bujika.png", null, [], { avatarId: 1004, element_name: "机械" })
]

// 模拟模型 flattenBh3Lists：展平武器/圣痕列表（按 id 去重 + 装备角色名）
const weapons = []
const stigmatas = []
const seenW = new Set(); const seenS = new Set()
for (const c of characters) {
  const ch = c.character
  const cn = ch.avatar.name
  const wp = ch.weapon
  if (wp && wp.name) {
    const k = wp.id != null ? "w" + wp.id : "wn_" + wp.name
    if (!seenW.has(k)) { seenW.add(k); weapons.push({ ...wp, charName: cn }) }
  }
  for (const s of ch.stigmatas) {
    if (s.name && s.name !== "") {
      const k = s.id != null ? "s" + s.id : "sn_" + s.name
      if (!seenS.has(k)) { seenS.add(k); stigmatas.push({ ...s, charName: cn }) }
    }
  }
}

// 注意：模板内用 {{data.characters}} / {{uid}} / {{gameResPath}} / {{layoutcopyright}}
// 即真实游戏数据被包在 .data 子键下，顶层还有 uid 等字段
const data = {
  data: { characters, weapons, stigmatas },
  uid: "100000000",
  layoutcopyright: "崩坏3 面板预览 · 本地素材 resources/Bh3/img",
  gameResPath
}

const inject = `<script>window.whenError=function(e){e.style.visibility='hidden';};</script>`

const types = ["stigmata", "roleIndex", "roleList", "weapon"]
for (const t of types) {
  const tpl = fs.readFileSync(path.join(RES, "html", t, `${t}.html`), "utf-8")
  let html = template.render(tpl, data)
  html = html.replace("</body>", `${inject}</body>`)
  fs.writeFileSync(path.join(RES, "html", t, "preview.html"), html)
  console.log(t, "len", html.length)
}
console.log("DONE")
