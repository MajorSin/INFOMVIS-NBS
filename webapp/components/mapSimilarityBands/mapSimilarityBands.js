const cityKey = (city, country) => `${city}-${country}`

class MapSimilarityBands {
  constructor() {
    this.mapMeta = document.getElementById("mapMeta")

    this.hoveredKey = null
    this.hoverRadiusPx = 8
    this.selectedCity = null
    this.selectedProject = null
    this.topN = 10

    this.cityResultsTitle = document.getElementById("cityResultsTitle")
    this.cityResultsBody = document.getElementById("cityResultsBody")
    this.clearCityBtn = document.getElementById("clearCityBtn")
    this.clearCityBtn.onclick = () => {
      this.selectedCity = null
      this.selectedProject = null
      this.rendercityResults()
      this.clearLinks()
    }

    this.sim = new SimilarityMatrixCSV("../data/similarity_matrix.csv")

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
      .on("zoom", (event) => {
        this.mapG.attr("transform", event.transform)
      })

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
  }

  async wrangleData(data) {
    this.data = data.map((d, i) => ({
      ...d,
      __index: i
    }))
  }

  async init(data) {
    await this.wrangleData(data)
    await this.loadWorldMap()
    this.drawCityCircles(this.data)
  }

  async loadWorldMap() {
    const topo = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
    ).then((r) => r.json())

    const geo = topojson.feature(topo, topo.objects.countries)

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

  getCircleFill(d) {
    const key = d.key ?? cityKey(d.city, d.country)
    if (this.selectedCity && this.selectedCity.key === key) {
      return "rgba(231,238,252,0.95)"
    }
    return "rgba(231,238,252,0.65)"
  }

  setHovered(key) {
    if (this.hoveredKey === key) return
    this.hoveredKey = key

    const sel = this.pointsG.selectAll("circle")

    sel
      .attr("fill", (d) => {
        const k = d.key ?? cityKey(d.city, d.country)
        return k === this.hoveredKey ? "blue" : this.getCircleFill(d)
      })
      .attr("stroke", (d) => {
        const k = d.key ?? cityKey(d.city, d.country)
        return k === this.hoveredKey ? "blue" : "rgba(255,255,255,0.7)"
      })
      .attr("stroke-width", (d) => {
        const k = d.key ?? cityKey(d.city, d.country)
        return k === this.hoveredKey ? 1.5 : 0.7
      })

    if (this.hoveredKey) {
      sel
        .filter(d => (d.key ?? cityKey(d.city, d.country)) === this.hoveredKey)
        .raise()
    }
  }

  getProjectTitle(p) {
    return (
      p.name_of_the_nbs_intervention_short_english_title ??
      p.native_title_of_the_nbs_intervention ??
      "Untitled"
    )
  }

