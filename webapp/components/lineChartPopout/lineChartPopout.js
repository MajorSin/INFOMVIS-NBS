class LineChartPopout {
  constructor(filteredData) {
    this.expandBtn = document.getElementById("lineChartExpandBtn")
    this.host = document.getElementById("lineChartHost")
    this.card = document.getElementById("lineChartCard")
    this.modal = document.getElementById("lineChartModal")
    portalToBody(this.modal)
    this.modalBody = document.getElementById("lineChartModalBody")
    this.chartArea = document.getElementById("lineChartArea")
    this.tooltip = d3.select("#lineChartTooltip")
    this.margin = { top: 18, right: 18, bottom: 34, left: 52 }
    this.hostHome = this.host.parentNode
    this.filteredData = []
    this.series = []
    this.bindEvents()
    this.init(filteredData)
  }

  init(data) {
    this.wrangleData(data)
  }

  wrangleData(data) {
    this.filteredData = Array.isArray(data) ? data : []
    this.update(this.transformData(this.filteredData))
  }

  update(series) {
    this.series = series ?? []
    this.tooltip.style("display", "none")
    this.render()
  }

  setData(filteredData) {
    this.wrangleData(filteredData)
  }

  transformData(rows) {
    if (!rows?.length) return []

    const numericYears = []
    for (const r of rows) {
      const sy = this.toYear(r.startYear)
      const ey = this.toYear(r.endYear)
      if (Number.isFinite(sy)) numericYears.push(sy)
      if (Number.isFinite(ey)) numericYears.push(ey)
      const dur = this.parseDuration(r.duration)
      if (dur?.start != null) numericYears.push(dur.start)
      if (dur?.end != null && dur.end !== "ongoing" && dur.end !== "unknown")
        numericYears.push(dur.end)
    }

    const fallbackOngoingEnd =
      numericYears.length > 0
        ? Math.max(...numericYears)
        : new Date().getFullYear()

    const yearCounts = new Map()
    let minYear = Infinity
    let maxYear = -Infinity

    for (const r of rows) {
      const range = this.getProjectRange(r, fallbackOngoingEnd)
      if (!range) continue
      const { start, end } = range
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue
      if (end < start) continue
      minYear = Math.min(minYear, start)
      maxYear = Math.max(maxYear, end)
      for (let y = start; y <= end; y++) {
        yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1)
      }
    }

    if (
      !Number.isFinite(minYear) ||
      !Number.isFinite(maxYear) ||
      minYear > maxYear
    ) {
      return []
    }

    const series = []
    for (let y = minYear; y <= maxYear; y++) {
      series.push({
        year: y,
        date: new Date(y, 0, 1),
        value: yearCounts.get(y) ?? 0,
      })
    }

    return series
  }

  getProjectRange(row, ongoingEndYear) {
    const sy = this.toYear(row.start_year)
    const ey = this.toYear(row.endYear)

    if (Number.isFinite(sy)) {
      const end = Number.isFinite(ey) ? ey : sy
      return { start: sy, end: end === "ongoing" ? ongoingEndYear : end }
    }

    const dur = this.parseDuration(row.duration)
    if (!dur || dur.start == null) return null

    let start = dur.start
    let end = dur.end

    if (end === "ongoing") end = ongoingEndYear
    if (end === "unknown" || end == null) end = start

    return { start, end }
  }

  toYear(v) {
    if (v == null) return null
    if (typeof v === "number" && Number.isFinite(v)) return v
    const s = String(v).trim()
    if (!s) return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }

  parseDuration(duration) {
    if (duration == null) return null
    const raw = String(duration).trim().toLowerCase()
    if (!raw) return null
    const norm = raw.replace(/–/g, "-").replace(/\s+/g, " ")
    const m = norm.match(/^(\d{4})\s*-\s*(\d{4}|ongoing|unknown)$/)
    if (m) {
      const start = Number(m[1])
      const endToken = m[2]
      const end =
        endToken === "ongoing" || endToken === "unknown"
          ? endToken
          : Number(endToken)
      return { start: Number.isFinite(start) ? start : null, end }
    }
    const y = norm.match(/^(\d{4})$/)
    if (y) {
      const start = Number(y[1])
      return { start: Number.isFinite(start) ? start : null, end: null }
    }
    return null
  }

  render() {
    d3.select(this.chartArea).selectAll("*").remove()
    this.tooltip.style("display", "none")
    if (!this.series?.length) return

    const rect = this.chartArea.getBoundingClientRect()
    const width = Math.max(360, rect.width)
    const height = Math.max(280, rect.height)

    const innerW = width - this.margin.left - this.margin.right
    const innerH = height - this.margin.top - this.margin.bottom

    const xAcc = (d) => d.date
    const yAcc = (d) => +d.value

    const data = [...this.series].sort((a, b) => xAcc(a) - xAcc(b))

    const x = d3.scaleTime().domain(d3.extent(data, xAcc)).range([0, innerW])
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, yAcc) ?? 0])
      .nice()
      .range([innerH, 0])

    const svg = d3
      .select(this.chartArea)
      .append("svg")
      .attr("width", width)
      .attr("height", height)

    const g = svg
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`)

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(Math.min(10, data.length)))

    g.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")))

    const line = d3
      .line()
      .x((d) => x(xAcc(d)))
      .y((d) => y(yAcc(d)))

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#17becf")
      .attr("stroke-width", 2)
      .attr("d", line)

    this.addHover(g, x, y, data, innerW, innerH, xAcc, yAcc)
  }

  addHover(g, x, y, data, width, height, xAcc, yAcc) {
    const bisect = d3.bisector(xAcc).left
    const fmt = d3.timeFormat("%Y")

    const focus = g.append("g").style("display", "none")
    focus
      .append("circle")
      .attr("r", 4)
      .attr("fill", "white")
      .attr("stroke", "#17becf")
      .attr("stroke-width", 2)

    g.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mouseenter", () => focus.style("display", null))
      .on("mouseleave", () => {
        focus.style("display", "none")
        this.tooltip.style("display", "none")
      })
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event)
        const x0 = x.invert(mx)
        const i = bisect(data, x0, 1)
        const d0 = data[i - 1]
        const d1 = data[i] ?? d0
        const d = xAcc(d1) - x0 < x0 - xAcc(d0) ? d1 : d0

        focus.attr("transform", `translate(${x(xAcc(d))},${y(yAcc(d))})`)

        this.tooltip
          .html(`${fmt(xAcc(d))}<br/>Projects active: ${yAcc(d)}`)
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 10 + "px")
          .style("display", "block")
      })
  }

  isExpanded() {
    return this.modal.classList.contains("is-open")
  }

  bindEvents() {
    this.expandBtn?.addEventListener("click", () => this.expand())

    this.modal?.addEventListener("click", (e) => {
      if (e.target?.dataset?.close === "true") this.collapse()
    })

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isExpanded()) this.collapse()
    })

    window.addEventListener("resize", () => {
      this.render()
    })
  }

  expand() {
    if (this.isExpanded()) return
    this.modalBody.appendChild(this.host)
    this.modal.classList.add("is-open")
    this.modal.setAttribute("aria-hidden", "false")
    this.tooltip.style("display", "none")
    this.render()
  }

  collapse() {
    if (!this.isExpanded()) return
    this.hostHome.appendChild(this.host)
    this.modal.classList.remove("is-open")
    this.modal.setAttribute("aria-hidden", "true")
    this.tooltip.style("display", "none")
    this.render()
  }
}

function portalToBody(el) {
  if (!el) return
  if (el.parentElement !== document.body) document.body.appendChild(el)
}
