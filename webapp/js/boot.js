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

// TODO: Fix links
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
      element: "#resultsMount",
      url: "./components/results/results.html",
      styleSheet: "./components/results/results.css",
      jsFile: "./components/results/results.js",
    },
    {
      element: "#kpisMount",
      url: "./components/kpis/kpis.html",
      styleSheet: "./components/kpis/kpis.css",
      jsFile: "./components/kpis/kpis.js",
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
      element: "#kpisMount",
      url: "./components/kpis/kpis.html",
      styleSheet: "./components/kpis/kpis.css",
      jsFile: "./components/kpis/kpis.js",
    },
    {
      element: "#mapMount",
      url: "./components/mapFilteredCities/mapFilteredCities.html",
      styleSheet: "./components/mapFilteredCities/mapFilteredCities.css",
      jsFile: "./components/mapFilteredCities/mapFilteredCities.js",
    },
    {
      element: "#resultsMount",
      url: "./components/results/results.html",
      styleSheet: "./components/results/results.css",
      jsFile: "./components/results/results.js",
    },
    {
      element: "#fundingMount",
      url: "./components/funding/funding.html",
      styleSheet: "./components/funding/funding.css",
      jsFile: "./components/funding/funding.js",
    },
    {
      element: "#compareToolbarMount",
      url: "./components/compareToolbar/compareToolbar.html",
      styleSheet: "./components/compareToolbar/compareToolbar.css",
      jsFile: "./components/compareToolbar/compareToolbar.js",
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
