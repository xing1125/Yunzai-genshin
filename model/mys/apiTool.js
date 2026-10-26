import crypto from "crypto"
/**
 * 整合接口用于查询数据
 * 方便后续用于解耦
 * 临时处理，后续大概率重写 主要原因（懒）
 */
export default class apiTool {
  /**
   *
   * @param {用户uid} uid
   * @param {区服} server
   * @param {是否为星穹铁道或其他游戏? type(bool or string)} isSr
   */
  constructor (uid, server, game, biz, ltuid) {
    this.uid = uid
    this.ltuid = ltuid
    this.game = game || "gs"
    this.server = server
    this.biz = biz
    this.uuid = crypto.randomUUID()
  }

  getUrlMap = (data = {}) => {
    let host, host_nap, hostRecord, hostPublicData
    if (["bh3_cn", "bh2_cn"].includes(this.biz) || /cn_|_cn/.test(this.server)) {
      host = "https://api-takumi.mihoyo.com/"
      host_nap = "https://act-nap-api.mihoyo.com/"
      hostRecord = "https://api-takumi-record.mihoyo.com/"
      hostPublicData = "https://public-data-api.mihoyo.com/"
    } else {
      host = "https://sg-public-api.hoyolab.com/"
      host_nap = "https://sg-act-nap-api.hoyolab.com/"
      hostRecord = "https://bbs-api-os.hoyolab.com/"
      hostPublicData = "https://sg-public-data-api.hoyoverse.com/"
    }
    let urlMap = {
      gs: {
        /** 体力接口fp参数用于避开验证码 */
        ...(["cn_gf01", "cn_qd01"].includes(this.server) ? {
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_cn",
              bbs_device_id: `${this.uuid}`,
              device_fp: "38d802d62e7fb",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"12","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"58.2.A.7.93","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        } : {
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_oversea",
              device_fp: "38d7f469c1319",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"12","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"58.2.A.7.93","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        }),
        /** 首页宝箱 */
        index: {
          url: `${hostRecord}game_record/app/genshin/api/index`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 深渊 */
        spiralAbyss: {
          url: `${hostRecord}game_record/app/genshin/api/spiralAbyss`,
          query: `role_id=${this.uid}&schedule_type=${data.schedule_type || 1}&server=${this.server}`
        },
        /** 幻想真境剧诗 */
        role_combat: {
          url: `${hostRecord}game_record/app/genshin/api/role_combat`,
          query: `role_id=${this.uid}&need_detail=true&server=${this.server}`
        },
        /** 幽境危战 */
        hard_challenge: {
          url: `${hostRecord}game_record/app/genshin/api/hard_challenge`,
          query: `role_id=${this.uid}&need_detail=true&server=${this.server}`
        },
        /** 幽境危战 （赋光角色） */
        hard_challenge_popularity: {
          url: `${hostRecord}game_record/app/genshin/api/hard_challenge/popularity`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 角色详情 */
        character: {
          url: `${hostRecord}game_record/app/genshin/api/character/list`,
          body: { role_id: this.uid, server: this.server }
        },
        /** 角色面板 */
        characterDetail: {
          url: `${hostRecord}game_record/app/genshin/api/character/detail`,
          body: { role_id: this.uid, server: this.server, character_ids: data.character_ids }
        },
        /** 树脂 */
        dailyNote: {
          url: `${hostRecord}game_record/app/genshin/api/dailyNote`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 活动 */
        activity: {
          url: `${hostRecord}game_record/app/genshin/api/act_calendar`,
          body: { role_id: this.uid, server: this.server }
        },
        /** 详情 */
        detail: {
          url: `${host}event/e20200928calculate/v1/sync/avatar/detail`,
          query: `uid=${this.uid}&region=${this.server}&avatar_id=${data.avatar_id}`
        },
        /** 札记 */
        ledger: {
          url: "https://hk4e-api.mihoyo.com/event/ys_ledger/monthInfo",
          query: `month=${data.month}&bind_uid=${this.uid}&bind_region=${this.server}`
        },
        /** 养成计算器 */
        compute: {
          url: `${host}event/e20200928calculate/v3/batch_compute`,
          body: data.body
        },
        /** 材料背包 */
        computeList: {
          url: `${host}event/e20200928calculate/v1/${data.type || "avatar"}/list`,
          body: data.body
        },
        /** 材料背包 */
        materialList: {
          url: `${host}common/map_user/ys_obc/v1/user/sync_game_material_info?map_id=2&app_sn=ys_obc&lang=zh-cn`,
          query: `uid=${this.uid}&region=${this.server}`
        },
        /** 尘歌壶 */
        blueprintCompute: {
          url: `${host}event/e20200928calculate/v1/furniture/compute`,
          body: data.body
        },
        /** 养成计算器 */
        blueprint: {
          url: `${host}event/e20200928calculate/v1/furniture/blueprint`,
          query: `share_code=${data.share_code}&region=${this.server}`
        },
        /** 角色技能 */
        avatarSkill: {
          url: `${host}event/e20200928calculate/v1/avatarSkill/list`,
          query: `avatar_id=${data.avatar_id}`
        },
        /** 七圣召唤数据 */
        basicInfo: {
          url: `${hostRecord}game_record/app/genshin/api/gcg/basicInfo`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 成就 */
        achievement: {
          url: `${hostRecord}game_record/app/genshin/api/achievement`,
          body: { role_id: this.uid, server: this.server }
        },
        /** 七圣牌组 */
        deckList: {
          url: `${hostRecord}game_record/app/genshin/api/gcg/deckList`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 七圣召唤角色牌数据 */
        avatar_cardList: {
          url: `${hostRecord}game_record/app/genshin/api/gcg/cardList`,
          query: `limit=999&need_action=false&need_avatar=true&need_stats=true&offset=0&role_id=${this.uid}&server=${this.server}`
        },
        /** 七圣召唤行动牌数据 */
        action_cardList: {
          url: `${hostRecord}game_record/app/genshin/api/gcg/cardList`,
          query: `limit=999&need_action=true&need_avatar=false&need_stats=true&offset=0&role_id=${this.uid}&server=${this.server}`
        },
        /** 抽卡记录 充值记录 */
        AuthKey: {
          url: `${host}binding/api/genAuthKey`,
          body: { auth_appid: data.auth_appid || "webview_gacha", game_biz: data.game_biz || "hk4e_cn", game_uid: this.uid, region: this.server }
        },
        /** 使用兑换码 目前仅限国际服,来自于国服的uid请求已在mysInfo.js的init方法提前拦截 */
        useCdk: {
          url: "https://sg-hk4e-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl",
          query: `cdkey=${data.cdk}&game_biz=hk4e_global&lang=zh-cn&region=${this.server}&t=${new Date().getTime() + ""}&uid=${this.uid}`
        }
      },
      sr: {
        ...(["prod_gf_cn", "prod_qd_cn"].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=hkrpg_cn&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_cn",
              bbs_device_id: `${this.uuid}`,
              device_fp: "38d802d62e7fb",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"12","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"58.2.A.7.93","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=hkrpg_global&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_oversea",
              device_fp: "38d7f469c1319",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"12","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"58.2.A.7.93","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        }),
        /** 首页宝箱 */
        index: {
          url: `${hostRecord}game_record/app/hkrpg/api/index`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 宝箱获取 */
        chest: {
          url: `${hostRecord}game_record/app/hkrpg/api/chest_info`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 角色信息 */
        basicInfo: {
          url: `${hostRecord}game_record/app/hkrpg/api/role/basicInfo`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 角色面板 */
        avatarInfo: {
          url: `${hostRecord}game_record/app/hkrpg/api/avatar/info`,
          query: `need_wiki=true&role_id=${this.uid}&server=${this.server}`
        },
        /** 活动 */
        activity: {
          url: `${hostRecord}game_record/app/hkrpg/api/get_act_calender`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 随宠款式详情 */
        pet_info: {
          url: `${hostRecord}game_record/app/hkrpg/api/pet_info`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 开拓月历接口 */
        ledger: {
          url: `${host}event/srledger/month_info`,
          query: `lang=zh-cn&region=${this.server}&uid=${this.uid}&month=${data.month}`
        },
        /** 角色详情 */
        character: {
          url: `${hostRecord}game_record/app/hkrpg/api/avatar/basic`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 成就 */
        achievement: {
          url: `${hostRecord}game_record/app/hkrpg/api/achievement_info`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 树脂 */
        dailyNote: {
          url: `${hostRecord}game_record/app/hkrpg/api/note`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 养成计算器 */
        compute: {
          url: `${host}event/rpgcalc/compute?`,
          query: "game=hkrpg",
          body: data.body
        },
        /** 详情 */
        detail: {
          url: `${host}event/rpgcalc/avatar/detail`,
          query: `game=hkrpg&lang=zh-cn&item_id=${data.avatar_id}&tab_from=${data.tab_from}&change_target_level=0&uid=${this.uid}&region=${this.server}`
        },
        /** 使用兑换码 目前仅限国际服,来自于国服的uid请求已在mysInfo.js的init方法提前拦截 */
        useCdk: {
          url: "https://sg-hkrpg-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl",
          query: `cdkey=${data.cdk}&game_biz=hkrpg_global&lang=zh-cn&region=${this.server}&t=${new Date().getTime() + ""}&uid=${this.uid}`
        },
        /** 逐光捡金 */
        brief: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_brief`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 深渊 （混沌回忆） */
        challenge_chaos: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge`,
          query: `isPrev=true&need_all=true&role_id=${this.uid}&schedule_type=${data.schedule_type || 1}&server=${this.server}`
        },
        /** 异相仲裁  */
        challenge_peak: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_peak`,
          query: `isPrev=true&need_all=true&role_id=${this.uid}&schedule_type=${data.schedule_type || 1}&server=${this.server}`
        },
        /** 虚构叙事 */
        challenge_story: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_story`,
          query: `isPrev=true&need_all=true&role_id=${this.uid}&schedule_type=${data.schedule_type}&server=${this.server}`
        },
        /** 末日幻影 */
        challenge_boss: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_boss`,
          query: `isPrev=true&need_all=true&role_id=${this.uid}&schedule_type=${data.schedule_type}&server=${this.server}`
        },
        /** 模拟宇宙 */
        rogue: {
          url: `${hostRecord}game_record/app/hkrpg/api/rogue`,
          query: `need_detail=true&role_id=${this.uid}&schedule_type=3&server=${this.server}`
        },
        /** 寰宇蝗灾 */
        rogue_locust: {
          url: `${hostRecord}game_record/app/hkrpg/api/rogue_locust`,
          query: `need_detail=true&role_id=${this.uid}&server=${this.server}`
        },
        /** 黄金机械 */
        rogue_nous: {
          url: `${hostRecord}game_record/app/hkrpg/api/rogue_nous`,
          query: `need_detail=true&role_id=${this.uid}&server=${this.server}`
        },
        /** 差分宇宙 */
        rogue_tourn: {
          url: `${hostRecord}game_record/app/hkrpg/api/rogue_tourn`,
          query: `need_detail=true&role_id=${this.uid}&schedule_type=3&server=${this.server}`
        },
        /** 货币战争 */
        grid_fight: {
          url: `${hostRecord}game_record/app/hkrpg/api/grid_fight`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 不可知域 */
        rogue_magic: {
          url: `${hostRecord}game_record/app/hkrpg/api/rogue_magic`,
          query: `need_detail=true&role_id=${this.uid}&server=${this.server}`
        },
        /** 充值记录 */
        AuthKey: {
          url: "https://gameapi-account.mihoyo.com/binding/api/genAuthKey",
          body: { auth_appid: data.auth_appid || "csc", game_biz: data.game_biz || "hkrpg_cn", game_uid: this.uid, region: this.server }
        }
      },
      zzz: {
        ...(["prod_gf_cn"].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=nap_cn&region=${this.server}&game_uid=${this.uid}`
          },
          sign_info: {
            url: `${host_nap}event/luna/zzz/info`,
            query: `lang=zh-cn&act_id=e202406242138391&region=${this.server}&uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_cn",
              bbs_device_id: `${this.uuid}`,
              device_fp: "38d802d62e7fb",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"12","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"58.2.A.7.93","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=nap_global&region=${this.server}&game_uid=${this.uid}`
          },
          sign_info: {
            url: `${host_nap}event/luna/zzz/os/info`,
            query: "lang=zh-cn&act_id=e202406031448091"
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_oversea",
              device_fp: "38d7f469c1319",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"12","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"58.2.A.7.93","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        }),
        /** 首页宝箱 */
        index: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/index`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 基础信息 */
        basicInfo: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/role/basicInfo`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        UserGame: {
          url: `${host}binding/api/getUserGameRolesByCookie`,
          query: "game_biz=nap_cn"
        },
        /** 探索 */
        explore: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/exploration_detail`,
          query: `uid=${this.uid}&region=${this.server}`
        },
        /** 角色 */
        character: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/avatar/basic`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 角色详情 */
        characterDetail: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/avatar/info`,
          query: `id_list%5B%5D=${data.id}&need_wiki=true&server=${this.server}&role_id=${this.uid}`
        },
        /** 危局强袭战 */
        mem_detail: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/mem_detail`,
          query: `uid=${this.uid}&region=${this.server}&schedule_type=${data.schedule_type}`
        },
        /**  式舆防卫战 */
        challenge: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/challenge`,
          query: `role_id=${this.uid}&server=${this.server}&schedule_type=${data.schedule_type}`
        },
        /**  拟真塵战试炼 */
        tower: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/climbing_tower_detail`,
          query: `uid=${this.uid}&region=${this.server}`
        },
        /**  临界推演楼层 */
        void_info: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/void_front_battle_abstract_info`,
          query: `uid=${this.uid}&region=${this.server}`
        },
        /**  临界推演 */
        voidFront: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/void_front_battle_detail`,
          query: `uid=${this.uid}&region=${this.server}&void_front_id=${data.void_front_id}`
        },
        /**  绳网月报 */
        ledger: {
          url: `${host}event/nap_ledger/month_info`,
          query: `uid=${this.uid}&region=${this.server}&month=${data.month}`
        },
        /** 树脂 */
        dailyNote: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/note`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 邦布 */
        buddy: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/buddy/info`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 抽卡记录 */
        AuthKey: {
          url: `${host}binding/api/genAuthKey`,
          body: { auth_appid: data.auth_appid || "webview_gacha", game_biz: data.game_biz || "nap_cn", game_uid: this.uid, region: this.server }
        },
        /** 使用兑换码 目前仅限国际服,来自于国服的uid请求已在mysInfo.js的init方法提前拦截 */
        useCdk: {
          url: "https://public-operation-nap.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl",
          query: `cdkey=${data.cdk}&game_biz=nap_global&lang=zh-cn&region=${this.server}&t=${new Date().getTime() + ""}&uid=${this.uid}`
        }
      },
      wd: {
        ...(["cn_prod_gf01", "cn_prod_bb01", "cn_prod_mix01"].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=nxx_cn&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_cn",
              bbs_device_id: `${this.uuid}`,
              device_fp: "38d802d62e7fb",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"12","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"58.2.A.7.93","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `${["tw_prod_wd01"].includes(this.server) ? "game_biz=nxx_tw" : "game_biz=nxx_global"}&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_oversea",
              device_fp: "38d7f469c1319",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"12","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"58.2.A.7.93","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        }),
        /** 首页 */
        index: {
          url: `${hostRecord}game_record/app/nxx/api/index`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 思绪 */
        card: {
          url: `${hostRecord}game_record/app/nxx/api/card`,
          query: `role_id=${this.uid}&server=${this.server}&uid=${this.ltuid}&avatar_id=1`
        }
      },
      bh3: {
        bh3_cn: {
          url: "https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie",
          query: "game_biz=bh3_cn"
        },
        bh3_global: {
          url: "https://sg-public-api.hoyolab.com/binding/api/getUserGameRolesByCookie",
          query: "game_biz=bh3_global"
        },
        ...(["bh3_cn"].includes(this.biz) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=bh3_cn&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_cn",
              bbs_device_id: `${this.uuid}`,
              device_fp: "38d802d62e7fb",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"12","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"58.2.A.7.93","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=bh3_global&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_oversea",
              device_fp: "38d7f469c1319",
              device_id: "d927172613ac7594",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"12","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"58.2.A.7.93","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        }),
        /** 首页 */
        index: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/index`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 体力 */
        dailyNote: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/note`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 角色详情 */
        Character: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/characters`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 往世乐土 */
        godWar: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/godWar`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 记忆战场 */
        battleField: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/battleFieldReport`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 深渊战报 */
        newAbyss: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/newAbyssReport`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        oldAbyss: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/oldAbyssReport`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 一周成绩单 */
        weekly: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/weeklyReport`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 水晶统计 */
        ledger: {
          url: "https://api.mihoyo.com/bh3-weekly_finance/api/index",
          query: `game_biz=bh3_cn&bind_uid=${this.uid}&bind_region=${this.server}`
        },
        /** 水晶上月统计 */
        ledger_lastMonth: {
          url: "https://api.mihoyo.com/bh3-weekly_finance/api/getLastMonthInfo",
          query: `game_biz=bh3_cn&bind_uid=${this.uid}&bind_region=${this.server}`
        }
      },
      bh2: {
        bh2_cn: {
          url: "https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie",
          query: "game_biz=bh2_cn"
        },
        UserGame: {
          url: `${host}binding/api/getUserGameRolesByCookie`,
          query: `game_biz=bh2_cn&region=${this.server}&game_uid=${this.uid}`
        },
        /** 体力接口fp参数用于避开验证码 */
        getFp: {
          url: `${hostPublicData}device-fp/api/getFp`,
          body: {
            app_name: "bbs_cn",
            bbs_device_id: `${this.uuid}`,
            device_fp: "38d802d62e7fb",
            device_id: "d927172613ac7594",
            ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1 II","productName":"XQ-AT52","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"XQ-AT52","brand":"Sony","hardware":"qcom","deviceType":"XQ-AT52","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"Sony\/XQ-AT52\/XQ-AT52:12\/58.2.A.7.93\/058002A007009304241360111:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"12","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"58.2.A.7.93","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"kona"}`,
            platform: "2",
            seed_id: `${this.uuid}`,
            seed_time: new Date().getTime() + ""
          }
        }
      }
    }

    if (this.server.startsWith("os")) {
      urlMap.gs.detail.url = "https://sg-public-api.hoyolab.com/event/calculateos/sync/avatar/detail"/** 角色天赋详情 */
      urlMap.gs.detail.query = `lang=zh-cn&uid=${this.uid}&region=${this.server}&avatar_id=${data.avatar_id}`
      urlMap.gs.avatarSkill.url = "https://sg-public-api.hoyolab.com/event/calculateos/avatar/skill_list"/** 查询未持有的角色天赋 */
      urlMap.gs.avatarSkill.query = `lang=zh-cn&avatar_id=${data.avatar_id}`
      urlMap.gs.compute.url = "https://sg-public-api.hoyolab.com/event/calculateos/compute"/** 已支持养成计算 */
      urlMap.gs.blueprint.url = "https://sg-public-api.hoyolab.com/event/calculateos/furniture/blueprint"
      urlMap.gs.blueprint.query = `share_code=${data.share_code}&region=${this.server}&lang=zh-cn`
      urlMap.gs.blueprintCompute.url = "https://sg-public-api.hoyolab.com/event/calculateos/furniture/compute"
      urlMap.gs.blueprintCompute.body = { lang: "zh-cn", ...data.body }
      urlMap.gs.ledger.url = "https://sg-hk4e-api.hoyolab.com/event/ysledgeros/month_info"/** 支持了国际服札记 */
      urlMap.gs.ledger.query = `lang=zh-cn&month=${data.month}&uid=${this.uid}&region=${this.server}`
    }

    if (this.game == "zzz" && /_us|_eu|_jp|_sg/.test(this.server)) {
      urlMap.zzz.index.url = "https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/index"/** 首页宝箱 */
      urlMap.zzz.index.query = `lang=zh-cn&role_id=${this.uid}&server=${this.server}`
      urlMap.zzz.character.url = "https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/avatar/basic"/** 角色详情 */
      urlMap.zzz.character.query = `lang=zh-cn&role_id=${this.uid}&server=${this.server}`
      urlMap.zzz.dailyNote.url = "https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/note"/** 树脂 */
      urlMap.zzz.dailyNote.query = `role_id=${this.uid}&server=${this.server}`
      urlMap.zzz.buddy.url = "https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/buddy/info"/** 邦布 */
      urlMap.zzz.buddy.query = `lang=zh-cn&role_id=${this.uid}&server=${this.server}`
    }
    return urlMap[this.game]
  }
}
