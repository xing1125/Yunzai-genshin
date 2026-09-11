export default class MysApi {
  constructor (e, uid) {
    this.e = e
    this.uid = uid
  }

  static async init (e, auth = "all") {
    const mys = await e.runtime.getMysInfo(auth)
    if (!mys) return false
    e._mys = new MysApi(e, mys.uid)
    return e._mys
  }

  static async initUser (e, auth = "all") {
    let uid
    if (e.runtime.getUid) {
      uid = await e.runtime.getUid()
    } else {
      uid = e.runtime.uid || e.uid
      if (e.at && !uid) {
        const mys = await MysApi.init(e, auth)
        if (!mys) return false
        uid = mys.uid
      }
    }
    return uid || false
  }
}
