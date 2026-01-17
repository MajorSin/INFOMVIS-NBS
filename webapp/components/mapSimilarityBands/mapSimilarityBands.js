var _selectedCities = typeof _selectedCities !== "undefined" ? _selectedCities : []
var _searchQuery = typeof _searchQuery !== "undefined" ? _searchQuery : ""
var _selectedEconomicImpacts =
  typeof _selectedEconomicImpacts !== "undefined" ? _selectedEconomicImpacts : []
var _selectedAreaTypes =
  typeof _selectedAreaTypes !== "undefined" ? _selectedAreaTypes : []
var _selectedTotalCosts =
  typeof _selectedTotalCosts !== "undefined" ? _selectedTotalCosts : []
var _selectedFundingSource =
  typeof _selectedFundingSource !== "undefined" ? _selectedFundingSource : []
var _yearRange =
  typeof _yearRange !== "undefined" ? _yearRange : { min: -Infinity, max: Infinity }
var _nbsAreaRange =
  typeof _nbsAreaRange !== "undefined" ? _nbsAreaRange : { min: -Infinity, max: Infinity }

window._selectedCities = _selectedCities
window._searchQuery = _searchQuery
window._selectedEconomicImpacts = _selectedEconomicImpacts
window._selectedAreaTypes = _selectedAreaTypes
window._selectedTotalCosts = _selectedTotalCosts
window._selectedFundingSource = _selectedFundingSource
window._yearRange = _yearRange
window._nbsAreaRange = _nbsAreaRange

const cityKey = (city, country) => `${city}-${country}`

class MapSimilarityBands {
  constructor({ rows = [], geo = null } = {}) {
    this.mapMeta = document.getElementById("mapMeta")
    this.cityResultsTitle = document.getElementById("cityResultsTitle")
    this.cityResultsBody = document.getElementById("cityResultsBody")
    this.clearCityBtn = document.getElementById("clearCityBtn")

    this.tooltip = d3.select("#mapTooltip")
    this.hasTooltip = !this.tooltip.empty()
    

    this.hoveredKey = null
    this.hoverRadiusPx = 8
    this.selectedCity = null
    this.selectedProject = null
    this.topN = 10
    this._activeCityName = null

    if (this.clearCityBtn) {
      this.clearCityBtn.onclick = () => {
        this.selectedCity = null
        this.selectedProject = null
        window.selectedCities = []
        this.renderCityResults()
        this.clearLinks()
      }
    }

    this.sim = new SimilarityMatrixCSV("data/similarity_matrix.csv")

    this.mapSvg = d3.select("#mapVis")
    this.w = +this.mapSvg.attr("width")
    this.h = +this.mapSvg.attr("height")

    this.mapG = this.mapSvg.append("g")
    this.countriesG = this.mapG.append("g").attr("class", "countries")
    this.pointsG = this.mapG.append("g").attr("class", "points")
    this.linksG = this.mapG.append("g").attr("class", "links")

    this.zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => this.mapG.attr("transform", event.transform))

    this.mapSvg
      .append("rect")
      .attr("class", "zoom-capture")
      .attr("width", this.w)
      .attr("height", this.h)
      .attr("fill", "transparent")
      .lower()

    this.mapSvg.call(this.zoom)

    this.projection = d3
      .geoMercator()
      .translate([this.w / 2, this.h / 1.55])
      .scale(this.w / (2 * Math.PI))

    this.geoPath = d3.geoPath().projection(this.projection)

    this.allRows = Array.isArray(rows) ? rows : []
    this.allRows.forEach((r, i) => {
      if (r && r.__index == null) r.__index = i
    })

    this.geo = geo
    if (this.geo) this.drawWorldMap(this.geo)

    this._hoverData = []
    this._currentCircleKeys = new Set()
    this.currentRows = this.allRows
    this._allowedIndexSet = new Set(
      this.allRows.map((r) => r?.__index).filter(Number.isInteger)
    )

