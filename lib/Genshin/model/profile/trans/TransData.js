import _ from "lodash"
import { Character, Data } from "#fansky"
import { POS, SKILL } from "../metas/DmgMeta.js"
import { Meta } from "../../../../../../miao-plugin/components/index.js"

const { mainIdMap, attrMap, attrIdMap } = Meta.getMeta("gs", "arti")

export const TransData = {
  /**
     * 转换 Enka.Network 角色查询数据为内部格式
     * @returns {Object} 内部格式角色数据，用于本地缓存等
     * @param avatar
     */
  async fromEnka (avatar) {
    let {
      avatarId, talentIdList, fetterInfo, propMap,
      fightPropMap, proudSkillExtraLevelMap, skillLevelMap, equipList
    } = avatar

    let { id, name, elem, star, talentId } = Character.get(avatarId).meta
    const profile = {
      id,
      name,
      elem,
      cons: talentIdList ? talentIdList.length : 0,
      star,
      fetter: fetterInfo.expLevel,
      level: propMap["4001"].val * 1,
      promote: propMap["1002"].val * 1,
      attr: {
        hp: fightPropMap["2000"],
        atk: fightPropMap["2001"],
        def: fightPropMap["2002"],
        cpct: fightPropMap["20"] * 100,
        cdmg: fightPropMap["22"] * 100,
        heal: fightPropMap["26"] * 100,
        mastery: fightPropMap["28"],
        recharge: fightPropMap["23"] * 100,
        phy: fightPropMap["30"] * 100
      }
    }
    profile.base = Data.getData(fightPropMap, "hp:1,atk:4,def:7")
    let keys = ["40", "41", "42", "43", "44", "45", "46"]
    profile.attr.dmg = keys.map(i => fightPropMap[i]).find(v => v > 0) * 100 || 0

    let talent = { a: {}, e: {}, q: {} }
    const extraLevels = Object.fromEntries(
      Object.entries(proudSkillExtraLevelMap || {}).map(([k, v]) => [k.slice(-1), v])
    )
    _.each(talentId, (key, id) => {
      talent[key].original = skillLevelMap[id]
      talent[key].level = skillLevelMap[id] + (extraLevels[SKILL[key]] || 0)
    })
    profile.talent = talent

    profile.weapon = await this.getWeapon(equipList)

    let artis = this.getArtifact(equipList)
    profile.artisDetail = {
      artis,
      sets: _.pickBy(_.countBy(artis, i => i.set), i => i >= 2)
    }
    return profile
  },

  getWeapon (equipList) {
    let ds = _.find(equipList, (v) => v.flat && v.flat.itemType === "ITEM_WEAPON")
    if (!ds) return {}

    let { itemId, weapon } = ds
    let weaponData = Meta.getData("gs", "weapon", itemId)
    return {
      ...weaponData,
      affix: (_.values(weapon.affixMap)[0] || 0) + 1,
      level: weapon.level,
      promote: weapon.promoteLevel,
      img: `meta-gs/weapon/${weaponData.type}/${weaponData.name}/icon.webp`
    }
  },

  getArtifact (equipList) {
    let ret = {}
    _.forEach(equipList, (ds) => {
      let { itemId, flat = {}, reliquary = {} } = ds
      let idx = POS[flat.equipType]
      if (!idx) return
      let { set, name } = this.getArtiSet(itemId.toString())
      const attrs = reliquary.appendPropIdList.reduce((acc, id) => {
        const cfg = attrIdMap[id]
        if (!cfg) return acc
        const { key, value } = cfg
        if (!acc[key]) {
          acc[key] = { key, value: 0 }
        }
        acc[key].value += value * (attrMap[key].format === "pct" ? 100 : 1)
        return acc
      }, {})
      ret[idx] = {
        name,
        level: (reliquary.level * 1) - 1,
        set,
        main: {
          key: mainIdMap[reliquary.mainPropId],
          value: vStr(mainIdMap[reliquary.mainPropId], flat.reliquaryMainstat.statValue)
        },
        attrs: _.forEach(attrs, (t) => t.value = vStr(t.key, t.value))
      }
    })
    return ret
  },

  getArtiSet (itemId = "") {
    let id = Meta.getId("gs", "artiSet", itemId.slice(0, 2))
    let set = Meta.getData("gs", "artiSet", id)
    return {
      set: set.name,
      name: set.idxs[[4, 2, 5, 1, 3][itemId[3] - 1]]
    }
  }
}

/** 转换词条数值为字符串形式 */
function vStr (key, value) {
  return /(.*)Plus|mastery/.test(key)
    ? String(_.round(value, 1)) : String(Math.round(value * 10) / 10) + "%"
}
