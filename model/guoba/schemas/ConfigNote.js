export default [
  {
    label: "体力配置",
    component: "SOFT_GROUP_BEGIN"
  },
  {
    component: "Divider",
    label: "体力设置"
  },
  {
    field: "ConfigNote.Note",
    label: "是否开启体力查询",
    required: false,
    bottomHelpMessage: "是否开启本插件小组件体力查询(需重启生效)",
    component: "Switch"
  },
  {
    field: "ConfigNote.forward",
    label: "合并转发",
    bottomHelpMessage: "超过此条数消息将合并转发为合并转发",
    component: "InputNumber",
    required: false,
    componentProps: {
      addonAfter: "条"
    }
  }
]