import { Data, Render, Character, Player } from "#fansky"
import { Avatar } from "../../../../../miao-plugin/models/index.js"
import { DamageRes, Serv, ServReq, ProfileData, Profile } from "#fansky.models"

let ProfileDmg = {
  async teamDmg (e, roles, uid) {
    if (roles.length === 1) {
      const res = await this.getTeams(roles[0])
      if (res && res.length) {
        roles = res
      }
    }

    try {
      if (!roles || !Array.isArray(roles)) {
        roles = []
      }

      if (!roles.length) {
        if (e.isSuper) return false
        const player = Player.create(uid)
        if (!player || !player._avatars) {
          return e.reply(`UID:${uid}未能获取到角色数据，请先使用【#更新面板】`, true)
        }

        const topAvatars = Object.values(player._avatars)
          .filter(avatar => avatar && avatar.level)
          .sort((a, b) => b.level - a.level)
          .slice(0, 4)

        if (!topAvatars.length) {
          return e.reply(`UID:${uid}未能获取到角色数据，请先使用【#更新面板】`, true)
        }

        roles = topAvatars.map(avatar => avatar.name).filter(Boolean)
      }

      let characters = []
      for (let role of roles) {
        let character = Character.get(role)
        if (!character) {
          return e.reply(`未能识别的角色：${role}`)
        }

        characters.push(character)
      }

      const avatars = {}
      const reqData = { uid, role_data: [] }
      const player = Player.create(uid)

      for (const role of characters) {
        let profile = player.getProfile(role.id)

        if (!profile) {
          return e.reply(`UID: ${uid}暂无${role.name} 的面板数据，请先【#更新面板】`, true)
        }

        if (e.isSuper && profile.char.isTraveler) {
          let _avatars = player._avatars
          if (!_avatars[role.id]) return false

          let avatar = _avatars[role.id]
          if (!avatar.isAvatar) {
            let data = _avatars[role.id]
            avatar = _avatars[role.id] = Avatar.create(_avatars[role.id])
            avatar.setAvatar(data)
          }
          profile = avatar
        }

        if (!profile || !profile.hasData) {
          return e.reply(`UID: ${uid}暂无${role.name} 的面板数据，请先【#更新面板】`, true)
        }

        let imgs = profile.char.getImgs(profile.costume)
        avatars[role.name] = await ProfileData.covRoleData(profile, imgs)

        const covProfileData = await ProfileData.covTeyvatData(profile)
        reqData.role_data.push(covProfileData)
      }

      e.reply(`UID: ${uid}\n角色: ${characters.map(v => v.name).join(", ")}`)

      reqData.server = await Serv.getServ(uid, true)

      let { code, result, info } = await ServReq.teyvat(reqData)

      if (code !== 200 || !result) {
        logger.error(`[队伍伤害] 接口错误: ${info}`)
        return e.reply("提瓦特小助手接口无法访问或返回错误", true)
      }

      if (!result || typeof result !== "object") {
        logger.error("[队伍伤害] 返回数据格式错误")
        return e.reply("数据格式错误，请稍后重试", true)
      }

      let data = await DamageRes.teamDmgRes(result, avatars)
      if (!data) {
        return e.reply("伤害数据计算失败，请稍后重试", true)
      }

      return await this.renderData(e, data)
    } catch (err) {
      logger.error("[队伍伤害] 处理错误:", err)
      return e.reply("队伍伤害数据处理出错，请稍后重试", true)
    }
  },

  async renderData (e, data) {
    const renderData = {
      ...data,
      detail: e.detail,
      saveId: data.uid
    }
    return Render.render(e, "Genshin/html/dmg/damage", renderData)
  },

  async getTeams (alias) {
    if (typeof alias !== "string") {
      return []
    }
    const data = await Data.readYAML("config/alias.yaml")
    for (let [name, value] of Object.entries(data)) {
      if (alias === name || value.alias && value.alias.includes(alias)) {
        return alias === name && Array.isArray(value) ? value : value.chars
      }
    }
    return []
  }
}

export default ProfileDmg