import _ from "lodash"

const DamageRes = {

  /**
     * 转换队伍伤害计算请求数据为精简格式
     * @param result 队伍伤害计算请求数据
     * @param avatars 角色数据，键为角色中文名，值为内部格式
     * @returns {Object} 精简格式伤害数据
     */
  async teamDmgRes (result, avatars) {
    let {
      uid, zdl_tips0, chart_data, chart_color, role_list,
      recharge_info, advice, buff, zdl_tips2, zdl_result, combo_intro
    } = result
    let [tm, total] = zdl_tips0.replace(/你的队伍|，DPS为:/g, "").split("秒内造成总伤害")
    let traveler = _.find(avatars, v => [10000005, 10000007].includes(v.id))?.name || ""
    const rename = (name) => { return name.includes("旅行者") ? traveler : name }
    let pieData = _.map(chart_data, (v) => {
      let [char, damage] = v.name.split("\n")
      char = rename(char)
      if (_.has(avatars, char)) {
        avatars[char].color = v.label.color
      }
      return { char, damage: parseFloat(damage.replace("W", "")) }
    })
    let pieColor = chart_color
    pieData = _.sortBy(pieData, "damage").reverse()
    let elem = _.map(_.filter(pieData, i => avatars[i.char]), v => avatars[v.char].elem)[0]
    _.each(role_list, char => {
      let { role, role_star, key_ability, key_value } = char
      role = rename(role)
      let { artisDetail } = avatars[role]
      avatars[role].artisDetail = _.mapValues(
        _.pickBy(artisDetail.sets || artisDetail, i => i >= 2), (set, name) => {
          return {
            set,
            img: artisDetail.imgs ? _.find(artisDetail.imgs, v => v.includes(name)) : `meta-gs/artifact/imgs/${name}/1.webp`
          }
        }
      )
      avatars[role].star = role_star
      avatars[role].cp = _.round(avatars[role].fightProp["暴击率"], 1)
      avatars[role].cd = _.round(avatars[role].fightProp["暴击伤害"], 1)
      avatars[role].key_prop = key_ability
      avatars[role].key_value = key_value
    })
    _.each(recharge_info, recharge => {
      if (!recharge?.recharge) {
        logger.error(`无效的充能数据: ${JSON.stringify(recharge)}`)
        return
      }
      let [name, tmp] = recharge.recharge.split("共获取同色球")
      if (!tmp) {
        logger.error(`无效的充能数据格式: ${recharge.recharge}`)
        return
      }
      name = rename(name)
      let [same, diff] = tmp.split("个，异色球")
      if (diff.split("个，无色球").length === 2) {
        diff = diff.split("个，无色球")[0]
      }
      avatars[name].recharge = {
        pct: recharge.rate || 0,
        same: _.round(parseFloat(same) || 0, 1),
        diff: _.round(parseFloat(diff?.replace("个", "") || 0), 1)
      }
    })
    let actions = _.map(combo_intro.split(","), v => v.replace(/旅行者(\S)/g, traveler))
    let damages = _.map(advice, step => {
      if (!step.content) {
        logger.error(`奇怪的伤害：${step}`)
        return
      }
      let [t, s] = step.content.split(" ")
      let [a, d] = s.split("，")
      d = d?.split(",")?.map(dd => dd.split(/[：:]/)?.[1] || "-") || ["-", "-", "-"]
      return [t, _.toUpper(a), ...d]
    })
    let buffs = _.map(buff, bf => {
      if (!bf.content) {
        logger.error(`奇怪的Buff：${bf}`)
        return ["", "", ""]
      }
      let [t, tmp] = bf.content.replace(/旅行者(\S)/g, traveler).split(" ")
      let b = tmp.split("-")[0]
      let bd = _.tail(tmp.split("-")).join("-")
      return [t, _.toUpper(b), _.toUpper(bd)]
    }).filter(Boolean)
    return {
      uid,
      elem,
      rank: zdl_tips2,
      dps: zdl_result,
      tm,
      total,
      pieData,
      pieColor,
      avatars,
      actions,
      damages,
      buffs
    }
  }
}

export default DamageRes