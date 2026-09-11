import crypto from "crypto"
/**
 * 整合接口用于查询数据
 * 方便后续用于解耦
 * 临时处理，后续大概率重写 主要原因（懒）
 */
export default class {
  /**
   *
   * @param {用户uid} uid
   * @param {区服} server
   * @param {是否为星穹铁道或其他游戏? type(bool or string)} isSr
   */
  constructor (uid, server, isSr = false) {
    this.uid = uid
    this.isSr = isSr
    this.server = server
    this.game = "gs"
    if (isSr) this.game = "sr"
    if (typeof isSr !== "boolean") {
      this.game = isSr
    }
    this.uuid = crypto.randomUUID()
  }

  getUrlMap = (data = {}) => {
    let urlMap = {}
    let host = "https://api-takumi.mihoyo.com/"
    let host_nap = "https://act-nap-api.mihoyo.com/"
    let hostNew = "https://api-takumi.miyoushe.com/"
    let hostRecord = "https://api-takumi-record.mihoyo.com/"
    let hostPublicData = "https://public-data-api.mihoyo.com/"

    let all = {
      User: {
        url: `${hostNew}binding/api/getUserGameRolesByStoken`,
        types: "widget"
      },
      GetActionTicket: {
        url: `${hostNew}auth/api/getActionTicketBySToken`,
        query: `uid=${data.ltuid}&action_type=game_role`,
        types: "widget"
      },
      ChangeGameRole: {
        url: `${hostNew}binding/api/changeGameRoleByDefault`,
        body: {
          action_ticket: data.action_ticket,
          game_biz: data.game_biz,
          game_uid: data.game_uid,
          region: data.region,
          t: Math.round(new Date().getTime() / 1000)
        },
        trpes: "role"
      },
      getFp: {
        url: `${hostPublicData}device-fp/api/getFp`,
        body: {
          app_name: "bbs_cn",
          bbs_device_id: `${this.uuid}`,
          device_fp: "38d7faa51d2b6",
          device_id: "35315696b7071100",
          ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"55.2.A.4.332","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
          platform: "2",
          seed_id: `${this.uuid}`,
          seed_time: new Date().getTime() + ""
        }
      }
    }
    if (["cn_gf01", "cn_qd01", "prod_gf_cn", "prod_qd_cn"].includes(this.server) || ["all", "bbs", "bh3", "weibo"].includes(this.game)) {
      urlMap = {
        gs: {
          UserGameInfo: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: "game_biz=hk4e_cn",
            types: "sign"
          },
          DailyNote: {
            url: `${hostRecord}game_record/app/genshin/api/dailyNote`,
            query: `role_id=${this.uid}&server=${this.server}`
          },
          Widget: {
            url: `${hostRecord}game_record/genshin/aapi/widget/v2`,
            types: "widget"
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_cn",
              bbs_device_id: `${this.uuid}`,
              device_fp: "38d7faa51d2b6",
              device_id: "35315696b7071100",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"55.2.A.4.332","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        },
        sr: {
          UserGameInfo: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: "game_biz=hkrpg_cn",
            types: "sign"
          },
          DailyNote: {
            url: `${hostRecord}game_record/app/hkrpg/api/note`,
            query: `role_id=${this.uid}&server=${this.server}`
          },
          Widget: {
            url: `${hostRecord}game_record/app/hkrpg/aapi/widget`,
            types: "widget"
          },
          Index: {
            url: `${hostRecord}game_record/app/hkrpg/api/index`,
            query: `role_id=${this.uid}&server=${this.server}`
          },
          UserGame: {
            url: `${host}common/badge/v1/login/account`,
            body: { uid: this.uid, region: this.server, lang: "zh-cn", game_biz: "hkrpg_cn" }
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_cn",
              bbs_device_id: `${this.uuid}`,
              device_fp: "38d7faa51d2b6",
              device_id: "35315696b7071100",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"55.2.A.4.332","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        },
        bh3: {
          UserGameInfo: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: "game_biz=bh3_cn",
            types: "sign"
          }
        },
        zzz: {
          UserGameInfo: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: "game_biz=hkrpg_cn",
            types: "sign"
          },
          dailyNote: {
            url: `${hostRecord}event/game_record_zzz/api/zzz/note`,
            query: `role_id=${this.uid}&server=${this.server}`
          },
          sign_info: {
            url: `${host_nap}event/luna/zzz/info`,
            query: `lang=zh-cn&act_id=e202406242138391&region=${this.server}&uid=${this.uid}`,
            types: "signDS"
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_cn",
              bbs_device_id: `${this.uuid}`,
              device_fp: "38d7faa51d2b6",
              device_id: "35315696b7071100",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"55.2.A.4.332","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          }
        }
      }
    } else {
      let host = "https://sg-public-api.hoyolab.com/"
      let host_nap = "https://sg-act-nap-api.hoyolab.com/"
      let hostRecord = "https://bbs-api-os.hoyolab.com/"
      let hostPublicData = "https://sg-public-data-api.hoyoverse.com/"
      urlMap = {
        gs: {
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_oversea",
              device_fp: "38d7f2352506c",
              device_id: "35315696b7071100",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96715","appUpdateTimeDiff":1722171191009,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"11","vendor":"unknown","accelerometer":"-0.22372891x-1.5332011x9.802497","sdRemain":96571,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"107433","magnetometer":"3.73125x-10.668751x3.7687502","display":"55.2.A.4.332","appInstallTimeDiff":1716489549794,"packageVersion":"2.20.2","gyroscope":"0.18386503x-0.006413896x-0.008857286","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          },
          DailyNote: {
            url: `${hostRecord}game_record/genshin/api/dailyNote`,
            query: `role_id=${this.uid}&server=${this.server}`
          }
        },
        sr: {
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_oversea",
              device_fp: "38d7f2352506c",
              device_id: "35315696b7071100",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96715","appUpdateTimeDiff":1722171191009,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"11","vendor":"unknown","accelerometer":"-0.22372891x-1.5332011x9.802497","sdRemain":96571,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"107433","magnetometer":"3.73125x-10.668751x3.7687502","display":"55.2.A.4.332","appInstallTimeDiff":1716489549794,"packageVersion":"2.20.2","gyroscope":"0.18386503x-0.006413896x-0.008857286","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          },
          DailyNote: {
            url: `${hostRecord}game_record/hkrpg/api/note`,
            query: `role_id=${this.uid}&server=${this.server}`
          },
          Index: {
            url: `${hostRecord}game_record/hkrpg/api/index`,
            query: `role_id=${this.uid}&server=${this.server}`,
            types: "DS"
          }
        },
        zzz: {
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: "bbs_oversea",
              device_fp: "38d7f2352506c",
              device_id: "35315696b7071100",
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96715","appUpdateTimeDiff":1722171191009,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"11","vendor":"unknown","accelerometer":"-0.22372891x-1.5332011x9.802497","sdRemain":96571,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"107433","magnetometer":"3.73125x-10.668751x3.7687502","display":"55.2.A.4.332","appInstallTimeDiff":1716489549794,"packageVersion":"2.20.2","gyroscope":"0.18386503x-0.006413896x-0.008857286","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: "2",
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ""
            }
          },
          dailyNote: {
            url: `${host_nap}event/game_record_zzz/api/zzz/note`,
            query: `role_id=${this.uid}&server=${this.server}`
          },
          sign_info: {
            url: `${host_nap}event/luna/zzz/os/info`,
            query: "lang=zh-cn&act_id=e202406031448091",
            types: "signDS"
          }
        }
      }
    }

    return { ...all, ...urlMap[this.game] }
  }
}