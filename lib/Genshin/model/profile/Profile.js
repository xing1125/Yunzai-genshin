import { Data, Character } from "#fansky"
import { TransData } from "./trans/TransData.js"
import { DamageRes, ProfileData, Serv, ServReq } from "./index.js"

const Profile = {
  /**
     * 队伍伤害消息生成入口 -- (未指定队伍)
     * @param e 事件e
     * @param uid 查询用户 UID
     * @returns {Object} 查询结果。一般返回图片字节，出错时返回错误信息字符串
     */
  async teamDmg (e, uid) {
    try {
      const avatarData = await this.getAvatarData(e, uid)
      if (avatarData.error) {
        return { error: avatarData.error }
      }
      let { avatars, reqData } = avatarData

      reqData.server = await Serv.getServ(uid, true)

      let { code, result, info } = await ServReq.teyvat(reqData)

      if (code !== 200 || !result) {
        logger.error(`[错误信息] >>>${info}`)
        return { error: "提瓦特小助手接口无法访问或返回错误" }
      }

      return await DamageRes.teamDmgRes(result, avatars)
    } catch (err) {
      logger.error(`[${err.constructor.name}] 队伍伤害数据解析出错`)
      return { error: `[${err.constructor.name}] 队伍伤害数据解析出错` }
    }
  },

  /**
     * 角色数据获取（内部格式）
     * @param e
     * @param uid 查询用户 UID
     * @returns {Object} 查询结果
     */
  async getAvatarData (e, uid) {
    let cd = await Data.redisGet(`FanSky:refresh:${uid}`, "ttl")
    if (cd > 0) {
      return { error: `请求过快, 请${cd}秒后重试...` }
    }
    try {
      let avatarInfoList = await ServReq.enka(uid)
      if (avatarInfoList.error) {
        return { error: avatarInfoList.error }
      }
      avatarInfoList = avatarInfoList.slice(0, 4)

      const reqData = { uid, role_data: [] }
      const avatars = {}
      let chars = []
      for (const avatar of avatarInfoList) {
        let profile = await TransData.fromEnka(avatar)

        let imgs = Character.get(profile.id).getImgs()

        avatars[profile.name] = await ProfileData.covRoleData(profile, imgs)
        let covData = await ProfileData.covTeyvatData(profile)

        chars.push(profile.name)
        reqData.role_data.push(covData)
      }
      e.reply(`UID: ${uid}\n角色: ${chars.join(", ")}`)

      return { avatars, reqData }
    } catch (err) {
      logger.error(err)
      return { error: err.message }
    }
  }
}

export default Profile
