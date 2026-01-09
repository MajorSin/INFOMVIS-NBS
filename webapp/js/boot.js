async function injectHtml(selectors) {
  const head = document.head
  const body = document.body

  await Promise.all(
    selectors.map(async (selector) => {
      const {
        element,
        url,
        styleSheet = null,
        jsFile = null,
        required = false, // default: optional
      } = selector

      const mount = document.querySelector(element)
      if (!mount) {
        if (required) throw new Error(`Mount not found: ${element}`)
        return // just skip on pages that don't have it
      }

      // Mount stylesheet (avoid duplicates)
      if (styleSheet) {
        const already = head.querySelector(`link[rel="stylesheet"][href="${styleSheet}"]`)
        if (!already) {
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.href = styleSheet
          head.appendChild(link)
        }
      }

      // Mount javascript file (avoid duplicates)
      if (jsFile) {
        const already = body.querySelector(`script[src="${jsFile}"]`)
        if (!already) {
          const script = document.createElement("script")
          script.src = jsFile
          script.type = "text/javascript"
          script.defer = true
          body.appendChild(script)
        }
      }

      // Mount HTML file
      const res = await fetch(url, { cache: "no-cache" })
      if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`)
      mount.innerHTML = await res.text()
    })
  )
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
      element: "#mapMount",
      url: "./components/mapFilteredCities/mapFilteredCities.html",
      styleSheet: "./components/mapFilteredCities/mapFilteredCities.css",
      jsFile: "./components/mapFilteredCities/mapFilteredCities.js",
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
  ])

  const script = document.createElement("script")
  script.src = jsFile
  document.body.appendChild(script)
}

async function callBoot(jsFile, currentPage) {
  await boot(jsFile).catch((err) => {
    console.error(err)
    document.body.insertAdjacentHTML(
      "beforeend",
      `<pre style="padding:12px; border:1px solid #ccc; white-space:pre-wrap;">Failed to boot app:${err.message}</pre>`
    )
  })
  document.getElementById(`${currentPage}Link`).style["font-weight"] = "700"
}
