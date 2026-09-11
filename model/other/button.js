export default class Button {
  constructor (e = {}) {
    this.prefix = e?.isSr ? "*" : "#"
    this.ledger = e?.isSr ? "🔴星琼" : "🟡原石"
    this.ledgercallback = e?.isSr ? "星琼" : "原石"
    this.gachasr = e?.isSr ? "光锥" : "武器"
    this.gachaxzscallback = e?.isSr ? "帮助" : "#更新小助手抽卡记录"
    this.wiki = e?.isSr ? "" : "图鉴"
  }

  /** 模拟抽卡 */
  gacha (NowPool = {}) {
    return segment.button([
      { text: `🟡${NowPool.up5.toString()}`, callback: "#模拟抽卡1" },
      { text: `🟡${NowPool.up5_2.toString()}`, callback: "#模拟抽卡2" }
    ], [
      { text: `🟡${NowPool.up5_3.toString()}`, callback: "#模拟抽卡3" },
      { text: `🟡${NowPool.up5_4.toString()}`, callback: "#模拟抽卡4" }
    ], [
      { text: `🟡${NowPool.weapon5.toString()}`, callback: "#模拟抽卡5" },
      { text: "🟡武器", callback: "#模拟抽卡0" }
    ])
  }

  /** 抽卡记录 */
  gcLog () {
    return segment.button([
      { text: "🟢抽卡成就", callback: `${this.prefix}抽卡成就` },
      { text: "🟢角色统计", callback: `${this.prefix}角色统计` }
    ], [
      { text: "🟡全量更新", callback: "#设置全量更新抽卡记录开" },
      { text: "🟢全部记录", callback: `${this.prefix}全部记录` }
    ])
  }

  /** 绑定stoken */
  bingStoken () {
    return segment.button([
      { text: "🟢扫码登录", callback: "#扫码登录" },
      { text: "🟢刷新CK", callback: "#刷新ck" }
    ])
  }

  /** 记录帮助 */
  gcHelp () {
    return segment.button([
      { text: "🟡记录帮助", callback: "#记录帮助" },
      { text: "🟡抽卡记录", callback: `${this.prefix}全部记录` }
    ], [
      { text: "🟡更新抽卡", callback: "#更新抽卡记录" },
      { text: "🟡扫码登录", callback: "#扫码登录" }
    ], [
      { text: "🟢注册时间", callback: "#注册时间" },
      { text: "🟡更新助手", callback: "#更新小助手抽卡记录" }
    ], [
      { text: "🔴星铁获取", link: "https://b.storyo.cn/archives/srlink" }
    ])
  }

  /** 注册时间 */
  gameTime () {
    return segment.button([
      { text: "🟢全部游戏注册", callback: "#注册时间" }
    ], [
      { text: "🟢刷新Cookie", callback: "#刷新ck" },
      { text: "🟢绑定Cookie", callback: "#扫码登录" }
    ])
  }

  /** 礼记查询 */
  gameLeder () {
    return segment.button([
      { text: `${this.ledger}记录`, callback: `${this.prefix}${this.ledgercallback}` },
      { text: `${this.ledger}统计`, callback: `${this.prefix}${this.ledgercallback}统计` }
    ], [
      { text: `版本可获取${this.ledgercallback}`, callback: `${this.ledgercallback}预估` }
    ])
  }

  /** 崩三手帐查询 */
  bh3Leder () {
    return segment.button([
      { text: "当月水晶", callback: "!水晶" },
      { text: "上月水晶", callback: "!上月水晶" }
    ], [
      { text: "水晶统计", callback: "!水晶统计" }
    ], [
      { text: "版本可获取水晶", callback: "#水晶预估" }
    ])
  }

  /** 抽卡资源统计 */
  estimate () {
    return segment.button([
      { text: "原石预估", callback: "#预估" },
      { text: "星琼", callback: "*预估" },
      { text: "菲林", callback: "%预估" }
    ], [
      { text: "原石", callback: "#原石" },
      { text: "原石统计", callback: "#原石统计" }
    ], [
      { text: "星琼", callback: "*星琼" },
      { text: "星琼统计", callback: "*星琼统计" }
    ], [
      { text: "菲林", callback: "%菲林" },
      { text: "菲林统计", callback: "%菲林统计" }
    ])
  }

  /** 充值记录 */
  payLog () {
    return segment.button([
      { text: "原神充值　", callback: "#充值记录" },
      { text: "星铁充值　", callback: "*充值记录" },
      { text: "绝区充值　", callback: "%充值记录" }
    ], [
      { text: "原石　", callback: "#原石" },
      { text: "星琼　", callback: "*星琼" },
      { text: "菲林　", callback: "%菲林" }
    ], [
      { text: "🟢刷新Cookie", callback: "#刷新ck" },
      { text: "🟢绑定Cookie", callback: "#扫码登录" }
    ])
  }

  /** 原神信息 */
  roleGs () {
    return segment.button([
      { text: "角色", callback: "#角色" },
      { text: "列表", callback: "#角色列表" },
      { text: "探索", callback: "#探索" },
      { text: "成就", callback: "#成就" }
    ], [
      { text: "武器", callback: "#武器" },
      { text: "剧诗", callback: "#幻想真境剧诗" },
      { text: "深渊", callback: "#深渊" },
      { text: "材料", callback: "#材料背包" }
    ], [
      { text: "原石", callback: "#原石" },
      { text: "队伍", input: "#队伍伤害" },
      { text: "幽境", callback: "#幽境危战" },
      { text: "注册", callback: "#注册时间" }
    ], [
      { text: "活动", callback: "#个人日历" },
      { text: "模拟", callback: "#模拟抽卡" },
      { text: "七圣", callback: "#七圣数据" }
    ], [
      { text: "🟢查询指令", callback: "#云崽帮助" },
      { text: "🟢游戏列表", callback: "#账号列表" }
    ])
  }

  /** 星铁信息 */
  roleSr () {
    return segment.button([
      { text: "角色", callback: "*角色" },
      { text: "列表", callback: "*角色列表" },
      { text: "探索", callback: "*探索" },
      { text: "武器", callback: "*武器" }
    ], [
      { text: "差分", callback: "*差分宇宙" },
      { text: "模拟", callback: "*模拟宇宙" },
      { text: "寰宇", callback: "*寰宇蝗灾" },
      { text: "黄金", callback: "*黄金与机械" }
    ], [
      { text: "不可知域", callback: "*不可知域" },
      { text: "逐光捡金", callback: "*逐光捡金" }
    ], [
      { text: "货币", callback: "*货币战争" },
      { text: "异相", callback: "*异相仲裁" },
      { text: "成就", callback: "*成就查漏" },
      { text: "注册", callback: "#注册时间" }
    ], [
      { text: "活动", input: "*活动日历" },
      { text: "星琼", input: "*星琼" },
      { text: "指令", callback: "#云崽帮助" },
      { text: "账号", callback: "#账号列表" }
    ])
  }

  /** 绝区零信息 */
  roleZZZ () {
    return segment.button([
      { text: "角色", callback: "%角色" },
      { text: "列表", callback: "%角色列表" },
      { text: "探索", callback: "%探索" },
      { text: "武器", callback: "%武器" }
    ], [
      { text: "邦布", callback: "%邦布" },
      { text: "武器", callback: "%武器" },
      { text: "危局", callback: "%危局" },
      { text: "防卫", callback: "%防卫" }
    ], [
      { text: "推演", callback: "%临界推演" },
      { text: "菲林", callback: "%菲林" },
      { text: "注册", callback: "#注册时间" }
    ], [
      { text: "🟢注册时间", callback: "#注册时间" }
    ], [
      { text: "🟢查询指令", callback: "#云崽帮助" },
      { text: "🟢游戏列表", callback: "#账号列表" }
    ])
  }

  /** 未定事件簿信息 */
  roleWd () {
    return segment.button([
      { text: "🔵角色", callback: "&角色" }
    ], [
      { text: "🟢查询指令", callback: "#云崽帮助" },
      { text: "🟢游戏列表", callback: "#账号列表" }
    ])
  }

  /** 崩三信息 */
  roleBh3 () {
    return segment.button([
      { text: "角色", callback: "!角色" },
      { text: "列表", callback: "!角色列表" },
      { text: "武器", callback: "!武器" },
      { text: "卡片", callback: "!卡片" }
    ], [
      { text: "周绩", callback: "!周报" },
      { text: "乐土", callback: "!乐土" },
      { text: "深渊", callback: "!深渊" },
      { text: "战场", callback: "!战场" }
    ], [
      { text: "💧体力查询", callback: "!体力" }
    ], [
      { text: "🟢查询指令", callback: "#云崽帮助" },
      { text: "🟢游戏列表", callback: "#账号列表" }
    ])
  }

  /** 七圣召唤 */
  sevenSaints () {
    return segment.button([
      { text: "🔴角色卡牌", callback: "#七圣召唤查询角色牌" },
      { text: "🔴行动卡牌", callback: "#七圣召唤查询行动牌" }
    ], [
      { text: "🔴牌组列表", callback: "#七圣召唤查询牌组" },
      { text: "🔴七圣数据", callback: "#七圣召唤数据" }
    ], [
      { text: "🔴七圣战绩", callback: "#七圣战绩" }
    ], [
      { text: "🟢绑定Cookie", callback: "#扫码登录" },
      { text: "🟢刷新Cookie", callback: "#刷新ck" }
    ], [
      { text: "🟢查询指令", callback: "#云崽帮助" },
      { text: "🟢游戏列表", callback: "#账号列表" }
    ])
  }

  /** 用户统计 */
  mysUserAdmin () {
    return segment.button([
      { text: "🟣用户统计", callback: "#用户统计", permission: "admin" },
      { text: "🟣清理无效", callback: "#清理无效用户", permission: "admin" }
    ])
  }

  /** 更新记录 */
  upGcLog () {
    return segment.button([
      { text: "🟡助手记录", callback: `${this.gachaxzscallback}` },
      { text: "🟢全部记录", callback: `${this.prefix}全部记录` }
    ], [
      { text: "🟢角色记录", callback: `${this.prefix}角色记录` },
      { text: "🟢角色统计", callback: `${this.prefix}角色统计` }
    ], [
      { text: `🟢${this.gachasr}记录`, callback: `${this.prefix}${this.gachasr}记录` },
      { text: `🟢${this.gachasr}统计`, callback: `${this.prefix}${this.gachasr}统计` }
    ], [
      { text: "🟡集录记录", callback: "#集录记录" },
      { text: "🟡集录统计", callback: "#集录统计" }
    ], [
      { text: "🟢常驻记录", callback: `${this.prefix}常驻记录` },
      { text: "🟢常驻统计", callback: `${this.prefix}常驻统计` }
    ])
  }

  /** 绑定uid */
  bingGameUid () {
    return segment.button([
      { text: "绑定原神", input: "#绑定uid" },
      { text: "星铁", input: "*绑定uid" },
      { text: "绝区", input: "%绑定uid" }
    ], [
      { text: "切换原神", input: "#uid" },
      { text: "星铁", input: "*uid" },
      { text: "绝区", input: "%uid" }
    ], [
      { text: "删除原神", input: "#删除uid" },
      { text: "星铁", input: "*删除uid" },
      { text: "绝区", input: "%删除uid" }
    ], [
      { text: "原神面板", callback: "#更新面板" },
      { text: "星铁面板", callback: "*更新面板" },
      { text: "绝区面板", callback: "%更新面板" }
    ], [
      { text: "🟢快捷绑定", callback: "#扫码登录" },
      { text: "🟢账号列表", callback: "#账号列表" }
    ])
  }

  /** 米游社 */
  mysButton () {
    return segment.button([
      { text: "🟢米游社　　", link: "https://miyoushe.com" },
      { text: "🟢Cookie帮助", callback: "#Cookie帮助" }
    ], [
      { text: "🟢绑定Cookie", callback: "#扫码登录" },
      { text: "🟢刷新Cookie", callback: "#刷新ck" }
    ], [
      { text: "切换原神", input: "#uid" },
      { text: "星铁", input: "*uid" },
      { text: "绝区", input: "%uid" }
    ], [
      { text: "🟢查询指令", callback: "#云崽帮助" },
      { text: "🟢游戏列表", callback: "#账号列表" }
    ], [
      { text: "🟢绑定设备id帮助", link: "https://gitee.com/HanaHimeUnica/copy-device-info" }
    ])
  }

  /** 角色攻略 */
  strategy (role = "") {
    return segment.button([
      { text: "🟡攻略1", callback: `${this.prefix}${role.name}攻略1` },
      { text: "🟡攻略2", callback: `${this.prefix}${role.name}攻略2` }
    ], [
      { text: "🟡攻略3", callback: `${this.prefix}${role.name}攻略3` },
      { text: "🟡攻略4", callback: `${this.prefix}${role.name}攻略4` }
    ], [
      { text: "🟡攻略5", callback: `${this.prefix}${role.name}攻略5` },
      { text: "🟡攻略6", callback: `${this.prefix}${role.name}攻略6` }
    ], [
      { text: `🟢${role.name}素材`, callback: `${this.prefix}${role.name}素材` }
    ], [
      { text: `🟢${role.name}养成`, callback: `${this.prefix}${role.name}养成` }
    ])
  }

  /** 角色素材 */
  materials (role = "") {
    return segment.button([
      { text: `🟢${role.name}图鉴`, callback: `${this.prefix}${role.name}${this.wiki}` },
      { text: `🟢${role.name}攻略`, callback: `${this.prefix}${role.name}攻略` }
    ], [
      { text: `🟢${role.name}命座`, callback: `${this.prefix}${role.name}命座` },
      { text: `🟢${role.name}天赋`, callback: `${this.prefix}${role.name}天赋` }
    ], [
      { text: `🟢${role.name}素材`, callback: `${this.prefix}${role.name}素材` },
      { text: `🟢${role.name}养成`, callback: `${this.prefix}${role.name}养成` }
    ])
  }

  /** 绝区零攻略 */
  zzzStrategy (role = "") {
    return segment.button([
      { text: "🟠素材", callback: `%${role}素材` }
    ], [
      { text: "🟠攻略1", callback: `%${role}攻略1` },
      { text: "🟠攻略2", callback: `%${role}攻略2` },
      { text: "🟠攻略3", callback: `%${role}攻略3` }
    ])
  }

  /** 绑定设备id */
  device_id () {
    return segment.button([
      { text: "🟢下载APK", link: "https://gitee.com/HanaHimeUnica/copy-device-info/raw/master/%E8%AE%BE%E5%A4%87%E4%BF%A1%E6%81%AF.apk" }
    ], [
      { text: "🟢IOS绑定说明", link: "https://gitee.com/HanaHimeUnica/copy-device-info" }
    ])
  }
}