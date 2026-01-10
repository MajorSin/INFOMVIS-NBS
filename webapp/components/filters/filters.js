class Filters {
  constructor(data) {
    this.startYearBounds = null
    this.yearRangeSlider = null

    this.nbsAreaBounds = null
    this.nbsAreaSlider = null

    this.economicImpactValues = []

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

    d3.select("#resetNbsAreaBtn").on("click", () => {
      window.nbsAreaRange = {
        min: this.nbsAreaBounds.min,
        max: this.nbsAreaBounds.max,
      }
      this.nbsAreaSlider.value([this.nbsAreaBounds.min, this.nbsAreaBounds.max])
      this.updateNbsAreaUI()
    })

    d3.select("#searchInput").on("input", (e) => {
      window.searchQuery = (e.target.value || "").toLowerCase()
    })

    // derive economic impact values from rows
    this.economicImpactValues = [
      ...new Set(data.map((r) => r.__economicImpacts).flat()),
    ].sort((a, b) => a.localeCompare(b))

    // compute bounds/meta from the dataset
    this.wrangleData(this.transformData(data))
  }

  wrangleData(meta) {
    // initialize backing globals so first reads are safe
    this.startYearBounds = meta.yearRange
    window._yearRange = meta.yearRange

    this.nbsAreaBounds = meta.nbsAreaRange
    window._nbsAreaRange = meta.nbsAreaRange

    this.yearRangeSlider = rangeSlider(d3.select("#yearRangeSlider").node(), {
      min: this.startYearBounds.min,
      max: this.startYearBounds.max,
      value: [this.startYearBounds.min, this.startYearBounds.max],
      onInput: (values) => {
        window.yearRange = { min: values[0], max: values[1] }
        this.updateStartYearUI()
      },
    })

    this.nbsAreaSlider = rangeSlider(d3.select("#nbsAreaSlider").node(), {
      min: this.nbsAreaBounds.min,
      max: this.nbsAreaBounds.max,
      value: [this.nbsAreaBounds.min, this.nbsAreaBounds.max],
      onInput: (values) => {
        window.nbsAreaRange = { min: values[0], max: values[1] }
        this.updateNbsAreaUI()
      },
    })

    // initialize other backing globals (keep your existing model)
    window._searchQuery = ""
    window._selectedEconomicImpacts = []

    this.render(meta)
  }

  render(meta) {
    d3.select("#startYearLabel").text(
      `${meta.yearRange.min}–${meta.yearRange.max}`
    )

    d3.select("#nbsAreaLabel").text(
      `${this.formatArea(meta.nbsAreaRange.min)}–${this.formatArea(
        meta.nbsAreaRange.max
      )}`
    )

    this.updateStartYearUI()
    this.updateNbsAreaUI()

    this.buildEconomicImpactCheckboxes()
    this.setEconomicImpactsText()
  }

  update(meta) {
    // Optional hook if you later want the labels to reflect filtered bounds.
    // Right now, leave as-is.
  }

  buildEconomicImpactCheckboxes() {
    const container = document.getElementById("economicImpactCheckboxes")
    container.innerHTML = ""

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
      container.appendChild(item)
    }
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

  formatArea(v) {
    if (!Number.isFinite(v)) return "—"
    return `${Math.round(v).toLocaleString()}`
  }

  updateNbsAreaUI() {
    d3.select("#nbsAreaMinVal").text(this.formatArea(window.nbsAreaRange.min))
    d3.select("#nbsAreaMaxVal").text(this.formatArea(window.nbsAreaRange.max))
  }

  transformData(data) {
    const years = data.map((r) => r.start_year).filter(Number.isFinite)
    const areas = data.map((r) => r.__nbsAreaM2).filter(Number.isFinite)

    return {
      yearRange: { min: d3.min(years), max: d3.max(years) },
      nbsAreaRange: { min: d3.min(areas), max: d3.max(areas) },
      rows: data.length,
      cities: new Set(data.map((d) => d.city)).size,
      countries: new Set(data.map((d) => d.country)).size,
    }
  }
}
