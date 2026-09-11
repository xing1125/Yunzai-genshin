export default [
  {
    label: "米游社配置",
    component: "SOFT_GROUP_BEGIN"
  },
  {
    component: "Divider",
    label: "米游社帖子配置"
  },
  {
    field: "MysSet.mysUrlParse",
    label: "米游社链接自动解析",
    bottomHelpMessage: "关闭后将不再自动解析米游社文章链接",
    component: "Switch"
  },
  {
    field: "MysSet.commentSort",
    bottomHelpMessage: "帖子评论排序",
    label: "帖子评论排序",
    component: "Select",
    componentProps: {
      options: [
        { label: "热门", value: 3 },
        { label: "最新", value: 2 },
        { label: "最早", value: 1 }
      ],
      placeholder: "请设置帖子评论排序"
    }
  },
  {
    field: "MysSet.commentMaxNum",
    label: "帖子评论最多展示条数",
    component: "InputNumber",
    componentProps: {
      placeholder: "请输入帖子评论最大展示条数",
      addonAfter: "条"
    }
  },
  {
    component: "Divider",
    label: "米游社公告资讯活动推送设置"
  },
  {
    field: "MysPush.pushTime",
    label: "米游社公告推送间隔",
    helpMessage: "修改后需重启生效",
    component: "EasyCron",
    required: false
  },
  {
    field: "MysPush.maxNum",
    label: "最多同时推送",
    component: "InputNumber",
    componentProps: {
      placeholder: "请输入最多同时推送条数",
      addonAfter: "条"
    }
  },
  {
    field: "MysSet.newsPermission",
    bottomHelpMessage: "修改后需重启生效",
    label: "米游社公告资讯活动推送权限",
    component: "Select",
    componentProps: {
      options: [
        { label: "仅主人", value: "master" },
        { label: "仅群主", value: "owner" },
        { label: "群管理", value: "admin" },
        { label: "所有人", value: "all" }
      ],
      placeholder: "请设置米游社公告资讯活动推送权限"
    }
  },
  {
    field: "MysSet.activityPermission",
    bottomHelpMessage: "修改后需重启生效",
    label: "原星绝活动到期提醒推送权限",
    component: "Select",
    componentProps: {
      options: [
        { label: "仅主人", value: "master" },
        { label: "仅群主", value: "owner" },
        { label: "群管理", value: "admin" },
        { label: "所有人", value: "all" }
      ],
      placeholder: "请设置原神星铁绝区零活动到期提醒推送权限"
    }
  },
  {
    field: "MysPush.ActivityBanWord",
    label: "活动到期提醒包含关键字不推送",
    component: "Input",
    componentProps: {
      placeholder: "请输入"
    }
  },
  {
    component: "Divider",
    label: "原神推送设置"
  },
  // {
  //   field: "MysPush.gsannounceGroup",
  //   label: "公告推送群",
  //   componentProps: {
  //     placeholder: "点击添加原神活动推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  // {
  //   field: "MysPush.gsinfoGroup",
  //   label: "资讯推送群",
  //   componentProps: {
  //     placeholder: "点击添加原神活动推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  // {
  //   field: "MysPush.gsActivityPush",
  //   label: "活动推送群",
  //   componentProps: {
  //     placeholder: "点击添加原神活动推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  {
    field: "MysPush.banWord.gs",
    label: "包含关键字不推送",
    component: "Input",
    componentProps: {
      placeholder: "请输入"
    }
  },
  {
    component: "Divider",
    label: "崩坏：星穹铁道推送设置"
  },
  // {
  //   field: "MysPush.srannounceGroup",
  //   label: "公告推送群",
  //   componentProps: {
  //     placeholder: "点击添加星铁公告推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  // {
  //   field: "MysPush.srinfoGroup",
  //   label: "资讯推送群",
  //   componentProps: {
  //     placeholder: "点击添加星铁活动推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  // {
  //   field: "MysPush.srActivityPush",
  //   label: "活动推送群",
  //   componentProps: {
  //     placeholder: "点击添加星铁活动推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  {
    field: "MysPush.banWord.sr",
    label: "包含关键字不推送",
    component: "Input",
    componentProps: {
      placeholder: "请输入"
    }
  },
  {
    component: "Divider",
    label: "绝区零推送设置"
  },
  // {
  //   field: "MysPush.zzzannounceGroup",
  //   label: "公告推送群",
  //   componentProps: {
  //     placeholder: "点击添加绝区零公告推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  // {
  //   field: "MysPush.zzzinfoGroup",
  //   label: "资讯推送群",
  //   componentProps: {
  //     placeholder: "点击添加绝区零活动推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  {
    field: "MysPush.banWord.zzz",
    label: "包含关键字不推送",
    component: "Input",
    componentProps: {
      placeholder: "请输入"
    }
  },
  {
    component: "Divider",
    label: "崩坏三推送设置"
  },
  // {
  //   field: "MysPush.bbbannounceGroup",
  //   label: "公告推送群",
  //   componentProps: {
  //     placeholder: "点击添加崩三公告推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  // {
  //   field: "MysPush.bbbinfoGroup",
  //   label: "资讯推送群",
  //   componentProps: {
  //     placeholder: "点击添加崩三资讯推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  {
    field: "MysPush.banWord.bbb",
    label: "包含关键字不推送",
    component: "Input",
    componentProps: {
      placeholder: "请输入"
    }
  },
  {
    component: "Divider",
    label: "崩坏二推送设置"
  },
  // {
  //   field: "MysPush.bbannounceGroup",
  //   label: "公告推送群",
  //   componentProps: {
  //     placeholder: "点击添加崩二公告推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  // {
  //   field: "MysPush.bbinfoGroup",
  //   label: "资讯推送群",
  //   componentProps: {
  //     placeholder: "点击添加崩二资讯推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  {
    field: "MysPush.banWord.bb",
    label: "包含关键字不推送",
    component: "Input",
    componentProps: {
      placeholder: "请输入"
    }
  },
  {
    component: "Divider",
    label: "未定事件簿推送设置"
  },
  // {
  //   field: "MysPush.wdannounceGroup",
  //   label: "公告推送群",
  //   componentProps: {
  //     placeholder: "点击添加未定公告推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  // {
  //   field: "MysPush.wdinfoGroup",
  //   label: "资讯推送群",
  //   componentProps: {
  //     placeholder: "点击添加未定资讯推送群"
  //   },
  //   component: "GSelectGroup"
  // },
  {
    field: "MysPush.banWord.wd",
    label: "包含关键字不推送",
    component: "Input",
    componentProps: {
      placeholder: "请输入"
    }
  }
]
