/**  圣遗物部位  */
const POS = {
  EQUIP_BRACER: 1,
  EQUIP_NECKLACE: 2,
  EQUIP_SHOES: 3,
  EQUIP_RING: 4,
  EQUIP_DRESS: 5,
  生之花: 1,
  死之羽: 2,
  时之沙: 3,
  空之杯: 4,
  理之冠: 5
}

/** extraLevels */
const SKILL = { a: "1", e: "2", q: "9" }

/** 圣遗物词条 */
const ATTRS_KEYS = {
  def: "防御力",
  defPlus: "防御力",
  hpPlus: "生命值",
  hp: "生命值",
  atkPlus: "攻击力",
  atk: "攻击力",
  recharge: "元素充能效率",
  mastery: "元素精通",
  cpct: "暴击率",
  cdmg: "暴击伤害",
  heal: "治疗加成",
  pyro: "火",
  hydro: "水",
  cryo: "冰",
  electro: "雷",
  anemo: "风",
  geo: "岩",
  phy: "物理",
  dendro: "草"
}

/** 元素伤害 */
const DMG_KEYS = {
  fire_dmg: "pyro",
  water_dmg: "hydro",
  ice_dmg: "cryo",
  thunder_dmg: "electro",
  wind_dmg: "anemo",
  rock_dmg: "geo",
  physical_dmg: "phy",
  grass_dmg: "dendro"
}

/** 转换主角 */
const TRAVELERS = {
  anemo: "旅行者风",
  geo: "旅行者岩",
  electro: "旅行者雷",
  dendro: "旅行者草",
  hydro: "旅行者水",
  pyro: "旅行者火",
  cryo: "旅行者冰"
}

export { POS, SKILL, ATTRS_KEYS, DMG_KEYS, TRAVELERS }