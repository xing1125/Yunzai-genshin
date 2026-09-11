import fs from "node:fs"
import { base, MysApi, MysInfo, Material } from "#index"
export default class Materials extends base {
  constructor (e) {
    super(e)
    /** 缓存时间，单位分钟 */
    this.cacheCd = 60
  }

  static cache = {}

  async get () {
    /** 获取绑定uid */
    let uid = await MysInfo.getUid(this.e)
    if (!uid) return false
    let cache = Materials.cache[uid]
    if (cache) return cache
    /** 判断是否绑定了ck */
    let { ck } = await MysInfo.checkUidBing(uid, this.e) || {}
    if (!ck) {
      await this.e.reply(MysInfo.tips)
      return false
    }
    this.mysApi = new MysApi(uid, ck, { log: true })
    await this.e.reply("正在获取材料数据，请稍候...")
    let computes = await this.computes()
    let materials = await this.getMaterials(computes)
    let { role } = (await MysInfo.get(this.e, "index")).data || {}
    let list = await MysInfo.get(this.e, "materialList")
    // 获取背包材料数据
    let bagMaterials = await this.getBagMaterials(list)

    if (!materials || !role) {
      await this.e.reply("获取材料数据失败!")
      return false
    }
    // 合并材料数据
    materials = { ...materials, ...bagMaterials }
    // 按指定顺序排序材料分类
    materials = this.sortMaterialsByOrder(materials)
    let data = {
      role,
      ...this.screenData,
      materials,
      formatNum: this.formatNum
    }
    /** 缓存 */
    Materials.cache[uid] = data
    setTimeout(() => delete Materials.cache[uid], this.cacheCd * 60 * 1000)
    return data
  }

  async computes () {
    let computes = []
    let [avatar, weapon] = await this.getComputeList() || []
    if (!avatar || !weapon) return
    avatar.forEach(({ id: avatar_id, skill_list }) => {
      skill_list = skill_list.slice(0, 3)
        .map(({ group_id }) => ({ id: group_id, level_current: 1, level_target: 10 }))
      computes.push({
        avatar_id,
        skill_list,
        avatar_level_current: 1,
        avatar_level_target: 90
      })
    })
    weapon.forEach(({ id, weapon_level }, idx) => {
      computes[idx] ||= {}
      computes[idx].weapon = { id, level_current: 1, level_target: weapon_level <= 2 ? 70 : 90 }
    })
    return computes.filter(val => ![10000005, 10000007, 20000000].includes(val.avatar_id))
  }

  async getComputeList () {
    if (Materials.cache.list) return Materials.cache.list
    let body = {
      page: 1,
      size: 1000,
      is_all: true
    }
    let list = []
    for (let type of ["avatar", "weapon"]) {
      let ret = await MysInfo.get(this.e, "computeList", { type, body })
      if (!ret || ret.retcode !== 0) return
      list.push(ret.data.list)
    }
    Materials.cache.list = list
    return list
  }

  async getMaterials (items) {
    let requestBody
    try {
      const filePath = JSON.parse(fs.readFileSync(process.cwd() + "/plugins/genshin/resources/Genshin/json/compute.json", "utf8"))
      requestBody = filePath
    } catch (e) {
      console.error("读取本地 compute.json 失败:", e)
      throw new Error("获取 compute.json 失败")
    }
    const deviceFingerprint = await MysInfo.get(this.e, "getFp")
    const requestHeaders = {
      "x-rpc-device_fp": deviceFingerprint?.data?.device_fp
    }
    let computes = items && await MysInfo.get(this.e, "compute", {
      body: { ...requestBody, region: this.mysApi.server, uid: `${this.mysApi.uid}` },
      headers: requestHeaders
    })
    if (!computes || computes.retcode !== 0) return
    let data = computes.data?.overall_consume
    if (!data) return
    let ret = { length: data.length, other: [] }
    data.forEach(val => {
      val.num -= val.lack_num
      if (val.num <= 0) return
      let meta = Material.get(val.name)
      if (meta) {
        ret[meta.type] ||= []
        ret[meta.type].push(val)
      } else {
        if (/哲学|指引|教导/.test(val.name)) {
          ret.talent ||= []
          ret.talent.push(val)
        } else {
          ret.other.push(val)
        }
      }
    })
    for (let i in ret) {
      if (Array.isArray(ret[i])) {
        ret[i] = ret[i].sort((a, b) => b.id - a.id)
      }
    }
    return ret
  }

