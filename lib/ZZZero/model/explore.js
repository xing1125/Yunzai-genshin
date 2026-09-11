import _ from "lodash"
import moment from "moment"
import { MysInfo, gsCfg, base } from "#index"
import { saveGameData } from "../../../model/gameData.js"

export default class explore extends base {
  constructor (e) {
    super(e)
    this.lable = gsCfg.getdefSet("index", "zzz_index")
    this.rarityMap = { S: 5, A: 4, B: 3 }
  }

  async getIndex () {
    let ApiData = {
      index: "",
      basicInfo: "",
      explore: ""
    }
    let res = await MysInfo.get(this.e, ApiData)
    if (!res || res[0].retcode !== 0 || res[1].retcode !== 0) return false
    return {
      ...this.screenData,
      ...await this.dealData(res[0].data, res[1].data, res[2]?.data)
    }
  }

  async dealData (data, basicInfo, exploreData) {
    let resIndex = data
    const nickname = basicInfo?.nickname || ""
    saveGameData("zzz", this.e.uid || basicInfo?.game_uid || basicInfo?.uid, {
      avatar: basicInfo?.avatar || resIndex?.cur_head_icon_url || "",
      name: nickname,
      level: basicInfo?.level ?? 0
    })
    /** 数据总览 */
    let stats = resIndex.stats || {}
    let coinsTotal = 0
    if (Array.isArray(stats.commemorative_coins_list)) {
      coinsTotal = stats.commemorative_coins_list.reduce((sum, c) => sum + (Number(c?.num) || 0), 0)
    }
    let commemorativeCoins = []
    if (stats.commemorative_coins_list) {
      commemorativeCoins = stats.commemorative_coins_list.map(coin => ({
        name: coin.name,
        num: coin.num,
        icon: coin.url
      }))
    }
    let explores = {
      line: [
        { lable: "活跃天数", num: stats.active_days, extra: moment().diff(moment("2024-07-04"), "days") + 1 },
        { lable: "危局强袭战", num: stats.memory_battlefield?.total_score || "-" },
        { lable: "临界推演", num: stats.void_front_brief?.total_score || "-" }
      ],
      other: [
        { lable: "鏖战试炼·荣耀", num: stats.climbing_tower_s3?.layer_info?.climbing_tower_layer || "-" },
        { lable: "式舆防卫战防线", num: stats.all_change_zone_layer_count ? "第" + stats.all_change_zone_layer_count + "防线" : "-" },
        { lable: "拟真鏖战试炼", num: stats.climbing_tower_layer || stats.climbing_tower_s2?.climbing_tower_layer || "-" },
        { lable: "获得代理人数", num: stats.avatar_num, extra: this.lable.avatar },
        { lable: "获得邦布数", num: stats.buddy_num, extra: this.lable.buddy },
        { lable: "达成成就数", num: stats.achievement_count, extra: this.lable.achievement },
        { lable: "随便观复兴等级", num: stats.temple_data?.level },
        { lable: "断层之谜", num: stats.next_hundred_layer || "-" },
        { lable: "绳网声望", num: stats.world_level_name || "-" },
        { lable: "调查协会纪念币", num: coinsTotal, extra: this.lable.commemorative_coins }
      ]
    }
    let areaCollections = []
    if (exploreData && exploreData.area_collections) {
      areaCollections = exploreData.area_collections.map(area => {
        let mapCollections = area.map_collections || []
        return {
          name: area.name,
          progress: area.collection_progress,
          isLock: area.is_lock,
          maps: mapCollections.map(map => {
            let collections = map.collections || []
            return {
              name: map.name,
              progress: map.collection_progress,
              isLock: map.is_lock,
              icon: map.icon,
              collections: collections.map(collection => ({
                id: collection.id,
                name: collection.name,
                num: collection.num,
                total: collection.total,
                icon: collection.icon
              }))
            }
          })
        }
      })
    } else if (resIndex.area_collections) {
      let groupedAreas = {}
      resIndex.area_collections.forEach(area => {
        let groupId = area.urban_area_group_id
        if (!groupedAreas[groupId]) {
          groupedAreas[groupId] = {
            name: this.getAreaGroupName(groupId),
            progress: 0,
            isLock: false,
            maps: []
          }
        }
        groupedAreas[groupId].maps.push({
          name: area.name,
          progress: area.collection_progress,
          isLock: area.is_lock,
          icon: area.icon,
          collections: []
        })
      })
      Object.values(groupedAreas).forEach(area => {
        if (area.maps.length > 0) {
          area.progress = Math.round(area.maps.reduce((sum, map) => sum + map.progress, 0) / area.maps.length)
        }
      })
      areaCollections = Object.values(groupedAreas)
    }

    /** 头像 */
    let avatar = basicInfo?.avatar || resIndex?.cur_head_icon_url || ""
    return {
      nickname,
      avatar,
      explores,
      activeDay: this.dayCount(stats.active_days),
      level: basicInfo?.level ?? 0,
      uid: this.e.uid,
      name: basicInfo?.world_level_name,
      areaCollections,
      commemorativeCoins
    }
  }

  getAreaGroupName (groupId) {
    const groupNames = {
      100: "卫非地",
      101: "莱姆尼安空洞",
      102: "雅努斯区",
      108: "外环地带"
    }
    return groupNames[groupId] || "未知区域"
  }

  dayCount (num) {
    let year = Math.floor(num / 365)
    let month = Math.floor((num % 365) / 30.41)
    let day = Math.floor((num % 365) % 30.41)
    let msg = ""
    if (year > 0) msg += year + "年"
    if (month > 0) msg += month + "个月"
    if (day > 0) msg += day + "天"
    return msg
  }

  sortList (list) {
    /** rarity 顺序 */
    for (let item of list) {
      let { rarity, rank, level, id } = item
      if (_.isNil(rank)) rank = item.star
      id -= id > 50000 ? 10000 : 1000
      let rarityNum = this.rarityMap[rarity]
      if (rarityNum >= 5) rarityNum = 5
      item.sortLevel = level
      item.rarityNum = rarityNum
      item.sort = rarityNum * 100000 + rank * 10000 + level * 100 + id
    }
    if (list.length) list = _(list).orderBy(["sortLevel"], ["desc"]).orderBy(["sort"], ["desc"]).value()
    return list
  }
}
