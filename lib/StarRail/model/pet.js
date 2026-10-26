import { base, MysInfo } from "#index"
import { buildPetGroups } from "./petData.js"

export default class Pet extends base {
  static async get (e) {
    const res = await MysInfo.get(e, { index: "", pet_info: "" })
    if (!res || res.some(item => !item || item.retcode !== 0)) return false
    const groups = buildPetGroups(res[1].data)
    return {
      ...new Pet(e).screenData,
      uid: e.uid,
      groups,
      petNum: res[0].data.stats?.pet_num ?? groups.reduce((sum, group) => sum + group.pets.length, 0)
    }
  }
}