  async getBagMaterials (list) {
    if (!list || !list.data || !list.data.material_info) return {}
    // 获取map tree数据
    let mapTree = await this.getMapTreeData()
    if (!mapTree) return {}
    let materialInfo = list.data.material_info
    let ret = { length: 0 }
    // 材料分类映射
    let categoryMap = this.getMaterialCategoryMap(mapTree)
    // 处理每个材料
    for (let [id, num] of Object.entries(materialInfo)) {
      if (num <= 0) continue
      let materialData = categoryMap[id]
      if (!materialData) continue
      let item = {
        id: parseInt(id),
        name: materialData.name,
        num,
        icon: materialData.icon || "",
        level: materialData.level
      }
      ret.length++
      if (!ret[materialData.type]) {
        ret[materialData.type] = []
      }
      ret[materialData.type].push(item)
    }
    // 对每个分类按ID排序
    for (let type in ret) {
      if (Array.isArray(ret[type])) {
        ret[type] = ret[type].sort((a, b) => b.id - a.id)
      }
    }
    return ret
  }

  async getMapTreeData () {
    if (Materials.cache.mapTree) return Materials.cache.mapTree
    try {
      let response = await fetch("https://api-static.mihoyo.com/common/map_user/ys_obc/v2/map/label/tree?map_id=2&app_sn=ys_obc&lang=zh-cn")
      let data = await response.json()
      if (data.retcode === 0 && data.data && data.data.tree) {
        Materials.cache.mapTree = data.data.tree
        return data.data.tree
      }
    } catch (error) {
      console.error("获取map tree数据失败:", error)
    }
    return null
  }

  getMaterialCategoryMap (mapTree) {
    let categoryMap = {}

    // 需要的分类名称映射
    let targetCategories = {
      贵重收集物: "precious",
      "背包/素材": "materials",
      矿物: "mineral",
      木材: "wood",
      素材: "materials",
      "收集品&任务收集点": "precious",
      杂项: "materials",
      宝箱: "puzzle_chest",
      见闻: "exploration"
    }

    // 遍历map tree寻找目标分类
    mapTree.forEach(category => {
      if (targetCategories[category.name]) {
        let type = targetCategories[category.name]
        // 处理子分类
        if (category.children && category.children.length > 0) {
          category.children.forEach(child => {
            // 根据子分类名称进一步细分类型
            let childType = this.getDetailedType(child.name, type)
            categoryMap[child.id] = {
              name: child.name,
              type: childType,
              icon: child.icon,
              level: 0
            }
          })
        }
      }
    })
    return categoryMap
  }

  getDetailedType (name, defaultType) {
    // 根据材料名称细分类型
    if (/铁块|白铁块|水晶块|紫晶块|魔晶块|星银|萃凝晶|矿/.test(name)) {
      return "mineral"
    }
    if (/木材|木|竹/.test(name)) {
      return "wood"
    }
    if (/宝箱|珍贵|华丽|精致|普通|奇馈/.test(name)) {
      return "puzzle_chest"
    }
    if (/见闻|观景|调查|书本|碑文|石碑/.test(name)) {
      return "exploration"
    }
    return defaultType
  }

  formatNum (num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + "w"
    }
    return num
  }

  sortMaterialsByOrder (materials) {
    let typeOrder = [
      "other", // 特殊消耗品
      "weekly", // 周本掉落
      "weapon", // 武器突破素材
      "gem", // 角色突破素材
      "talent", // 角色天赋素材
      "boss", // 角色培养素材
      "monster", // 精英敌人掉落
      "normal", // 普通敌人掉落
      "precious", // 贵重收集物
      "specialty", // 区域特产
      "puzzle_chest", // 解谜宝箱
      "exploration", // 见闻
      "mineral", // 矿物
      "wood", // 木材
      "materials" // 背包/素材
    ]

    let sortedMaterials = {}
    if (materials.length !== undefined) {
      sortedMaterials.length = materials.length
    }
    typeOrder.forEach(type => {
      if (materials[type] && Array.isArray(materials[type])) {
        sortedMaterials[type] = materials[type]
      }
    })
    Object.keys(materials).forEach(type => {
      if (type !== "length" && !typeOrder.includes(type) && Array.isArray(materials[type])) {
        sortedMaterials[type] = materials[type]
      }
    })
    return sortedMaterials
  }
}