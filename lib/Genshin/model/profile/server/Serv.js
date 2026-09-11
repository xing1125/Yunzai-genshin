import MysApi from "../mys/MysApi.js"

const Serv = {
  /**
     * uid=>服务器
     * @param uid 查询uid
     * @param teyvat 小助手 默认false
     * @returns {Promise<*|string>}
     */
  async getServ (uid, teyvat = false) {
    const servers = {
      5: "cn_qd01",
      6: teyvat ? "us" : "os_usa",
      7: teyvat ? "eur" : "os_euro",
      8: teyvat ? "asia" : "os_asia",
      9: teyvat ? "hk" : "os_cht"
    }
    return servers[uid[0]] || "cn_gf01"
  },

  /**
     *  获取uid
     * @param e
     * @returns {Promise<string|boolean|*>}
     */
  async getUid (e) {
    let uidReg = /([1-9]|18)[0-9]{8}/
    if (e.uid && uidReg.test(e.uid)) return e.uid

    let uidRet = uidReg.exec(e.msg)
    if (uidRet) {
      return e.uid = uidRet[0]
    }
    try {
      let uid = await MysApi.initUser(e)
      if (!uid || !uidReg.test(uid)) return false
      return e.uid = uid
    } catch (err) {
      return false
    }
  }
}

export default Serv
