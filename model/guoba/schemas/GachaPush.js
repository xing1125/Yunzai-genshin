export default [
  {
    label: "原神模拟抽卡",
    component: "SOFT_GROUP_BEGIN"
  },
  {
    component: "Divider",
    label: "抽卡配置"
  },
  {
    field: "Config.gsGacha",
    label: "模拟抽卡",
    bottomHelpMessage: "是否开启模拟抽卡功能",
    component: "Switch"
  },
  {
    field: "GachaPush.count",
    label: "每日抽卡数",
    component: "InputNumber",
    componentProps: {
      placeholder: "请输入每日抽卡数",
      addonAfter: "次"
    }
  },
  {
    field: "GachaPush.delMsg",
    label: "自动撤回0-120秒",
    bottomHelpMessage: "0不撤回",
    component: "InputNumber",
    componentProps: {
      placeholder: "请输入撤回秒数",
      addonAfter: "秒"
    }
  },
  {
    field: "GachaPush.LimitSeparate",
    bottomHelpMessage: "角色池，武器池是否分开计算抽卡数",
    label: "分开计算",
    component: "Select",
    componentProps: {
      options: [
        { label: "不分开", value: 0 },
        { label: "分开", value: 1 }
      ],
      placeholder: "请设置角色池，武器池是否分开计算"
    }
  },
  {
    component: "Divider",
    label: "卡池角色"
  },
  // {
  //   field: "GachaPool.pool3",
  //   bottomHelpMessage: "#模拟抽卡3(请使用角色全名)",
  //   label: "第三卡池角色",
  //   component: "Input"
  // },
  {
    field: "GachaPool.pool4",
    bottomHelpMessage: "#模拟抽卡4(请使用角色全名)",
    label: "第四卡池角色",
    component: "Input"
  }
]