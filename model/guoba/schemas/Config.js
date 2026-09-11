export default [
  {
    label: "基础配置",
    component: "SOFT_GROUP_BEGIN"
  },
  {
    component: "Divider",
    label: "插件设置"
  },
  {
    field: "Config.Gacha",
    label: "抽卡记录",
    bottomHelpMessage: "是否覆盖miao-plugin#抽卡记录(需重启生效)",
    component: "Select",
    required: true,
    componentProps: {
      options: [
        { label: "不覆盖", value: 300 },
        { label: "覆盖", value: 30 }
      ],
      placeholder: "请输入"
    }
  },
  {
    field: "Config.mrRole",
    label: "#查委托",
    required: true,
    bottomHelpMessage: "查委托是否必须携带#(需重启生效)",
    component: "Switch"
  },
  {
    field: "Config.gsAbyss",
    label: "深渊",
    required: true,
    bottomHelpMessage: "是否覆盖miao-plugin#深渊",
    component: "Switch"
  },
  {
    field: "Config.gsCombat",
    label: "幻想真境剧诗",
    required: true,
    bottomHelpMessage: "是否覆盖miao-plugin#幻想真境剧诗",
    component: "Switch"
  },
  {
    field: "Config.gsChallenge",
    label: "幽境危战",
    required: true,
    bottomHelpMessage: "是否覆盖miao-plugin#幽境危战",
    component: "Switch"
  },
  {
    field: "Config.gsRole",
    label: "#角色 #角色列表",
    required: true,
    bottomHelpMessage: "是否覆盖miao-plugin#角色 #角色列表",
    component: "Switch"
  },
  {
    component: "Divider",
    label: "命令前缀设置"
  },
  {
    field: "Config.gsPrefix",
    label: "原神命令前缀",
    bottomHelpMessage: "多个前缀用|分隔，需重启生效，如有早有核心如gsuid请删除gs命令前缀，请勿修改*符号",
    component: "Input",
    componentProps: {
      placeholder: "请输入原神命令前缀"
    }
  },
  {
    field: "Config.srPrefix",
    label: "星铁命令前缀",
    bottomHelpMessage: "多个前缀用|分隔，需重启生效，请勿修改符号",
    component: "Input",
    componentProps: {
      placeholder: "请输入星铁命令前缀"
    }
  },
  {
    field: "Config.zzzPrefix",
    label: "绝区零命令前缀",
    bottomHelpMessage: "多个前缀用|分隔，需重启生效，请勿修改符号",
    component: "Input",
    componentProps: {
      placeholder: "请输入绝区零命令前缀"
    }
  },
  {
    field: "Config.wdPrefix",
    label: "未定命令前缀",
    bottomHelpMessage: "多个前缀用|分隔，需重启生效，请勿修改符号",
    component: "Input",
    componentProps: {
      placeholder: "请输入未定命令前缀"
    }
  },
  {
    field: "Config.bh3Prefix",
    label: "崩坏三命令前缀",
    bottomHelpMessage: "多个前缀用|分隔，需重启生效，请勿修改符号",
    component: "Input",
    componentProps: {
      placeholder: "请输入崩坏三命令前缀"
    }
  },
  {
    field: "Config.bh2Prefix",
    label: "崩坏二命令前缀",
    bottomHelpMessage: "多个前缀用|分隔，需重启生效，请勿修改符号",
    component: "Input",
    componentProps: {
      placeholder: "请输入崩坏二命令前缀"
    }
  },
  {
    field: "UIDList.backgroundimage",
    label: "UID列表背景图设置",
    bottomHelpMessage: "如选择自定义请在云崽根目录data/bg下放置图片并修改为image.png命名或在plugins/genshin/resources/Mys/html/user/common.css中302行修改",
    component: "Select",
    required: true,
    componentProps: {
      options: [
        { label: "自定义", value: "自定义" },
        { label: "随机", value: "随机" },
        { label: "火", value: "火" },
        { label: "水", value: "水" },
        { label: "雷", value: "雷" },
        { label: "冰", value: "冰" },
        { label: "风", value: "风" },
        { label: "草", value: "草" },
        { label: "岩", value: "岩" },
        { label: "量子", value: "量子" },
        { label: "虚数", value: "虚数" },
        { label: "物理", value: "物理" }
      ],
      placeholder: "请输入UID背景图属性"
    }
  },
  {
    component: "Divider",
    label: "米游社设置"
  },
  {
    field: "MysSet.defaultSource",
    label: "原神攻略图来源",
    component: "Select",
    required: true,
    componentProps: {
      options: [
        { label: "西风驿站", value: 1 },
        { label: "原神观测枢", value: 2 },
        { label: "派蒙喵喵屋", value: 3 },
        { label: "OH是姜姜呀", value: 4 }
      ],
      placeholder: "请添加原神攻略图来源"
    }
  },
  {
    field: "MysSet.allowUseCookie",
    label: "公共查询用户ck",
    component: "Select",
    required: true,
    componentProps: {
      options: [
        { label: "不使用", value: 0 },
        { label: "使用", value: 1 }
      ],
      placeholder: "请添加公共查询是否使用用户ck"
    }
  },
  {
    field: "MysSet.abbrSetAuth",
    label: "角色别名设置权限",
    component: "Select",
    required: true,
    componentProps: {
      options: [
        { label: "所有群员都可以添加", value: 0 },
        { label: "群管理员才能添加", value: 1 },
        { label: "只有主人才能添加", value: 2 }
      ],
      placeholder: "请添加别名设置权限"
    }
  },
  {
    component: "Divider",
    label: "用户配置"
  },
  {
    field: "CookiePush",
    label: "公共查询ck",
    bottomHelpMessage: "暂不可用",
    component: "Input",
    componentProps: {
      placeholder: "请输入"
    }
  }
]
