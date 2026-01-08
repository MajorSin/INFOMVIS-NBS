class Filters {
  constructor(data) {
    this.startYearBounds = null
    this.yearRangeSlider = null

    this.init(data)
  }

  init(data) {
    d3.select("#clearEconomicImpacts").on("click", () => {
      this.getEconomicImpactCheckboxes().forEach((cb) => (cb.checked = false))
      window.selectedEconomicImpacts = []
      this.setEconomicImpactsText()
    })

    d3.select("#resetYearBtn").on("click", () => {
      window.yearRange = {
        min: this.startYearBounds.min,
        max: this.startYearBounds.max,
      }
      this.yearRangeSlider.value([
        this.startYearBounds.min,
        this.startYearBounds.max,
      ])
      this.updateStartYearUI()
    })

    d3.select("#searchInput").on(
      "input",
      (e) => (window.searchQuery = e.target.value)
    )

    this.economicImpactValues = [
      ...new Set(data.map((r) => r.__economicImpacts).flat()),
    ].sort((a, b) => a.localeCompare(b))

    this.wrangleData(this.transformData(data))
  }

  wrangleData(data) {
    this.startYearBounds = data.yearRange
    window._yearRange = data.yearRange

    this.yearRangeSlider = rangeSlider(d3.select("#yearRangeSlider").node(), {
      min: this.startYearBounds.min,
      max: this.startYearBounds.max,
      value: [window.yearRange.min, window.yearRange.max],
      onInput: (values) => {
        window.yearRange = { min: values[0], max: values[1] }
        this.updateStartYearUI()
      },
    })

    window._searchQuery = ""

    window._selectedEconomicImpacts = []

    this.render(data)
  }

  render(data) {
    d3.select("#startYearLabel").text(
      `${data.yearRange.min}–${data.yearRange.max}`
    )

    this.updateStartYearUI()

    this.buildEconomicImpactCheckboxes()

    this.renderKPI(data)
  }

  buildEconomicImpactCheckboxes() {
    for (const label of this.economicImpactValues) {
      const id = `imp_${label.replaceAll(/[^a-zA-Z0-9]+/g, "_")}`

      const item = document.createElement("label")
      item.className = "impactItem"
      item.setAttribute("for", id)

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = label
      checkbox.id = id

      checkbox.addEventListener("change", () => {
        window.selectedEconomicImpacts = this.getSelectedEconomicImpacts()
        this.setEconomicImpactsText()
      })

      const text = document.createElement("span")
      text.textContent = label

      item.appendChild(checkbox)
      item.appendChild(text)
      economicImpactCheckboxes.appendChild(item)
    }
  }

  renderKPI(data) {
    d3.select("#rowCount").text(data.rows)
    d3.select("#cityCount").text(data.cities)
    d3.select("#countryCount").text(data.countries)
    d3.select("#tableMeta").text(
      `Showing ${Math.min(data.rows, 250)} of ${data.rows}`
    )
  }

  update(data) {
    this.renderKPI(data)
  }

  getEconomicImpactCheckboxes() {
    return [
      ...d3
        .select("#economicImpactCheckboxes")
        .node()
        .querySelectorAll('input[type="checkbox"]'),
    ]
  }

  getSelectedEconomicImpacts() {
    return this.getEconomicImpactCheckboxes()
      .filter((cb) => cb.checked)
      .map((cb) => cb.value)
  }

  setEconomicImpactsText() {
    d3.select("#economicImpactMeta").text(
      `${window.selectedEconomicImpacts.length} selected`
    )
  }

  updateStartYearUI() {
    d3.select("#startYearMinVal").text(window.yearRange.min)
    d3.select("#startYearMaxVal").text(window.yearRange.max)
  }

  transformData(data) {
    const years = data.map((r) => r.start_year).filter(Number.isFinite)
    const wrangledData = {
      yearRange: { min: d3.min(years), max: d3.max(years) },
      rows: data.length,
      cities: new Set(data.map((d) => d.city)).size,
      countries: new Set(data.map((d) => d.country)).size,
    }
    return wrangledData
  }
}
