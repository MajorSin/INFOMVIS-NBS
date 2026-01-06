// Todo: This has to be fetched from the csv file
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
]

class Filters {
  constructor(data) {
    this.originalData = data

    this.impactCheckboxes = d3.select("#impactCheckboxes").node()

    this.startYearBounds = null
    this.yearRange = null

    d3.select("#resetStartYearBtn").on("click", () => {
      this.yearRange = this.startYearBounds
      this.yearRangeSlider.value([
        this.startYearBounds.min,
        this.startYearBounds.max,
      ])
      this.updateStartYearUI()
    })

    this.components = [new Results(), new MapFilteredCities()]

    this.init()
  }

  init() {
    d3.select("#clearBtn").on("click", () => {
      this.getImpactCheckboxes().forEach((cb) => (cb.checked = false))
      this.getSelectedImpactsText()
      this.applyFilters()
    })

    d3.select("#searchInput").on("input", () => this.applyFilters())

    this.wrangleData()
  }

  wrangleData() {
    const years = this.originalData
      .map((r) => r.start_year)
      .filter(Number.isFinite)
    this.startYearBounds = { min: Math.min(...years), max: Math.max(...years) }
    this.yearRange = { min: Math.min(...years), max: Math.max(...years) }

    this.yearRangeSlider = rangeSlider(d3.select("#rangeSlider").node(), {
      min: this.startYearBounds.min,
      max: this.startYearBounds.max,
      value: [this.yearRange.min, this.yearRange.max],
      onInput: (values) => {
        this.yearRange = { min: values[0], max: values[1] }
        this.updateStartYearUI()
        this.applyFilters()
      },
    })

    this.update()
  }

  update() {
    d3.select("#startYearLabel").text(`${this.startYearBounds.min}–${this.startYearBounds.max}`)

    this.updateStartYearUI()

    this.buildImpactCheckboxes()
  }

  buildImpactCheckboxes() {
    for (const label of ATOMIC_IMPACTS) {
      const id = `imp_${label.replaceAll(/[^a-zA-Z0-9]+/g, "_")}`

      const item = document.createElement("label")
      item.className = "impactItem"
      item.setAttribute("for", id)

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = label
      checkbox.id = id

      checkbox.addEventListener("change", () => {
        this.getSelectedImpactsText()
        this.applyFilters()
      })

      const text = document.createElement("span")
      text.textContent = label

      item.appendChild(checkbox)
      item.appendChild(text)
      impactCheckboxes.appendChild(item)
    }

    this.applyFilters()
  }

  applyFilters() {
    const selectedImpacts = this.getSelectedImpacts()
    const searchQuery = d3.select("#searchInput").property("value").trim().toLowerCase()

    this.data = this.originalData.filter((r) => {
      if (r.start_year != null && r.end_year != null) {
        if (
          r.start_year < this.yearRange.min ||
          r.end_year > this.yearRange.max
        )
          return false
      } else if (r.start_year != null && r.end_year == null) {
        if (
          r.start_year < this.yearRange.min ||
          r.start_year > this.yearRange.max
        )
          return false
      } else if (r.start_year == null && r.end_year != null) {
        if (r.end_year < this.yearRange.min || r.end_year > this.yearRange.max)
          return false
      }

      if (selectedImpacts.length > 0) {
        const passImpacts = selectedImpacts.every((impact) =>
          r.__economicImpacts.includes(impact)
        )
        if (!passImpacts) return false
      }

      if (!searchQuery) return true
      const hay = [
        r.name_of_the_nbs_intervention_short_english_title,
        r.native_title_of_the_nbs_intervention,
        r.city,
        r.country,
        r.economic_impacts,
      ]
        .map((x) => x?.toLowerCase())
        .join(",")
      return hay.includes(searchQuery)
    })

    this.components.forEach((component) => component.init(this.data))
    this.renderKPIs()
  }

  renderKPIs() {
    d3.select("#rowCount").text(this.data.length)
    d3.select("#cityCount").text(new Set(
      this.data.map((d) => d.city)
    ).size)
    d3.select("#countryCount").text(new Set(
      this.data.map((d) => d.country)
    ).size)
    d3.select("#tableMeta").text(`Showing ${Math.min(this.data.length, 250)} of ${
      this.data.length
    }`)
  }

  getImpactCheckboxes() {
    return [...this.impactCheckboxes.querySelectorAll('input[type="checkbox"]')]
  }

  getSelectedImpacts() {
    return this.getImpactCheckboxes()
      .filter((cb) => cb.checked)
      .map((cb) => cb.value)
  }

  getSelectedImpactsText() {
    d3.select("#impactMeta").text(`${this.getSelectedImpacts().length} selected`)
  }

  updateStartYearUI() {
    d3.select("#startYearMinVal").text(this.yearRange.min)
    d3.select("#startYearMaxVal").text(this.yearRange.max)
  }
}
