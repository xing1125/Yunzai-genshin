import { Data } from "#fansky"

let Render = {
  /**
     *  beforeRender: 渲染之前对数据进行处理
     */
  async render (e, path, data) {
    const plugin = await Data.readJSON("package.json")
    const layoutPath = process.cwd() + "/plugins/genshin/resources/Genshin/html/common/layout/"
    return e.runtime.render("genshin", path, data, {
      beforeRender ({ data }) {
        data.pluVersion = plugin.version
        return {
          ...data,
          sys: {
            scale: "style=transform:scale(2.0)"
          },
          defaultLayout: layoutPath + "default.html",
          copyright: `${data.copyright}& ${plugin.name}<span class="version">${plugin.version}</span>`
        }
      }
    })
  }
}

export default Render