  getProjectKey(p) {
    return `${p.__index}`
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

  drawCityCircles(data) {
    const dataWithCoords = data
      .map(d => {
        const coords = this.parseCoords(d.coordinates)
        if (!coords) return null
        return {
          ...d,
          key: cityKey(d.city, d.country),
          coords
        }
      })
      .filter(Boolean)

    const rMax = d3.max(dataWithCoords, d => d.count) ?? 1
    const rScale = d3.scaleSqrt().domain([1, rMax]).range([2.5, 12])
    const getR = d => rScale(+d.count || 1)

    this.pointsG
      .selectAll("circle")
      .data(dataWithCoords, d => d.key)
      .join(
        enter => enter
          .append("circle")
          .attr("cx", d => this.projection([d.coords.lon, d.coords.lat])[0])
          .attr("cy", d => this.projection([d.coords.lon, d.coords.lat])[1])
          .attr("r", d => getR(d))
          .attr("fill", d => this.getCircleFill(d))
          .attr("stroke", "rgba(255,255,255,0.7)")
          .attr("stroke-width", 0.7)
          .on("click", (event, d) => {
            event.stopPropagation()
            this.selectedCity = {
              key: d.key,
              city: d.city,
              country: d.country
            }
            this.selectedProject = null
            this.rendercityResults()
            this.clearLinks()
          }),
        update => update
          .transition()
          .duration(200)
          .attr("cx", d => this.projection([d.coords.lon, d.coords.lat])[0])
          .attr("cy", d => this.projection([d.coords.lon, d.coords.lat])[1])
          .attr("r", d => getR(d))
          .attr("fill", d => this.getCircleFill(d)),
        exit => exit.remove()
      )

    this._hoverData = dataWithCoords

    this.mapSvg.on("mousemove.hover", (event) => {
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

      if (bestD2 <= this.hoverRadiusPx ** 2) {
        this.setHovered(bestKey)
      } else {
        this.setHovered(null)
      }
    })

    this.mapSvg.on("mouseleave.hover", () => this.setHovered(null))

    this.rendercityResults()
  }

  async getTopSimilarProjects(targetProject) {
    if (!targetProject) return []

    const idx = targetProject.__index
    const sims = await this.sim.topNByIndex(idx, this.topN)

    return sims
      .map(({ index, score }) => {
        const p = this.data[index]
        if (!p) return null
        return { project: p, score }
      })
      .filter(Boolean)
  }

  async updateSimilarityLinks() {
    if (!this.selectedProject) {
      this.clearLinks()
      return
    }

    const src = this.projectToXY(this.selectedProject)
    if (!src) {
      this.clearLinks()
      return
    }

    const top = await this.getTopSimilarProjects(this.selectedProject)

    const edges = top
      .map(({ project, score }) => {
        const dst = this.projectToXY(project)
        if (!dst) return null
        return {
          key: this.getProjectKey(project),
          src,
          dst,
          score,
          project,
        }
      })
      .filter(Boolean)

    const sMin = d3.min(edges, (d) => d.score) ?? 0
    const sMax = d3.max(edges, (d) => d.score) ?? 1

    const wScale = d3.scaleLinear().domain([sMin, sMax]).range([0.8, 6.0])
    const oScale = d3.scaleLinear().domain([sMin, sMax]).range([0.15, 0.75])

    const paths = this.linksG
      .selectAll("path.sim-link")
      .data(edges, (d) => d.key)

    paths
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

        (exit) =>
          exit
            .transition()
            .duration(150)
            .attr("opacity", 0)
            .remove()
      )

    const halo = this.linksG.selectAll("circle.target-halo").data([src])
    halo.join(
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
      (update) =>
        update
          .transition()
          .duration(250)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y),
      (exit) => exit.remove()
    )
  }

  async rendercityResults() {
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
      const rows = this.data.filter(
        r => cityKey(r.city, r.country) === this.selectedCity.key
      )

      this.cityResultsTitle.textContent =
        `${this.selectedCity.city}, ${this.selectedCity.country} (${rows.length})`

      const ul = document.createElement("ul")

      for (const r of rows) {
        const li = document.createElement("li")
        const title =
          r.name_of_the_nbs_intervention_short_english_title ??
          r.native_title_of_the_nbs_intervention ??
          "Untitled"

        const a = document.createElement("a")
        a.href = "#"
        a.textContent = title
        a.onclick = async (e) => {
          e.preventDefault()
          this.selectedProject = r
          await this.rendercityResults()
          await this.updateSimilarityLinks()
        }

        li.appendChild(a)
        ul.appendChild(li)
      }

      this.cityResultsBody.innerHTML = ""
      this.cityResultsBody.appendChild(ul)
      return
    }

    const top = await this.getTopSimilarProjects(this.selectedProject)

    this.cityResultsTitle.textContent = "Similarity"

    const table = document.createElement("table")
    table.innerHTML = `
      <thead>
        <tr>
          <th>Type</th>
          <th>Project</th>
          <th>Similarity</th>
        </tr>
      </thead>
      <tbody></tbody>
    `

    const tbody = table.querySelector("tbody")

    const trTarget = document.createElement("tr")
    trTarget.className = "target"
    trTarget.innerHTML = `
      <td class="colType">Target</td>
      <td>${this.selectedProject.name_of_the_nbs_intervention_short_english_title
        ?? this.selectedProject.native_title_of_the_nbs_intervention
        ?? "Untitled"}</td>
      <td class="colSim">—</td>
    `
    tbody.appendChild(trTarget)

    for (const { project, score } of top) {
      const tr = document.createElement("tr")
      tr.innerHTML = `
        <td class="colType">Similar</td>
        <td>${project.name_of_the_nbs_intervention_short_english_title
          ?? project.native_title_of_the_nbs_intervention
          ?? "Untitled"}</td>
        <td class="colSim">${score.toFixed(3)}</td>
      `
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
          throw new Error(`Matrix is not square at row ${i}: expected ${size} cols, got ${table[i].length}`)
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
      throw new Error(`Labeled matrix mismatch: ${colIds.length} column ids vs ${size} row ids`)
    }

    const idByIndex = rowIds.slice()
    const indexById = new Map()
    idByIndex.forEach((id, idx) => indexById.set(id, idx))

    const rows = new Array(size)
    for (let i = 0; i < size; i++) {
      const row = table[i + 1].slice(1)
      if (row.length !== size) {
        throw new Error(`Labeled matrix row ${i} not size ${size} (got ${row.length})`)
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
      let lo = 0, hi = top.length
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
    if (!this.indexById) throw new Error("Matrix has no ids (not labeled). Use topNByIndex instead.")
    const idx = this.indexById.get(String(id))
    if (idx == null) throw new Error(`Unknown id: ${id}`)
    return this.topNByIndex(idx, N, opts)
  }
}
