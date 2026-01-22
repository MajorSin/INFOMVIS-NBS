async function injectHtml(selectors) {
  const head = document.getElementsByTagName("head")[0]
  const body = document.getElementsByTagName("body")[0]

  await Promise.all(
    selectors.map(async (selector) => {
      if (selector.styleSheet != null) {
        let link = document.createElement("link")
        link.rel = "stylesheet"
        link.type = "text/css"
        link.href = selector.styleSheet
        link.media = "all"
        head.appendChild(link)
      }

      if (selector.jsFile != null) {
        let script = document.createElement("script")
        script.src = selector.jsFile
        script.type = "text/javascript"
        body.appendChild(script)
      }

      const mount = document.querySelector(selector.element)
      if (!mount) throw new Error(`Mount not found: ${selector.element}`)

      const res = await fetch(selector.url, { cache: "no-cache" })
      if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`)

      mount.innerHTML = await res.text()
    }),
  )
}

async function boot(jsFile, currentPage) {
  await injectHtml(
    currentPage == "similarity_band"
      ? [...baseComponents, components.mapSimilarity]
      : [
          ...baseComponents,
          components.lineChart,
          components.fundingSources,
          components.projectsMap,
        ],
  )

  const script = document.createElement("script")
  script.src = jsFile
  document.body.appendChild(script)

  document.getElementById(`${currentPage}Link`).style["font-weight"] = "700"
}

const components = {
  filters: {
    element: "#filtersMount",
    url: "./components/filters/filters.html",
    styleSheet: "./components/filters/filters.css",
    jsFile: "./components/filters/filters.js",
  },
  navbar: {
    element: "#navMount",
    url: "./components/navbar/navbar.html",
    styleSheet: "./components/navbar/navbar.css",
  },
  mapSimilarity: {
    element: "#mapSimilarityBandsMount",
    url: "./components/mapSimilarityBands/mapSimilarityBands.html",
    styleSheet: "./components/mapSimilarityBands/mapSimilarityBands.css",
    jsFile: "./components/mapSimilarityBands/mapSimilarityBands.js",
  },
  table: {
    element: "#tableMount",
    url: "./components/table/table.html",
    styleSheet: "./components/table/table.css",
    jsFile: "./components/table/table.js",
  },
  kpi: {
    element: "#kpiMount",
    url: "./components/kpi/kpi.html",
    styleSheet: "./components/kpi/kpi.css",
    jsFile: "./components/kpi/kpi.js",
  },
  lineChart: {
    element: "#lineChartMount",
    url: "./components/lineChartPopout/lineChartPopout.html",
    styleSheet: "./components/lineChartPopout/lineChartPopout.css",
    jsFile: "./components/lineChartPopout/lineChartPopout.js",
  },
  fundingSources: {
    element: "#fundingSourcesMount",
    url: "./components/fundingSources/fundingSources.html",
    styleSheet: "./components/fundingSources/fundingSources.css",
    jsFile: "./components/fundingSources/fundingSources.js",
  },
  compareToolbar: {
    element: "#compareToolbarMount",
    url: "./components/compareToolbar/compareToolbar.html",
    styleSheet: "./components/compareToolbar/compareToolbar.css",
    jsFile: "./components/compareToolbar/compareToolbar.js",
  },
  compareTable: {
    element: "#compareTableMount",
    url: "./components/compareTable/compareTable.html",
    styleSheet: "./components/compareTable/compareTable.css",
    jsFile: "./components/compareTable/compareTable.js",
  },
  projectsMap: {
    element: "#projectsMap",
    url: "./components/projectsMap/projectsMap.html",
    styleSheet: "./components/projectsMap/projectsMap.css",
    jsFile: "./components/projectsMap/projectsMap.js",
  },
}

const baseComponents = [
  components.filters,
  components.navbar,
  components.table,
  components.kpi,
  components.compareTable,
  components.compareToolbar,
]