    this.update(this.transformData(this.currentRows))
  }

  transformData(rows) {
    const list = Array.isArray(rows) ? rows : []
    const byCity = new Map()

    for (const r of list) {
      if (!r) continue
      const key = cityKey(r.city, r.country)
      let entry = byCity.get(key)
      if (!entry) {
        entry = { key, city: r.city, country: r.country, coordinates: r.coordinates, count: 0, projects: [] }
        byCity.set(key, entry)
      }
      entry.count++
      entry.projects.push(r)
      if (!entry.coordinates && r.coordinates) entry.coordinates = r.coordinates
    }

    return {
      rows: list,
      cities: Array.from(byCity.values()),
      totalProjects: list.length,
      totalCities: byCity.size,
    }
  }

  update(transformed) {
    if (!transformed) return

    this.currentRows = transformed.rows || []
    this._allowedIndexSet = new Set(
      this.currentRows.map((r) => r?.__index).filter(Number.isInteger)
    )

    const selected = Array.isArray(window.selectedCities) ? window.selectedCities : []
    let cityName = null
    if (selected.length) {
      if (this._activeCityName && selected.includes(this._activeCityName)) cityName = this._activeCityName
      else {
        cityName = selected[selected.length - 1]
        this._activeCityName = cityName
      }
    }

    if (cityName) {
      const found = transformed.cities.find((c) => c.city === cityName)
      if (found) {
        if (!this.selectedCity || this.selectedCity.key !== found.key) {
          this.selectedCity = { key: found.key, city: found.city, country: found.country }
          this.selectedProject = null
          this.clearLinks()
        }
      } else {
        this.selectedCity = null
        this.selectedProject = null
        this.clearLinks()
      }
    } else {
      this.selectedCity = null
      this.selectedProject = null
      this.clearLinks()
    }

    if (this.selectedProject && !this._allowedIndexSet.has(this.selectedProject.__index)) {
      this.selectedProject = null
      this.clearLinks()
    }

    if (this.mapMeta) {
      this.mapMeta.textContent = `${transformed.totalProjects} interventions · ${transformed.totalCities} cities`
    }

    this.drawCityCircles(transformed.cities)
    this.renderSelectionHalo()
    this.renderCityResults()
    if (this.selectedProject) this.updateSimilarityLinks()
  }

  drawWorldMap(geo) {
    this.countriesG
      .selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("d", this.geoPath)
      .attr("fill", "rgba(255,255,255,0.03)")
      .attr("stroke", "rgba(255,255,255,0.10)")
      .attr("stroke-width", 0.7)
  }

  parseCoords(str) {
    if (!str) return null
    const [lat, lon] = str
      .toString()
      .replace(/[()]/g, "")
      .split(",")
      .map((v) => Number(v.trim()))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return { lat, lon }
  }

  isSelectedCityName(cityName) {
    return Array.isArray(window.selectedCities) && window.selectedCities.some((s) => s === cityName)
  }

  renderSelectionHalo() {
    const city = this.selectedCity
    if (!city) {
      this.mapG.selectAll("circle.city-halo").remove()
      return
    }

    const data = this._hoverData.find((d) => d.key === city.key)
    if (!data) {
      this.mapG.selectAll("circle.city-halo").remove()
      return
    }

    const [cx, cy] = this.projection([data.coords.lon, data.coords.lat])

    const halo = this.mapG
      .selectAll("circle.city-halo")
      .data([{ cx, cy }])

    halo
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "city-halo")
            .attr("cx", (d) => d.cx)
            .attr("cy", (d) => d.cy)
            .attr("r", 10)
            .attr("fill", "none")
            .attr("stroke", "rgba(140, 190, 255, 0.95)")
            .attr("stroke-width", 3)
            .attr("pointer-events", "none")
            .call((sel) => sel.transition().duration(200).attr("r", 18)),
        (update) =>
          update
            .transition()
            .duration(200)
            .attr("cx", (d) => d.cx)
            .attr("cy", (d) => d.cy),
        (exit) => exit.remove()
      )

    halo.raise()
  }


  getCircleFill(d) {
    const hasSel = Array.isArray(window.selectedCities) && window.selectedCities.length > 0
    const isSel = this.isSelectedCityName(d.city)
    if (isSel) return "rgba(231,238,252,0.95)"
    return hasSel ? "rgba(231,238,252,0.08)" : "rgba(231,238,252,0.65)"
  }

  circleClass(d) {
    return `mapPoint${this.isSelectedCityName(d.city) ? " selected" : ""}`
  }

  setHovered(key) {
    if (this.hoveredKey === key) return
    this.hoveredKey = key
    const sel = this.pointsG.selectAll("circle")
    sel
      .attr("fill", (d) => (d.key === this.hoveredKey ? "blue" : this.getCircleFill(d)))
      .attr("stroke", (d) => (d.key === this.hoveredKey ? "blue" : "rgba(255,255,255,0.7)"))
      .attr("stroke-width", (d) => (d.key === this.hoveredKey ? 1.5 : 0.7))
    if (this.hoveredKey) sel.filter((d) => d.key === this.hoveredKey).raise()
  }

  projectToXY(p) {
    const coords = this.parseCoords(p.coordinates)
    if (!coords) return null
    const [x, y] = this.projection([coords.lon, coords.lat])
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { x, y }
  }

  quadCurvePath(x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.hypot(dx, dy)
    if (dist < 1e-6) return null
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const nx = -dy / dist
    const ny = dx / dist
    const offset = Math.min(90, dist * 0.22)
    const cx = mx + nx * offset
    const cy = my + ny * offset
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  }

  clearLinks() {
    this.linksG.selectAll("*").remove()
  }

  tooltipOn(event, d) {
    if (!this.hasTooltip) return
    this.tooltip
      .html(`${d.city}, ${d.country}<br/>Projects: ${d.count}`)
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 10 + "px")
      .style("display", "block")
  }

  tooltipMove(event) {
    if (!this.hasTooltip) return
    this.tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 10 + "px")
  }

  tooltipOff() {
    if (!this.hasTooltip) return
    this.tooltip.style("display", "none")
  }

  drawCityCircles(cityAgg) {
    const dataWithCoords = (cityAgg || [])
      .map((d) => {
        const coords = this.parseCoords(d.coordinates)
        return coords ? { ...d, coords } : null
      })
      .filter(Boolean)

    this._currentCircleKeys = new Set(dataWithCoords.map((d) => d.key))

    const rMaxRaw = d3.max(dataWithCoords, (d) => d.count)
    const rMax = Number.isFinite(rMaxRaw) && rMaxRaw > 0 ? rMaxRaw : 1
    const rScale = d3.scaleSqrt().domain([1, rMax]).range([2.5, 12])
    const getR = (d) => rScale(+d.count || 1)

    this.pointsG
      .selectAll("circle")
      .data(dataWithCoords, (d) => d.key)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", (d) => this.circleClass(d))
            .attr("cx", (d) => this.projection([d.coords.lon, d.coords.lat])[0])
            .attr("cy", (d) => this.projection([d.coords.lon, d.coords.lat])[1])
            .attr("r", (d) => getR(d))
            .attr("fill", (d) => this.getCircleFill(d))
            .attr("stroke", "rgba(255,255,255,0.7)")
            .attr("stroke-width", 0.7)
            .on("click", (event, d) => {
              const selected = Array.isArray(window.selectedCities) ? window.selectedCities : []
              const isSelected = selected.includes(d.city)
              const nextSelected = isSelected ? selected.filter((s) => s !== d.city) : [...selected, d.city]
              this._activeCityName = isSelected ? (nextSelected[nextSelected.length - 1] ?? null) : d.city
              window.selectedCities = nextSelected
            })
            .on("mouseover", (event, d) => this.tooltipOn(event, d))
            .on("mousemove", (event) => this.tooltipMove(event))
            .on("mouseout", () => this.tooltipOff()),
        (update) =>
          update
            .attr("class", (d) => this.circleClass(d))
            .transition()
            .duration(200)
            .attr("cx", (d) => this.projection([d.coords.lon, d.coords.lat])[0])
            .attr("cy", (d) => this.projection([d.coords.lon, d.coords.lat])[1])
            .attr("r", (d) => getR(d))
            .attr("fill", (d) => this.getCircleFill(d)),
        (exit) => exit.remove()
      )

    this._hoverData = dataWithCoords

    this.renderSelectionHalo()

    this.mapSvg.on("mousemove.hover", (event) => {
      if (!this._hoverData || !this._hoverData.length) return this.setHovered(null)

      const [mx0, my0] = d3.pointer(event, this.mapSvg.node())
      const t = d3.zoomTransform(this.mapSvg.node())
      const mx = (mx0 - t.x) / t.k
      const my = (my0 - t.y) / t.k

      let bestKey = null
      let bestD2 = Infinity

      for (const d of this._hoverData) {
        const [x, y] = this.projection([d.coords.lon, d.coords.lat])
        const dx = x - mx
        const dy = y - my
        const d2 = dx * dx + dy * dy
        if (d2 < bestD2) {
          bestD2 = d2
          bestKey = d.key
        }
      }

      this.setHovered(bestD2 <= this.hoverRadiusPx ** 2 ? bestKey : null)
    })

    this.mapSvg.on("mouseleave.hover", () => this.setHovered(null))
  }

  async getTopSimilarProjects(targetProject) {
    if (!targetProject) return []
    const idx = targetProject.__index
    const sims = await this.sim.topNByIndexFiltered(idx, this.topN, this._allowedIndexSet)
    return sims
      .map(({ index, score }) => {
        const p = this.allRows[index]
        return p ? { project: p, score } : null
      })
      .filter(Boolean)
  }

  async updateSimilarityLinks() {
    if (!this.selectedProject) return this.clearLinks()

    if (!this._allowedIndexSet.has(this.selectedProject.__index)) {
      this.selectedProject = null
      return this.clearLinks()
    }

    const src = this.projectToXY(this.selectedProject)
    if (!src) return this.clearLinks()

    const top = await this.getTopSimilarProjects(this.selectedProject)

    const edges = top
      .map(({ project, score }) => {
        if (!this._allowedIndexSet.has(project.__index)) return null
        const dst = this.projectToXY(project)
        if (!dst) return null
        const dstKey = cityKey(project.city, project.country)
        if (!this._currentCircleKeys.has(dstKey)) return null
        return { key: `${project.__index}`, src, dst, score, project }
      })
      .filter(Boolean)

    if (!edges.length) return this.clearLinks()

    const sMin = d3.min(edges, (d) => d.score) ?? 0
    const sMax = d3.max(edges, (d) => d.score) ?? 1
    const wScale = d3.scaleLinear().domain([sMin, sMax]).range([0.8, 6.0])
    const oScale = d3.scaleLinear().domain([sMin, sMax]).range([0.15, 0.75])

    this.linksG
      .selectAll("path.sim-link")
      .data(edges, (d) => d.key)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "sim-link")
            .attr("fill", "none")
            .attr("stroke", "rgba(0, 170, 255, 0.85)")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 0)
            .attr("opacity", 0)
            .attr("d", (d) => this.quadCurvePath(d.src.x, d.src.y, d.dst.x, d.dst.y) ?? "")
            .filter(function () {
              return this.getAttribute("d") !== ""
            })
            .call((sel) =>
              sel
                .transition()
                .duration(250)
                .attr("stroke-width", (d) => wScale(d.score))
                .attr("opacity", (d) => oScale(d.score))
            ),
        (update) =>
          update
            .transition()
            .duration(250)
            .attr("d", (d) => this.quadCurvePath(d.src.x, d.src.y, d.dst.x, d.dst.y) ?? "")
            .attr("stroke-width", (d) => wScale(d.score))
            .attr("opacity", (d) => oScale(d.score)),
        (exit) => exit.transition().duration(150).attr("opacity", 0).remove()
      )

    this.linksG
      .selectAll("circle.target-halo")
      .data([src])
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "target-halo")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", 0)
            .attr("fill", "none")
            .attr("stroke", "rgba(0, 170, 255, 0.9)")
            .attr("stroke-width", 2)
            .attr("opacity", 0.9)
            .call((sel) => sel.transition().duration(250).attr("r", 10)),
        (update) => update.transition().duration(250).attr("cx", (d) => d.x).attr("cy", (d) => d.y),
        (exit) => exit.remove()
      )
  }

  async renderCityResults() {
    if (!this.cityResultsTitle || !this.cityResultsBody) return

    if (!this.selectedCity) {
      this.cityResultsTitle.textContent = "Selection"
      this.cityResultsBody.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Project</th>
              <th>Similarity</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      `
      return
    }

    if (!this.selectedProject) {
      const rows = this.currentRows.filter((r) => cityKey(r.city, r.country) === this.selectedCity.key)
      this.cityResultsTitle.textContent = `${this.selectedCity.city}, ${this.selectedCity.country} (${rows.length})`

      const ul = document.createElement("ul")
      for (const r of rows) {
        const title =
          r.name_of_the_nbs_intervention_short_english_title ??
          r.native_title_of_the_nbs_intervention ??
          "Untitled"

        const li = document.createElement("li")
        const a = document.createElement("a")
        a.href = "#"
        a.textContent = title
        a.onclick = async (e) => {
          e.preventDefault()
          this.selectedProject = r
          await this.renderCityResults()
          await this.updateSimilarityLinks()
        }
        li.appendChild(a)
        ul.appendChild(li)
      }

      this.cityResultsBody.innerHTML = ""
      this.cityResultsBody.appendChild(ul)
      return
    }

    if (!this._allowedIndexSet.has(this.selectedProject.__index)) {
      this.selectedProject = null
      this.clearLinks()
      return this.renderCityResults()
    }

    const top = await this.getTopSimilarProjects(this.selectedProject)

    this.cityResultsTitle.textContent = "Similarity"

    const table = document.createElement("table")
    table.innerHTML = `
      <thead>
        <tr>
          <th>Type</th>
          <th>Project</th>
          <th>City</th>
          <th>Similarity</th>
        </tr>
      </thead>
      <tbody></tbody>
    `
    const tbody = table.querySelector("tbody")

    const titleOf = (p) =>
      p.name_of_the_nbs_intervention_short_english_title ??
      p.native_title_of_the_nbs_intervention ??
      "Untitled"

    const cityText = (p) => `${p.city ?? "—"}, ${p.country ?? "—"}`

    const makeClickableTitleCell = (p) => {
      const td = document.createElement("td")
      const a = document.createElement("a")
      a.href = "#"
      a.textContent = titleOf(p)
      a.onclick = async (e) => {
        e.preventDefault()
        if (!this._allowedIndexSet.has(p.__index)) return
        this.selectedProject = p
        await this.renderCityResults()
        await this.updateSimilarityLinks()
      }
      td.appendChild(a)
      return td
    }

    const trTarget = document.createElement("tr")
    trTarget.className = "target"

    const tdTypeT = document.createElement("td")
    tdTypeT.className = "colType"
    tdTypeT.textContent = "Target"
    trTarget.appendChild(tdTypeT)

    trTarget.appendChild(makeClickableTitleCell(this.selectedProject))

    const tdCityT = document.createElement("td")
    tdCityT.className = "colCity"
    tdCityT.textContent = cityText(this.selectedProject)
    trTarget.appendChild(tdCityT)

    const tdSimT = document.createElement("td")
    tdSimT.className = "colSim"
    tdSimT.textContent = "—"
    trTarget.appendChild(tdSimT)

    tbody.appendChild(trTarget)

    for (const { project, score } of top) {
      const tr = document.createElement("tr")

      const tdType = document.createElement("td")
      tdType.className = "colType"
      tdType.textContent = "Similar"
      tr.appendChild(tdType)

      tr.appendChild(makeClickableTitleCell(project))

      const tdCity = document.createElement("td")
      tdCity.className = "colCity"
      tdCity.textContent = cityText(project)
      tr.appendChild(tdCity)

      const tdSim = document.createElement("td")
      tdSim.className = "colSim"
      tdSim.textContent = score.toFixed(3)
      tr.appendChild(tdSim)

      tbody.appendChild(tr)
    }

    this.cityResultsBody.innerHTML = ""
    this.cityResultsBody.appendChild(table)
  }
  }

class SimilarityMatrixCSV {
  constructor(csvUrl) {
    this.csvUrl = csvUrl
    this._loaded = false
    this._loadPromise = null
    this.rows = null
    this.size = 0
    this.idByIndex = null
    this.indexById = null
  }

  async _ensureLoaded() {
    if (this._loaded) return
    if (this._loadPromise) return this._loadPromise

    this._loadPromise = (async () => {
      const text = await fetch(this.csvUrl, { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load similarity CSV: ${r.status}`)
        return r.text()
      })

      const parsed = this._parseMatrixCSV(text)
      this.rows = parsed.rows
      this.size = parsed.size
      this.idByIndex = parsed.idByIndex
      this.indexById = parsed.indexById
      this._loaded = true
    })()

    return this._loadPromise
  }

  async topNByIndexFiltered(index, N, allowedSet, { includeSelf = false } = {}) {
    await this._ensureLoaded()

    if (!Number.isInteger(index) || index < 0 || index >= this.size) {
      throw new Error(`Index out of range: ${index} (size=${this.size})`)
    }

    const row = this.rows[index]
    const top = []

    const pushTop = (obj) => {
      let lo = 0,
        hi = top.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (top[mid].score < obj.score) lo = mid + 1
        else hi = mid
      }
      top.splice(lo, 0, obj)
      if (top.length > N) top.shift()
    }

    const allowAll = !allowedSet || typeof allowedSet.has !== "function"

    if (allowAll) {
      for (let j = 0; j < this.size; j++) {
        if (!includeSelf && j === index) continue
        const score = row[j]
        if (!Number.isFinite(score)) continue
        if (top.length < N) pushTop({ index: j, score })
        else if (score > top[0].score) pushTop({ index: j, score })
      }
      return top.sort((a, b) => b.score - a.score)
    }

    for (const j of allowedSet) {
      if (!includeSelf && j === index) continue
      if (!Number.isInteger(j) || j < 0 || j >= this.size) continue
      const score = row[j]
      if (!Number.isFinite(score)) continue
      if (top.length < N) pushTop({ index: j, score })
      else if (score > top[0].score) pushTop({ index: j, score })
    }

    return top.sort((a, b) => b.score - a.score)
  }

  _parseMatrixCSV(text) {
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    const splitCSV = (line) => {
      const out = []
      let cur = ""
      let inQ = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') inQ = !inQ
        else if (ch === "," && !inQ) {
          out.push(cur)
          cur = ""
        } else cur += ch
      }
      out.push(cur)
      return out.map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
    }

    const table = lines.map(splitCSV)
    const isNumeric = (s) => s !== "" && Number.isFinite(Number(s))

    const firstCell = table[0]?.[0] ?? ""
    const labeled =
      !isNumeric(firstCell) &&
      table.length > 1 &&
      table[0].length > 1 &&
      isNumeric(table[1][1])

    if (!labeled) {
      const size = table.length
      const rows = new Array(size)
      for (let i = 0; i < size; i++) {
        if (table[i].length !== size) {
          throw new Error(
            `Matrix is not square at row ${i}: expected ${size} cols, got ${table[i].length}`
          )
        }
        const arr = new Float32Array(size)
        for (let j = 0; j < size; j++) arr[j] = Number(table[i][j])
        rows[i] = arr
      }
      return { rows, size, idByIndex: null, indexById: null }
    }

    const colIds = table[0].slice(1)
    const rowIds = table.slice(1).map((r) => r[0])

    const size = rowIds.length
    if (colIds.length !== size) {
      throw new Error(
        `Labeled matrix mismatch: ${colIds.length} column ids vs ${size} row ids`
      )
    }

    const idByIndex = rowIds.slice()
    const indexById = new Map()
    idByIndex.forEach((id, idx) => indexById.set(id, idx))

    const rows = new Array(size)
    for (let i = 0; i < size; i++) {
      const row = table[i + 1].slice(1)
      if (row.length !== size) {
        throw new Error(
          `Labeled matrix row ${i} not size ${size} (got ${row.length})`
        )
      }
      const arr = new Float32Array(size)
      for (let j = 0; j < size; j++) arr[j] = Number(row[j])
      rows[i] = arr
    }

    return { rows, size, idByIndex, indexById }
  }

  async topNByIndex(index, N, { includeSelf = false } = {}) {
    await this._ensureLoaded()

    if (!Number.isInteger(index) || index < 0 || index >= this.size) {
      throw new Error(`Index out of range: ${index} (size=${this.size})`)
    }

    const row = this.rows[index]
    const top = []

    const pushTop = (obj) => {
      let lo = 0,
        hi = top.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (top[mid].score < obj.score) lo = mid + 1
        else hi = mid
      }
      top.splice(lo, 0, obj)
      if (top.length > N) top.shift()
    }

    for (let j = 0; j < this.size; j++) {
      if (!includeSelf && j === index) continue
      const score = row[j]
      if (!Number.isFinite(score)) continue
      if (top.length < N) pushTop({ index: j, score })
      else if (score > top[0].score) pushTop({ index: j, score })
    }

    return top.sort((a, b) => b.score - a.score)
  }

  async topNById(id, N, opts) {
    await this._ensureLoaded()
    if (!this.indexById)
      throw new Error("Matrix has no ids (not labeled). Use topNByIndex instead.")
    const idx = this.indexById.get(String(id))
    if (idx == null) throw new Error(`Unknown id: ${id}`)
    return this.topNByIndex(idx, N, opts)
  }
}

;(function patchExplorationModeUpdateFundingGuard() {
  const tryPatch = () => {
    if (typeof ExplorationMode === "undefined") return requestAnimationFrame(tryPatch)
    const EM = ExplorationMode
    if (!EM || !EM.prototype || EM.__patchedFundingGuard) return

    const origUpdate = EM.prototype.update
    EM.prototype.update = function patchedUpdate(...args) {
      if (this.components && !this.components.funding) {
        this.components.funding = { update() {}, transformData() { return null } }
      }
      return origUpdate.apply(this, args)
    }
    EM.__patchedFundingGuard = true
  }
  tryPatch()
})()
