import { base, MysInfo, gsCfg } from "#index"

const pad2 = val => String(val ?? 0).padStart(2, "0")

const formatDateTime = (time) => {
  if (!time) return ""
  return `${time.year}.${pad2(time.month)}.${pad2(time.day)} ${pad2(time.hour)}:${pad2(time.minute)}`
}

const processNode = (node, idx) => {
  if (!node || !node.challenge_time) {
    return { ...node, challenge_time_str: "", score: 0, boss_defeated: false, hasData: false }
  }
  return {
    ...node,
    challenge_time_str: formatDateTime(node.challenge_time),
    score: Number(node.score || 0),
    boss_defeated: !!node.boss_defeated,
    hasData: true
  }
}

const hasTierceRecord = floor => !!(floor?.node_3?.hasData || Number(floor?.star_num || 0) >= 4)

const markTierceRecords = floors => {
  for (const floor of floors || []) {
    floor.hasTierceRecord = hasTierceRecord(floor)
  }
  return !!(floors || []).some(floor => floor.hasTierceRecord)
}

const normalizeTournInfo = info => {
  if (!info) return info
  const difficulty = Number(info.difficulty ?? info.level ?? 0)
  const rawArea = Number(info.id || String(info.area_id || "").slice(-1) || 0)
  const area = Math.min(Math.max(rawArea, 0), 5)
  const isExtraStage = rawArea > 5
  info.area_id = String(area)
  info.difficulty = difficulty
  info.is_extra_stage = isExtraStage
  info.floor_icon = isExtraStage && difficulty > 0 ? "x" : difficulty > 0 ? "5-t" : String(area)
  return info
}

const magicLevelNames = {
  1: "至第一位面",
  2: "至第二位面",
  3: "至第三位面",
  4: "至第四位面"
}

const formatMagicText = text => {
  if (!text) return ""
  return String(text)
    .replace(/<color=([^>]+)>([^<]+)<\/color>/g, "<span style=\"color: $1\">$2</span>")
    .replace(/<\/?u>/g, "")
}

const normalizeMagicRecord = record => {
  const hasData = !!(record?.avatar_list?.length || record?.schedule_total_floor_num)
  if (!record) return { hasData: false }
  const magicList = (record.magic_list || []).map(magic => ({
    ...magic,
    magic_uint_simple_desc: formatMagicText(magic.magic_uint_simple_desc),
    trigger_desc: formatMagicText(magic.trigger_desc),
    magic_unit_list: (magic.magic_unit_list || []).map(unit => ({
      ...unit,
      simple_desc: formatMagicText(unit.simple_desc)
    }))
  }))
  return {
    ...record,
    hasData,
    completed_time_str: formatDateTime(record.completed_time),
    level_name: magicLevelNames[Number(record.level)] || "暂无数据",
    pass_text: hasData ? `${magicLevelNames[Number(record.level)] || "至未知位面"}：${record.schedule_current_floor_num || 0}/${record.schedule_total_floor_num || 0}` : "暂无数据",
    tendency_name: record.calculation_tendency?.name || "暂无",
    avatar_list: record.avatar_list || [],
    magic_list: magicList,
    miracle_list: record.miracle_list || []
  }
}

const makeMagicSection = (title, type, records = []) => ({
  title,
  type,
  records: records.map(normalizeMagicRecord).filter(record => record.hasData)
})

