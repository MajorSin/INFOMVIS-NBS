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

async function boot_similarity(jsFile) {
  await injectHtml([
    {
      element: "#filtersMount",
      url: "./components/filters/filters.html",
      styleSheet: "./components/filters/filters.css",
      jsFile: "./components/filters/filters.js",
    },
    {
      element: "#navMount",
      url: "./components/navbar/navbar.html",
      styleSheet: "./components/navbar/navbar.css",
    },
    {
      element: "#mapSimilarityBandsMount",
      url: "./components/mapSimilarityBands/mapSimilarityBands.html",
      styleSheet: "./components/mapSimilarityBands/mapSimilarityBands.css",
      jsFile: "./components/mapSimilarityBands/mapSimilarityBands.js",
    },
    {
      element: "#tableMount",
      url: "./components/table/table.html",
      styleSheet: "./components/table/table.css",
      jsFile: "./components/table/table.js",
    },
    {
      element: "#kpiMount",
      url: "./components/kpi/kpi.html",
      styleSheet: "./components/kpi/kpi.css",
      jsFile: "./components/kpi/kpi.js",
    },
  ])

  const script = document.createElement("script")
  script.src = jsFile
  document.body.appendChild(script)
}

async function boot(jsFile) {
  await injectHtml([
    {
      element: "#navMount",
      url: "./components/navbar/navbar.html",
      styleSheet: "./components/navbar/navbar.css",
    },
    {
      element: "#filtersMount",
      url: "./components/filters/filters.html",
      styleSheet: "./components/filters/filters.css",
      jsFile: "./components/filters/filters.js",
    },
    {
      element: "#kpiMount",
      url: "./components/kpi/kpi.html",
      styleSheet: "./components/kpi/kpi.css",
      jsFile: "./components/kpi/kpi.js",
    },
    {
      element: "#lineChartMount",
      url: "./components/lineChartPopout/lineChartPopout.html",
      styleSheet: "./components/lineChartPopout/lineChartPopout.css",
      jsFile: "./components/lineChartPopout/lineChartPopout.js",
    },
    {
      element: "#projectsMap",
      url: "./components/projectsMap/projectsMap.html",
      styleSheet: "./components/projectsMap/projectsMap.css",
      jsFile: "./components/projectsMap/projectsMap.js",
    },
    {
      element: "#tableMount",
      url: "./components/table/table.html",
      styleSheet: "./components/table/table.css",
      jsFile: "./components/table/table.js",
    },
    {
      element: "#fundingSourcesMount",
      url: "./components/fundingSources/fundingSources.html",
      styleSheet: "./components/fundingSources/fundingSources.css",
      jsFile: "./components/fundingSources/fundingSources.js",
    },
    {
      element: "#compareToolbarMount",
      url: "./components/compareToolbar/compareToolbar.html",
      styleSheet: "./components/compareToolbar/compareToolbar.css",
      jsFile: "./components/compareToolbar/compareToolbar.js",
    },
    {
      element: "#compareTableMount",
      url: "./components/compareTable/compareTable.html",
      styleSheet: "./components/compareTable/compareTable.css",
      jsFile: "./components/compareTable/compareTable.js",
    },
  ])

  const script = document.createElement("script")
  script.src = jsFile
  document.body.appendChild(script)
}

async function callBoot(jsFile, currentPage) {
  if (currentPage === "similarity_band") {
    await boot_similarity(jsFile).catch((err) => {
      console.error(err)
      document.body.insertAdjacentHTML(
        "beforeend",
        `<pre style="padding:12px; border:1px solid #ccc; white-space:pre-wrap;">Failed to boot app:${err.message}</pre>`,
      )
    })
  } else {
    await boot(jsFile).catch((err) => {
      console.error(err)
      document.body.insertAdjacentHTML(
        "beforeend",
        `<pre style="padding:12px; border:1px solid #ccc; white-space:pre-wrap;">Failed to boot app:${err.message}</pre>`,
      )
    })
  }

  document.getElementById(`${currentPage}Link`).style["font-weight"] = "700"
}

function parseCost(value) {
  if (!value || value.toLowerCase() === "unknown") return null

  const normalized = value
    .toLowerCase()
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim()

  const numbers = normalized.match(/\d+/g)?.map(Number) ?? []

  return numbers.length == 2
    ? d3.mean(numbers)
    : numbers.length == 1
      ? numbers[0]
      : null
}
