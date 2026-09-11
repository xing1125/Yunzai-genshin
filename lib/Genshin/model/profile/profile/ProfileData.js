import lodash from "lodash"
import { Format } from "../../../../../../miao-plugin/components/index.js"
import { ATTRS_KEYS, DMG_KEYS, TRAVELERS } from "../metas/DmgMeta.js"

let ProfileData = {
  async covRoleData (profile, imgs = {}) {
    let { id, name, elem, cons, level, weapon, talent, attr, artisDetail } = profile

    if (weapon.name === "最初的大魔术") {
      weapon.img = weapon.img.replace(/icon/g, "awaken")
    }
    let roleData = {
      id,
      name,
      face: imgs.face || "",
      elem,
      cons,
      level,
      weapon,
      fightProp: {
        暴击率: attr.cpct,
        暴击伤害: attr.cdmg,
        生命值: attr.hp,
        攻击力: attr.atk,
        防御力: attr.def,
        元素精通: attr.mastery,
        治疗加成: attr.heal,
        元素充能效率: attr.recharge
      }
    }
    roleData.talent = lodash.forEach(talent, (value, key) => value.img = imgs[key] || "")
    roleData.artisDetail = artisDetail || profile.getArtisMark()
    return roleData
  },

  async covTeyvatData (profile) {
    let { name, base, attr, cons, level, weapon, talent, elem, artisDetail } = profile

    name = [10000005, 10000007].includes(profile.id) ? TRAVELERS[elem] : name
    let temp = {}
    lodash.forEach(["hp", "def", "atk", "mastery"], (key) => {
      let fn = (n) => Format.comma(n, key === "hp" ? 0 : 1)
      temp[key] = fn(attr[key])
      temp[`${key}Base`] = fn(base[key])
      temp[`${key}Plus`] = fn(attr[key] - base[key])
    })
    lodash.forEach(["cpct", "cdmg", "recharge", "dmg"], (key) => {
      let fn = Format.pct
      let key2 = key
      if (key === "dmg" && attr.phy > attr.dmg) {
        key2 = "phy"
      }
      temp[key] = fn(attr[key2])
      temp[`${key}Base`] = fn(base[key2])
      temp[`${key}Plus`] = fn(attr[key2] - base[key2])
    })
    let { hp, hpBase, atk, atkBase, def, defBase, mastery, cpct, cdmg, recharge } = temp
    let covProfileData = {
      role: name,
      role_class: cons,
      level,
      weapon: weapon.name,
      weapon_level: weapon.level,
      weapon_class: `精炼${weapon.affix}阶`,
      hp: Format.int(hp?.replace(/,/g, "") ?? ""),
      base_hp: Format.int(hpBase?.replace(/,/g, "") ?? ""),
      attack: Format.int(atk?.replace(/,/g, "") ?? ""),
      base_attack: Format.int(atkBase?.replace(/,/g, "") ?? ""),
      defend: Format.int(def?.replace(/,/g, "") ?? ""),
      base_defend: Format.int(defBase?.replace(/,/g, "") ?? ""),
      element: Format.int(mastery?.replace(/,/g, "") ?? ""),
      crit: cpct,
      crit_dmg: cdmg,
      heal: Format.pct(attr.heal),
      recharge
    }
    for (const key in DMG_KEYS) {
      covProfileData[key] = elem === DMG_KEYS[key] ? Format.pct(attr.dmg) : Format.pct(0)
    }
    covProfileData.physical_dmg = Format.pct(attr.phy)
    covProfileData.ability1 = talent.a.level
    covProfileData.ability2 = talent.e.level
    covProfileData.ability3 = talent.q.level

    artisDetail = artisDetail || profile.getArtisMark()
    let artifacts = ""
    for (const key in artisDetail.sets) {
      artifacts = artifacts === "" ? key + artisDetail.sets[key] : artifacts + "+" + key + artisDetail.sets[key]
    }
    covProfileData.artifacts = artifacts

    let artifactsTypes = ["生之花", "死之羽", "时之沙", "空之杯", "理之冠"]
    covProfileData.artifacts_detail = lodash.map(artisDetail.artis, (arti, idx) => {
      let detail = {}
      detail.artifacts_name = arti.name
      detail.artifacts_type = artifactsTypes[idx - 1]

      detail.level = arti.level
      detail.maintips = ATTRS_KEYS[arti.main.key]
      detail.mainvalue = arti?.main?.value?.replace(/,/g, "") ?? ""

      lodash.forEach(arti.attrs, (attr, i) => {
        let key = attr.key
        let value = attr?.value?.replace(/,/g, "") ?? ""
        detail[`tips${i + 1}`] = ATTRS_KEYS[key] + "+" + value
      })
      return detail
    })
    return covProfileData
  }
}

export default ProfileData
