class Filters {
  constructor(data) {
    this.startYearBounds = null
    this.yearRangeSlider = null

    this.nbsAreaBounds = null
    this.nbsAreaSlider = null

    this.economicImpactValues = []
    this.areaTypeValues = []
    this.totalCostValues = []
    this.fundingSourceValues = []

    window._searchQuery = ""
    window._selectedEconomicImpacts = []
    window._selectedAreaTypes = []
    window._selectedTotalCosts = []
    window._selectedFundingSource = []
    window._selectedCountries = []

    this.init(data)
  }

  init(data) {
    d3.select("#clearEconomicImpacts").on("click", () => {
      this.getEconomicImpactCheckboxes().forEach((cb) => (cb.checked = false))
      window.selectedEconomicImpacts = []
      this.setEconomicImpactsText()
    })

    d3.select("#clearAreaTypes").on("click", () => {
      this.getAreaTypeCheckboxes().forEach((cb) => (cb.checked = false))
      window.selectedAreaTypes = []
      this.setAreaTypesText()
    })

    d3.select("#clearTotalCosts").on("click", () => {
      this.getTotalCostCheckboxes().forEach((cb) => (cb.checked = false))
      window.selectedTotalCosts = []
      this.setTotalCostsText()
    })

    d3.select("#clearFundingSources").on("click", () => {
      this.getFundingSourceCheckboxes().forEach((cb) => (cb.checked = false))
      window.selectedFundingSource = []
      this.setFundingSourcesText()
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

    this.economicImpactValues = [
      ...new Set(data.map((r) => r.__economicImpacts).flat()),
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))

    this.areaTypeValues = [...new Set(data.map((r) => r.__areaTypes).flat())]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))

    this.totalCostValues = [...new Set(data.map((r) => r.total_cost))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))

    this.fundingSourceValues = [
      ...new Set(data.map((r) => r.__fundingSources || []).flat()),
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))

    this.wrangleData(this.transformData(data))
  }

  wrangleData(meta) {
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

    this.update()
  }

  update(meta) {
    this.updateStartYearUI()
    this.updateNbsAreaUI()

    this.buildEconomicImpactCheckboxes()
    this.setEconomicImpactsText()

    this.buildAreaTypeCheckboxes()
    this.setAreaTypesText()

    this.buildTotalCostCheckboxes()
    this.setTotalCostsText()

    this.buildFundingSourceCheckboxes()
    this.setFundingSourcesText()
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
      checkbox.checked = window.selectedEconomicImpacts.includes(label)

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

  buildAreaTypeCheckboxes() {
    const container = document.getElementById("areaTypeCheckboxes")
    container.innerHTML = ""

    for (const label of this.areaTypeValues) {
      const id = `area_${label.replaceAll(/[^a-zA-Z0-9]+/g, "_")}`

      const item = document.createElement("label")
      item.className = "impactItem"
      item.setAttribute("for", id)

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = label
      checkbox.id = id
      checkbox.checked = window.selectedAreaTypes.includes(label)

      checkbox.addEventListener("change", () => {
        window.selectedAreaTypes = this.getSelectedAreaTypes()
        this.setAreaTypesText()
      })

      const text = document.createElement("span")
      text.textContent = label

      item.appendChild(checkbox)
      item.appendChild(text)
      container.appendChild(item)
    }
  }

  getAreaTypeCheckboxes() {
    return [
      ...d3
        .select("#areaTypeCheckboxes")
        .node()
        .querySelectorAll('input[type="checkbox"]'),
    ]
  }

  getSelectedAreaTypes() {
    return this.getAreaTypeCheckboxes()
      .filter((cb) => cb.checked)
      .map((cb) => cb.value)
  }

  setAreaTypesText() {
    d3.select("#areaTypeMeta").text(
      `${window.selectedAreaTypes.length} selected`
    )
  }

  buildTotalCostCheckboxes() {
    const container = document.getElementById("totalCostCheckboxes")
    container.innerHTML = ""

    for (const label of this.totalCostValues) {
      const id = `cost_${label.replaceAll(/[^a-zA-Z0-9]+/g, "_")}`

      const item = document.createElement("label")
      item.className = "impactItem"
      item.setAttribute("for", id)

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = label
      checkbox.id = id

      checkbox.addEventListener("change", () => {
        window.selectedTotalCosts = this.getSelectedTotalCosts()
        this.setTotalCostsText()
      })

      const text = document.createElement("span")
      text.textContent = label

      item.appendChild(checkbox)
      item.appendChild(text)
      container.appendChild(item)
    }
  }

  getTotalCostCheckboxes() {
    return [
      ...d3
        .select("#totalCostCheckboxes")
        .node()
        .querySelectorAll('input[type="checkbox"]'),
    ]
  }

  getSelectedTotalCosts() {
    return this.getTotalCostCheckboxes()
      .filter((cb) => cb.checked)
      .map((cb) => cb.value)
  }

  setTotalCostsText() {
    d3.select("#totalCostMeta").text(
      `${window.selectedTotalCosts.length} selected`
    )
  }

  buildFundingSourceCheckboxes() {
    const container = document.getElementById("fundingSourceCheckboxes")
    container.innerHTML = ""

    for (const label of this.fundingSourceValues) {
      const id = `fund_${label.replaceAll(/[^a-zA-Z0-9]+/g, "_")}`

      const item = document.createElement("label")
      item.className = "impactItem"
      item.setAttribute("for", id)

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = label
      checkbox.id = id
      checkbox.checked = window.selectedFundingSource.includes(label)

      checkbox.addEventListener("change", () => {
        window.selectedFundingSource = this.getSelectedFundingSources()
        this.setFundingSourcesText()
      })

      const text = document.createElement("span")
      text.textContent = label

      item.appendChild(checkbox)
      item.appendChild(text)
      container.appendChild(item)
    }
  }

  getFundingSourceCheckboxes() {
    return [
      ...d3
        .select("#fundingSourceCheckboxes")
        .node()
        .querySelectorAll('input[type="checkbox"]'),
    ]
  }

  getSelectedFundingSources() {
    return this.getFundingSourceCheckboxes()
      .filter((cb) => cb.checked)
      .map((cb) => cb.value)
  }

  setFundingSourcesText() {
    d3.select("#fundingSourceMeta").text(
      `${window.selectedFundingSource.length} selected`
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
    const areas = data.map((r) => r.nbs_area_m2).filter(Number.isFinite)

    return {
      yearRange: { min: d3.min(years), max: d3.max(years) },
      nbsAreaRange: { min: d3.min(areas), max: d3.max(areas) },
      rows: data.length,
      cities: new Set(data.map((d) => d.city)).size,
      countries: new Set(data.map((d) => d.country)).size,
      fundingSources: data.flatMap((d) => d.__fundingSources || []),
    }
  }
}