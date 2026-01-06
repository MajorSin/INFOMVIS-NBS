const ATOMIC_IMPACTS = [
  "Attraction of business and investment",
  "Generation of income from NBS",
  "Increase in agricultural production (for profit or not)",
  "Increase of green  jobs (e.g. paid employment positions)",
  "Increased market share for green economies",
  "Increased property prices",
  "More sustainable tourism",
  "Reduce financial cost for urban management",
  "Stimulate development in deprived areas",
  "Other",
  "Unknown",
]

function parseEconomicImpacts(raw) {
  const v = (raw ?? "").toString().trim()
  if (!v) return ["Unknown"]
  if (v === "Unknown") return ["Unknown"]

  const matches = []
  for (const label of ATOMIC_IMPACTS) {
    if (label === "Unknown") continue
    if (v.includes(label)) matches.push(label)
  }
  return matches.length ? matches : ["Unknown"]
}

function uniqCount(arr) {
  return new Set(arr.filter((d) => d != null && d !== "")).size
}

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x)
}

function cityKey(city, country) {
  return `${(city ?? "").trim()}|||${(country ?? "").trim()}`.toLowerCase()
}

function debounce(fn, delay = 150) {
  let t = null
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const impactCheckboxes = document.getElementById("impactCheckboxes")
const impactMeta = document.getElementById("impactMeta")
const selectAllBtn = document.getElementById("selectAllBtn")
const clearBtn = document.getElementById("clearBtn")

const startYearMinEl = document.getElementById("startYearMin")
const startYearMaxEl = document.getElementById("startYearMax")
const startYearMinValEl = document.getElementById("startYearMinVal")
const startYearMaxValEl = document.getElementById("startYearMaxVal")
const startYearLabelEl = document.getElementById("startYearLabel")
const resetStartYearBtn = document.getElementById("resetStartYearBtn")

const searchInput = document.getElementById("searchInput")
const statusBox = document.getElementById("statusBox")

const rowCountEl = document.getElementById("rowCount")
const cityCountEl = document.getElementById("cityCount")
const countryCountEl = document.getElementById("countryCount")

const tableBody = document.querySelector("#resultsTable tbody")
const tableMeta = document.getElementById("tableMeta")

const mapMeta = document.getElementById("mapMeta")
const cityPanelTitle = document.getElementById("cityPanelTitle")
const cityPanelBody = document.getElementById("cityPanelBody")
const clearCityBtn = document.getElementById("clearCityBtn")

const mapSvg = d3.select("#mapVis")
const mapW = +mapSvg.attr("width")
const mapH = +mapSvg.attr("height")

const mapG = mapSvg.append("g")
const countriesG = mapG.append("g").attr("class", "countries")
const pointsG = mapG.append("g").attr("class", "points")

const zoom = d3
  .zoom()
  .scaleExtent([1, 8])
  .extent([
    [0, 0],
    [mapW, mapH],
  ])
  .on("zoom", (event) => {
    mapG.attr("transform", event.transform)
  })

mapSvg
  .append("rect")
  .attr("class", "zoom-capture")
  .attr("width", mapW)
  .attr("height", mapH)
  .attr("fill", "transparent")
  .lower()

mapSvg.call(zoom)

const projection = d3
  .geoMercator()
  .translate([mapW / 2, mapH / 1.55])
  .scale(mapW / (2 * Math.PI))

const geoPath = d3.geoPath().projection(projection)

let allRows = []
let filteredRows = []

let startYearBounds = { min: null, max: null }

let selectedCity = null

const coordCache = new Map()
loadCoordCacheFromLocalStorage()

let geocodeJobRunning = false
let pendingCityKeys = new Set()

let storageWriteFailed = false

init().catch((e) => {
  console.error(e)
  setStatus(`Unexpected error: ${e?.message ?? e}`)
})

async function init() {
  buildImpactCheckboxes()

  const applyFiltersDebounced = debounce(applyFilters, 150)

  selectAllBtn.addEventListener("click", () => {
    selectAllImpacts()
    applyFilters()
  })

  clearBtn.addEventListener("click", () => {
    clearAllImpacts()
    applyFilters()
  })

  searchInput.addEventListener("input", applyFiltersDebounced)

  startYearMinEl.addEventListener("input", () => {
    if (+startYearMinEl.value > +startYearMaxEl.value) {
      startYearMaxEl.value = startYearMinEl.value
    }
    updateStartYearUI()
    applyFiltersDebounced()
  })

  startYearMaxEl.addEventListener("input", () => {
    if (+startYearMaxEl.value < +startYearMinEl.value) {
      startYearMinEl.value = startYearMaxEl.value
    }
    updateStartYearUI()
    applyFiltersDebounced()
  })

  resetStartYearBtn.addEventListener("click", () => {
    resetStartYearRange()
    applyFilters()
  })

  clearCityBtn.addEventListener("click", () => {
    selectedCity = null
    renderCityPanel()
    renderMap()
  })

  setStatus("Loading world map…")
  const worldOk = await loadWorldMap()
  if (!worldOk) return

  setStatus("Loading data…")
  try {
    allRows = await d3.csv("./data/cleaned_nbs_data.csv", d3.autoType)
  } catch (err) {
    console.error("CSV load failed:", err)
    setStatus(
      "Failed to load ./data/cleaned_nbs_data.csv. Run via a local server and verify path."
    )
    return
  }

  allRows.forEach((r) => {
    r.__economicImpacts = parseEconomicImpacts(r.economic_impacts)
  })

  configureStartYearBounds()

  setStatus(`Loaded ${allRows.length} rows.`)
  applyFilters()
}

function setStatus(msg) {
  statusBox.textContent = msg ?? ""
}

async function loadWorldMap() {
  const url = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

  try {
    const topo = await fetch(url).then((r) => r.json())
    const geo = topojson.feature(topo, topo.objects.countries)

    countriesG
      .selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("d", geoPath)
      .attr("fill", "rgba(255,255,255,0.03)")
      .attr("stroke", "rgba(255,255,255,0.10)")
      .attr("stroke-width", 0.7)

    return true
  } catch (e) {
    console.error("World map load failed:", e)
    setStatus(
      "Failed to load world map. Check your internet connection and try again."
    )
    return false
  }
}

function buildImpactCheckboxes() {
  impactCheckboxes.innerHTML = ""

  for (const label of ATOMIC_IMPACTS) {
    const id = `imp_${label.replaceAll(/[^a-zA-Z0-9]+/g, "_")}`

    const item = document.createElement("label")
    item.className = "impactItem"
    item.setAttribute("for", id)

    const cb = document.createElement("input")
    cb.type = "checkbox"
    cb.value = label
    cb.id = id
    cb.checked = true

    cb.addEventListener("change", () => {
      updateImpactMeta()
      applyFilters()
    })

    const text = document.createElement("span")
    text.textContent = label

    item.appendChild(cb)
    item.appendChild(text)
    impactCheckboxes.appendChild(item)
  }

  updateImpactMeta()
}

function getImpactCheckboxes() {
  return [...impactCheckboxes.querySelectorAll('input[type="checkbox"]')]
}

function selectAllImpacts() {
  getImpactCheckboxes().forEach((cb) => (cb.checked = true))
  updateImpactMeta()
}

function clearAllImpacts() {
  getImpactCheckboxes().forEach((cb) => (cb.checked = false))
  updateImpactMeta()
}

function getSelectedImpacts() {
  return getImpactCheckboxes()
    .filter((cb) => cb.checked)
    .map((cb) => cb.value)
}

function updateImpactMeta() {
  impactMeta.textContent = `${getSelectedImpacts().length} selected`
}

function configureStartYearBounds() {
  const years = allRows
    .map((r) => r.start_year)
    .filter((y) => isFiniteNumber(y))
  if (years.length === 0) {
    startYearBounds = { min: null, max: null }
    startYearMinEl.disabled = true
    startYearMaxEl.disabled = true
    startYearLabelEl.textContent = "No start_year data"
    startYearMinValEl.textContent = "—"
    startYearMaxValEl.textContent = "—"
    return
  }

  const minY = Math.min(...years)
  const maxY = Math.max(...years)
  startYearBounds = { min: minY, max: maxY }

  startYearMinEl.min = String(minY)
  startYearMinEl.max = String(maxY)
  startYearMinEl.step = "1"

  startYearMaxEl.min = String(minY)
  startYearMaxEl.max = String(maxY)
  startYearMaxEl.step = "1"

  startYearMinEl.value = String(minY)
  startYearMaxEl.value = String(maxY)

  updateStartYearUI()
}

function resetStartYearRange() {
  if (startYearBounds.min == null || startYearBounds.max == null) return
  startYearMinEl.value = String(startYearBounds.min)
  startYearMaxEl.value = String(startYearBounds.max)
  updateStartYearUI()
}

function getSelectedStartYearRange() {
  if (startYearBounds.min == null || startYearBounds.max == null)
    return { min: null, max: null }
  return { min: +startYearMinEl.value, max: +startYearMaxEl.value }
}

function updateStartYearUI() {
  const r = getSelectedStartYearRange()
  if (r.min == null || r.max == null) {
    startYearLabelEl.textContent = "—"
    startYearMinValEl.textContent = "—"
    startYearMaxValEl.textContent = "—"
    return
  }
  startYearMinValEl.textContent = String(r.min)
  startYearMaxValEl.textContent = String(r.max)
  startYearLabelEl.textContent = `${r.min}–${r.max}`
}

function applyFilters() {
  const selectedImpacts = new Set(getSelectedImpacts())
  const q = (searchInput.value ?? "").trim().toLowerCase()
  const yearRange = getSelectedStartYearRange()

  filteredRows = allRows.filter((r) => {
    if (yearRange.min != null && yearRange.max != null) {
      const sy = r.start_year
      if (!isFiniteNumber(sy)) return false
      if (sy < yearRange.min || sy > yearRange.max) return false
    }

    if (selectedImpacts.size > 0) {
      const impacts = r.__economicImpacts ?? ["Unknown"]
      const passImpacts = [...selectedImpacts].every((need) =>
        impacts.includes(need)
      )
      if (!passImpacts) return false
    }

    if (!q) return true
    const hay = [
      r.name_of_the_nbs_intervention_short_english_title,
      r.native_title_of_the_nbs_intervention,
      r.city,
      r.country,
      r.economic_impacts,
    ]
      .map((x) => (x ?? "").toString().toLowerCase())
      .join(" • ")

    return hay.includes(q)
  })

  renderAll()
}

function renderAll() {
  renderKPIs()
  renderTable()
  renderMap()
  renderCityPanel()
}

function renderKPIs() {
  rowCountEl.textContent = String(filteredRows.length)
  cityCountEl.textContent = String(uniqCount(filteredRows.map((d) => d.city)))
  countryCountEl.textContent = String(
    uniqCount(filteredRows.map((d) => d.country))
  )
  tableMeta.textContent = `Showing ${Math.min(filteredRows.length, 250)} of ${
    filteredRows.length
  }`
}

function renderTable() {
  const MAX = 250
  const rows = filteredRows.slice(0, MAX)
  tableBody.innerHTML = ""

  for (const r of rows) {
    const tr = document.createElement("tr")

    const title =
      r.name_of_the_nbs_intervention_short_english_title ??
      r.native_title_of_the_nbs_intervention ??
      ""

    const impacts = (r.__economicImpacts ?? ["Unknown"]).join(", ")

    tr.appendChild(td(title))
    tr.appendChild(td(r.city ?? ""))
    tr.appendChild(td(r.country ?? ""))
    tr.appendChild(td(impacts))
    tr.appendChild(td(r.start_year ?? ""))
    tr.appendChild(td(r.end_year ?? ""))

    tableBody.appendChild(tr)
  }

  if (filteredRows.length > MAX) {
    const tr = document.createElement("tr")
    const cell = document.createElement("td")
    cell.colSpan = 6
    cell.textContent = `Showing first ${MAX} of ${filteredRows.length} rows. Add more filters to narrow results.`
    cell.style.color = "#a8b3cf"
    tr.appendChild(cell)
    tableBody.appendChild(tr)
  }
}

function td(text) {
  const cell = document.createElement("td")
  cell.textContent = (text ?? "").toString()
  return cell
}

function aggregateCities(rows) {
  const m = new Map()
  for (const r of rows) {
    const c = (r.city ?? "").trim()
    if (!c) continue

    const k = cityKey(r.city, r.country)
    const item = m.get(k) ?? {
      key: k,
      city: r.city ?? "",
      country: r.country ?? "",
      count: 0,
    }
    item.count += 1
    m.set(k, item)
  }
  return [...m.values()]
}

function renderMap() {
  const cityAgg = aggregateCities(filteredRows)
  mapMeta.textContent = `${cityAgg.length} cities (geocoding cached: ${coordCache.size})`

  const withCoords = cityAgg
    .map((d) => ({ ...d, coords: coordCache.get(d.key) }))
    .filter(
      (d) =>
        d.coords && isFiniteNumber(d.coords.lat) && isFiniteNumber(d.coords.lon)
    )

  drawCityCircles(withCoords)

  const missing = cityAgg.filter((d) => !coordCache.has(d.key))

  const toQueue = missing.filter((d) => !pendingCityKeys.has(d.key))
  toQueue.forEach((d) => pendingCityKeys.add(d.key))

  if (toQueue.length > 0) {
    geocodeMissingCities(toQueue)
  }
}

function drawCityCircles(withCoords) {
  const rMax = d3.max(withCoords, (d) => d.count) ?? 1
  const rScale = d3.scaleSqrt().domain([1, rMax]).range([2.5, 12])

  pointsG
    .selectAll("circle")
    .data(withCoords, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("cx", (d) => projection([d.coords.lon, d.coords.lat])[0])
          .attr("cy", (d) => projection([d.coords.lon, d.coords.lat])[1])
          .attr("r", 0)
          .attr("fill", (d) =>
            selectedCity && selectedCity.key === d.key
              ? "rgba(231,238,252,0.95)"
              : "rgba(231,238,252,0.65)"
          )
          .attr("stroke", "rgba(255,255,255,0.7)")
          .attr("stroke-width", 0.7)
          .on("click", (event, d) => {
            event.stopPropagation()
            selectedCity = { key: d.key, city: d.city, country: d.country }
            renderCityPanel()
            renderMap()
          })
          .call((sel) =>
            sel
              .transition()
              .duration(200)
              .attr("r", (d) => rScale(d.count))
          ),
      (update) =>
        update
          .transition()
          .duration(200)
          .attr("cx", (d) => projection([d.coords.lon, d.coords.lat])[0])
          .attr("cy", (d) => projection([d.coords.lon, d.coords.lat])[1])
          .attr("r", (d) => rScale(d.count))
          .attr("fill", (d) =>
            selectedCity && selectedCity.key === d.key
              ? "rgba(231,238,252,0.95)"
              : "rgba(231,238,252,0.65)"
          ),
      (exit) => exit.remove()
    )
}

async function geocodeMissingCities(cityList) {
  if (geocodeJobRunning) return
  geocodeJobRunning = true

  try {
    const CAP = 40
    const batch = cityList.slice(0, CAP)

    setStatus(`Geocoding ${batch.length} cities in background…`)

    await geocodeCitiesSequential(batch)

    saveCoordCacheToLocalStorage()

    batch.forEach((d) => pendingCityKeys.delete(d.key))

    renderMap()
  } finally {
    geocodeJobRunning = false

    if (pendingCityKeys.size > 0) {
      const cityAgg = aggregateCities(filteredRows)
      const stillMissing = cityAgg.filter(
        (d) => pendingCityKeys.has(d.key) && !coordCache.has(d.key)
      )

      if (stillMissing.length > 0) {
        geocodeMissingCities(stillMissing)
      } else {
        pendingCityKeys.clear()
      }
    }

    setStatus(`Loaded ${allRows.length} rows.`)
  }
}

async function geocodeCitiesSequential(list) {
  for (const d of list) {
    if (coordCache.has(d.key)) continue
    const result = await geocodeCity(d.city, d.country)
    if (result) coordCache.set(d.key, result)
    await sleep(1)
  }
}

async function geocodeCity(city, country) {
  const qCity = encodeURIComponent((city ?? "").trim())
  const qCountry = encodeURIComponent((country ?? "").trim())

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&city=${qCity}&country=${qCountry}`

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) return null

    const json = await res.json()
    if (!json || json.length === 0) return null

    const lat = +json[0].lat
    const lon = +json[0].lon
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    return { lat, lon }
  } catch (e) {
    return null
  }
}

function renderCityPanel() {
  if (!selectedCity) {
    cityPanelTitle.textContent = "City results"
    cityPanelBody.textContent =
      "Select a city on the map to list the interventions."
    return
  }

  const rows = filteredRows.filter(
    (r) => cityKey(r.city, r.country) === selectedCity.key
  )

  cityPanelTitle.textContent = `${selectedCity.city}${
    selectedCity.country ? ", " + selectedCity.country : ""
  } (${rows.length})`

  if (rows.length === 0) {
    cityPanelBody.textContent =
      "No results for this city under the current filters."
    return
  }

  const ul = document.createElement("ul")

  for (const r of rows) {
    const li = document.createElement("li")
    const title =
      r.name_of_the_nbs_intervention_short_english_title ??
      r.native_title_of_the_nbs_intervention ??
      "Untitled"

    const url = (r.link ?? "").toString().trim()
    if (url) {
      const a = document.createElement("a")
      a.href = url
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      a.textContent = title
      li.appendChild(a)
    } else {
      li.textContent = title
    }

    ul.appendChild(li)
  }

  cityPanelBody.innerHTML = ""
  cityPanelBody.appendChild(ul)
}

function loadCoordCacheFromLocalStorage() {
  try {
    const raw = localStorage.getItem("nbs_city_coords_v1")
    if (!raw) return

    const obj = JSON.parse(raw)
    for (const [k, v] of Object.entries(obj)) {
      const lat = +v?.lat
      const lon = +v?.lon
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        coordCache.set(k, { lat, lon })
      }
    }
  } catch (e) {
    console.warn("Could not load cached coordinates from localStorage:", e)
  }
}

function saveCoordCacheToLocalStorage() {
  if (storageWriteFailed) return

  try {
    const obj = {}
    for (const [k, v] of coordCache.entries()) obj[k] = v
    localStorage.setItem("nbs_city_coords_v1", JSON.stringify(obj))
  } catch (e) {
    storageWriteFailed = true
    console.warn("Could not persist coordinate cache to localStorage:", e)
  }
}
