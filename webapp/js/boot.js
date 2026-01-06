async function injectHtml(selectors) {
  const head = document.getElementsByTagName("head")[0]
  await Promise.all(
    selectors.map(async (selector) => {
      // Mount stylesheet
      let link = document.createElement("link")
      link.rel = "stylesheet"
      link.type = "text/css"
      link.href = selector.styleSheet
      link.media = "all"
      head.appendChild(link)

      // Mount file
      const mount = document.querySelector(selector.element)
      if (!mount) throw new Error(`Mount not found: ${selector.element}`)

      const res = await fetch(selector.url, { cache: "no-cache" })
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
    },
    {
      element: "#mapMount",
      url: "./components/mapFilteredCities/mapFilteredCities.html",
      styleSheet: "./components/mapFilteredCities/mapFilteredCities.css",
    },
    {
      element: "#resultsMount",
      url: "./components/results/results.html",
      styleSheet: "./components/results/results.css",
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