export default class srAbyss extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "sr_index")
  }

  /** 异相仲裁数据 */
  async peak () {
    let scheduleType = "1"
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) scheduleType = "3"
    let res = await MysInfo.get(this.e, "challenge_peak", { schedule_type: scheduleType })
    if (res?.retcode !== 0) return false
    if (!res.data?.challenge_peak_records?.length) {
      this.e.reply(`UID:${this.e.uid},暂无异相仲裁挑战数据`)
      return false
    }
    const record = (this.e.msg.includes("上期") || this.e.msg.includes("往期")) ? res.data.challenge_peak_records[1] : res.data.challenge_peak_records[0]
    if (!record.has_challenge_record) {
      this.e.reply(`UID:${this.e.uid},暂无异相仲裁挑战数据`)
      return false
    }
    if (record) {
      if (!record.boss_record) {
        record.boss_record = {
          has_challenge_record: false,
          avatars: [],
          buff: null
        }
      }
      if (!record.mob_records) {
        record.mob_records = []
      }
      if (!record.mob_infos) {
        record.mob_infos = []
      }
      if (!record.group) {
        record.group = {
          name_mi18n: "未知主题",
          game_version: "未知",
          theme_pic_path: "",
          begin_time: { year: 0, month: 0, day: 0 },
          end_time: { year: 0, month: 0, day: 0 }
        }
      }
    }
    const formatTime = (time) => {
      if (!time) return ""
      return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`
    }
    const beginTime = record?.group?.begin_time ? formatTime(record.group.begin_time) : ""
    const endTime = record?.group?.end_time ? formatTime(record.group.end_time) : ""
    return {
      ...this.screenData,
      data: {
        ...res.data,
        peak_records: record,
        beginTime,
        endTime
      }
    }
  }

  /** 虚构叙事数据 */
  async story () {
    let scheduleType = "1"
    let time = "0"
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) {
      scheduleType = "2"
      time = "1"
    }
    let res = await MysInfo.get(this.e, "challenge_story", { schedule_type: scheduleType, time })
    if (res?.retcode !== 0) return false
    if (!res.data?.has_data) {
      if (!this.e.silentAbyss) this.e.reply(`UID:${this.e.uid},暂无虚构叙事挑战数据`)
      return false
    }
    for (let i of res.data.all_floor_detail) {
      i.node_1 = processNode(i.node_1, 1)
      i.node_2 = processNode(i.node_2, 2)
      i.node_3 = i.node_3 ? processNode(i.node_3, 3) : null
      let s = i.node_1.score + i.node_2.score
      if (i.node_3) s += i.node_3.score
      i.allscore = s
      i.hasData = !!(i.node_1.hasData || i.node_2.hasData || i.node_3?.hasData)
    }

    const grp = res.data.groups?.[time] || {}
    if (grp?.begin_time) grp.begin_time_str = formatDateTime(grp.begin_time)
    if (grp?.end_time) grp.end_time_str = formatDateTime(grp.end_time)
    res.data.hasTierce = !!(grp?.tierce_boss || res.data.all_floor_detail?.some(floor => floor.is_tierce || floor.node_3))
    res.data.hasTierceRecord = markTierceRecords(res.data.all_floor_detail)
    res.data.group = grp
    return {
      ...this.screenData,
      list: res.data,
      time
    }
  }

  /** 忘却之庭数据 */
  async abyss () {
    let scheduleType = "1"
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) scheduleType = "2"
    let res = await MysInfo.get(this.e, "challenge_chaos", { schedule_type: scheduleType })
    if (res?.retcode !== 0) return false
    if (!res.data?.has_data) {
      if (!this.e.silentAbyss) this.e.reply(`UID:${this.e.uid},暂无忘却之庭挑战数据`)
      return false
    }
    for (let i of res.data.all_floor_detail) {
      i.node_1 = processNode(i.node_1, 1)
      i.node_2 = processNode(i.node_2, 2)
      i.node_3 = i.node_3 ? processNode(i.node_3, 3) : null
      i.allscore = i.node_1.score + i.node_2.score
      if (i.node_3) i.allscore += i.node_3.score
      i.hasData = !!(i.node_1.hasData || i.node_2.hasData || i.node_3?.hasData)
    }
    if (res.data.begin_time) res.data.begin_time_str = formatDateTime(res.data.begin_time)
    if (res.data.end_time) res.data.end_time_str = formatDateTime(res.data.end_time)
    res.data.hasTierce = !!(res.data.all_floor_detail?.some(floor => floor.is_tierce || floor.node_3?.hasData))
    res.data.hasTierceRecord = markTierceRecords(res.data.all_floor_detail)
    return {
      ...this.screenData,
      list: res.data
    }
  }

  /** 末日幻影数据 */
  async boss () {
    let scheduleType = "1"
    let time = "0"
    if (this.e.msg.includes("上期") || this.e.msg.includes("往期")) {
      scheduleType = "2"
      time = "1"
    }
    let res = await MysInfo.get(this.e, "challenge_boss", { schedule_type: scheduleType, time })
    if (res?.retcode !== 0) return false
    if (!res.data?.has_data) {
      if (!this.e.silentAbyss) this.e.reply(`UID:${this.e.uid},暂无末日幻影挑战数据`)
      return false
    }
    for (let i of res.data.all_floor_detail) {
      i.node_1 = processNode(i.node_1, 1)
      i.node_2 = processNode(i.node_2, 2)
      i.node_3 = i.node_3 ? processNode(i.node_3, 3) : null
      let s = i.node_1.score + i.node_2.score
      if (i.node_3) s += i.node_3.score
      i.allscore = s
      i.hasData = !!(i.node_1.hasData || i.node_2.hasData || i.node_3?.hasData)
    }

    const grp = res.data.groups[time]
    if (grp?.begin_time) grp.begin_time_str = formatDateTime(grp.begin_time)
    if (grp?.end_time) grp.end_time_str = formatDateTime(grp.end_time)
    res.data.hasTierce = !!(grp?.tierce_boss)
    res.data.hasTierceRecord = markTierceRecords(res.data.all_floor_detail)
    return {
      ...this.screenData,
      list: res.data,
      time
    }
  }

  /** 模拟宇宙数据 */
  async rogue () {
    let thisMonth = !(this.e.msg.includes("上期") || this.e.msg.includes("往期"))
    let res = await MysInfo.get(this.e, "rogue")
    if (res?.retcode !== 0) return false
    if (!res.data?.[`${thisMonth ? "current" : "last"}_record`]?.has_data) {
      this.e.reply(`UID:${this.e.uid},暂无模拟宇宙挑战数据`)
      return false
    }
    let line = [
      [
        { lable: "技能树", num: res.data.basic_info.unlocked_skill_points, extra: this.lable.unlocked_skill },
        { lable: "解锁奇物", num: res.data.basic_info.unlocked_miracle_num, extra: this.lable.unlocked_miracle },
        { lable: "解锁祝福", num: res.data.basic_info.unlocked_buff_num, extra: this.lable.unlocked_buff },
        { lable: "通关次数", num: res.data.current_record.basic.finish_cnt }
      ]
    ]
    return {
      ...this.screenData,
      line,
      role: res.data.role,
      records: res.data[`${thisMonth ? "current" : "last"}_record`].records
    }
  }

  /** 寰宇蝗灾数据 */
  async rogue_locust () {
    let res = await MysInfo.get(this.e, "rogue_locust")
    if (!res || res.retcode !== 0) return false
    if (!res.data?.detail?.records?.length) {
      await this.e.reply(`UID:${this.e.uid}，暂无寰宇蝗灾挑战数据。\n或近三个月内无通关记录`)
      return false
    }
    res.data.detail.records.forEach(record => {
      record.worm_weak = (record.worm_weak || []).map(weak => {
        return weak.replace(/<color=([^>]+)>([^<]+)<\/color>/g, "<span style=\"color: $1\">$2</span>")
      })
    })
    return {
      ...this.screenData,
      ...res.data,
      isnous: false,
      roman: gsCfg.roman,
      lable: this.lable,
      bg: ["bg", "bg_fanyu"]
    }
  }

  /** 黄金与机械 */
  async rogue_nous () {
    let res = await MysInfo.get(this.e, "rogue_nous")
    if (!res || res.retcode !== 0) return false
    if (!res.data?.detail?.records?.length) {
      await this.e.reply(`UID:${this.e.uid}，暂无黄金与机械挑战数据。\n或近三个月内无通关记录`)
      return false
    }
    res.data.detail.records.forEach(record => {
      record.worm_weak = record.boss_effect.map(weak => {
        return weak.replace(/<color=([^>]+)>([^<]+)<\/color>/g, "<span style=\"color: $1\">$2</span>")
      })
    })
    return {
      ...this.screenData,
      ...res.data,
      isnous: true,
      roman: gsCfg.roman,
      lable: this.lable,
      bg: ["nous_bg", "nous"]
    }
  }

  /** 不可知域数据 */
  async rogue_magic () {
    let res = await MysInfo.get(this.e, "rogue_magic")
    if (!res || res.retcode !== 0) return false
    if (!res.data?.basic_info) {
      await this.e.reply(`UID:${this.e.uid}，暂无不可知域挑战数据。\n或近三个月内无通关记录`)
      return false
    }
    const basic = res.data.basic_info
    let line = [
      { lable: "思维边界", num: basic.linear_tree_num },
      { lable: "仿真记录", num: basic.magic_compendium },
      { lable: "开拓秘闻", num: basic.discover_secrets },
      { lable: "重整模型", num: basic.challenge_task_current_num, extra: basic.challenge_task_total_num }
    ]
    const sections = [
      makeMagicSection("分形档案", "normal", res.data.normal_record_list || []),
      makeMagicSection("庸众集", "custom", res.data.custom_record_list || [])
    ]
    const bestRecord = normalizeMagicRecord(basic.magic_record)
    return {
      ...this.screenData,
      role: res.data.role,
      line,
      roman: gsCfg.roman,
      list: res.data,
      bestRecord,
      magicSections: sections.filter(section => section.records.length > 0)
    }
  }

  /** 差分宇宙数据 */
  async rogue_tourn () {
    const thisMonth = !(/(往|上)(周|期)/g.test(this.e.msg))
    const types = this.e.msg.includes("常规")
      ? ["normal"]
      : this.e.msg.includes("周期")
        ? [(thisMonth ? "cur" : "last") + "_week"]
        : ["normal", (thisMonth ? "cur" : "last") + "_week"]
    const res = await MysInfo.get(this.e, "rogue_tourn")
    if (res?.retcode !== 0) return false
    const { data = {} } = res
    if (
      !data[types[0] + "_detail"]?.records?.length &&
      !data[types[1] + "_detail"]?.records?.length
    ) {
      this.e.reply(`UID:${this.e.uid},暂无差分宇宙挑战数据。`)
      return false
    }
    const tourn = {}
    types.forEach(type => {
      if (data[type + "_detail"]?.records?.length > 0) {
        tourn[type.replace(/^(cur|last)_/, "")] = {
          ...data[type + "_detail"],
          records: this.records(data[type + "_detail"].records)
        }
      }
    })
    for (let i of ["normal_record_brief", "weekly_record_brief"]) {
      normalizeTournInfo(data.basic[i]?.common_info_v2)
    }
    return {
      ...this.screenData,
      ...data,
      ...tourn,
      lable: this.lable,
      roman: gsCfg.roman,
      line: [
        { lable: "灵感回路", num: data.basic.skill_tree_activated, extra: this.lable.skill_tree },
        { lable: "可能性画廊", num: data.basic.possibility_gallery_finished, extra: data.basic.possibility_gallery_total },
        { lable: "稳态数组", num: data.basic.season_task_finished, extra: data.basic.season_task_total }
      ]
    }
  }

  /** 货币战争数据 */
  async grid () {
    let res = await MysInfo.get(this.e, "grid_fight")
    if (!res || res.retcode !== 0) return false
    if (!res.data?.grid_fight_archive_list?.length) {
      await this.e.reply(`UID:${this.e.uid}，暂无货币战争挑战数据。`)
      return false
    }
    const levelMap = {
      1: "A0",
      2: "A1",
      3: "A2",
      4: "A3",
      5: "A4",
      6: "A5",
      7: "A6",
      8: "A7",
      9: "A8"
    }
    let stat = res.data.grid_fight_brief
    let line = [
      { lable: "数据银行", num: stat.handbook_progress + "%" },
      { lable: "羁绊链路", num: stat.trait_progress + "%" },
      { lable: "预期收益", num: stat.quest_cur, extra: stat.quest_max }
    ]
    const archiveList = res.data.grid_fight_archive_list || []
    archiveList.forEach(archive => {
      let damageData = []
      if (archive?.lineup?.damage_list && archive.lineup.damage_list.length > 0) {
        const allRoles = [
          ...(archive.lineup.front_roles || []),
          ...(archive.lineup.back_roles || [])
        ]
        const roleMap = new Map()
        allRoles.forEach(role => {
          roleMap.set(role.role_id, role)
          roleMap.set(role.avatar_id, role)
        })
        const traitMap = new Map()
        if (archive.lineup.trait_list) {
          archive.lineup.trait_list.forEach(trait => {
            traitMap.set(trait.trait_id, trait)
          })
        }
        damageData = archive.lineup.damage_list
          .map(item => {
            const damage = parseFloat(item.damage)
            if (item.damage_type === "DamageTypeRole") {
              const role = roleMap.get(item.id)
              if (role) {
                return {
                  type: "role",
                  id: item.id,
                  name: role.name,
                  icon: role.icon,
                  damage,
                  rarity: role.rarity,
                  star: role.star
                }
              }
            } else if (item.damage_type === "DamageTypeTrait") {
              const trait = traitMap.get(item.id)
              if (trait) {
                return {
                  type: "trait",
                  id: item.id,
                  name: trait.trait_name,
                  icon: trait.icon,
                  damage,
                  quality: trait.quality,
                  trait_count: trait.trait_count
                }
              }
            }
            return null
          })
          .filter(item => item !== null)
          .sort((a, b) => b.damage - a.damage)
        const totalDamage = damageData.reduce((sum, item) => sum + item.damage, 0)
        damageData = damageData.map((item, index) => {
          const formattedDamage = item.damage >= 10000
            ? (item.damage / 10000).toFixed(1) + "万"
            : item.damage.toFixed(0)
          const percent = totalDamage > 0
            ? ((item.damage / totalDamage) * 100).toFixed(2)
            : "0.00"
          return {
            ...item,
            formattedDamage,
            percent,
            rank: String(index + 1)
          }
        })
      }
      archive.damageData = damageData
    })
    const PAGE_SIZE = 1
    const archivePages = []
    for (let i = 0; i < archiveList.length; i += PAGE_SIZE) {
      archivePages.push(archiveList.slice(i, i + PAGE_SIZE))
    }
    return archivePages.map((archives, index) => {
      return {
        ...this.screenData,
        data: res.data,
        levelMap,
        lable: this.lable,
        line,
        uid: this.e.uid,
        showHeader: index === 0,
        archives
      }
    })
  }

  records (records) {
    const pad2 = val => String(val ?? 0).padStart(2, "0")
    return records.map(record => {
      if (record.boss_effect) {
        record.worm_weak = record.boss_effect.map(weak => {
          return weak.replace(/<color=([^>]+)>([^<]+)<\/color>/g, "<span style=\"color: $1\">$2</span>")
        })
      }
      if (record.common_info) {
        record.common_info.area_id = String(record.common_info.area_id).slice(-1)
      }
      normalizeTournInfo(record.common_info_v2)
      record.is_rank_mode = record.rank_mode === "rankModeRank"
      record.rank_mode_name = record.is_rank_mode ? "拓星模式" : ""
      record.has_hex_miracles = (record.hex_miracles?.length || 0) > 0
      if (record.finish_time) {
        record.finish_time.month = pad2(record.finish_time.month)
        record.finish_time.day = pad2(record.finish_time.day)
        record.finish_time.hour = pad2(record.finish_time.hour)
        record.finish_time.minute = pad2(record.finish_time.minute)
        record.finish_time.second = pad2(record.finish_time.second)
      }
      if (record.persona_style?.desc) {
        record.persona_style.desc = record.persona_style.desc.replace(/<color=([^>]+)>([^<]+)<\/color>/g, "<span style=\"color: $1\">$2</span>")
      }
      return record
    }).slice(0, 3)
  }
}
