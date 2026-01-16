class ExplorationMode {
  constructor() {
    this.data = []
    this.filteredData = []
    this.filteredDataForMap = []
    this.worldmapData = null

    this.components = null

    Object.defineProperty(window, "selectedEconomicImpacts", {
      get: () => _selectedEconomicImpacts,
      set: (value) => {
        _selectedEconomicImpacts = value
        this.filterData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedAreaTypes", {
      get: () => _selectedAreaTypes,
      set: (value) => {
        _selectedAreaTypes = value
        this.filterData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedTotalCosts", {
      get: () => _selectedTotalCosts,
      set: (value) => {
        _selectedTotalCosts = value
        this.filterData()
        this.update()
      },
    })

    Object.defineProperty(window, "yearRange", {
      get: () => _yearRange,
      set: (value) => {
        _yearRange = value
        this.filterData()
        this.update()
      },
    })

    Object.defineProperty(window, "nbsAreaRange", {
      get: () => _nbsAreaRange,
      set: (value) => {
        _nbsAreaRange = value
        this.filterData()
        this.update()
      },
    })

    Object.defineProperty(window, "searchQuery", {
      get: () => _searchQuery,
      set: (value) => {
        _searchQuery = value
        this.filterData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedCities", {
      get: () => _selectedCities,
      set: (value) => {
        _selectedCities = value
        this.filterData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedFundingSource", {
      get: () => _selectedFundingSource,
      set: (value) => {
        _selectedFundingSource = value
        this.filterData()
        this.update()
      },
    })
  }

  async init() {
    Promise.all([this.loadRows(), this.loadWorldMap()]).then(() =>
      this.render()
    )
  }

  async loadWorldMap() {
    const topo = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
    ).then((r) => r.json())
    this.worldmapData = topojson.feature(topo, topo.objects.countries)
  }

  splitMultiValueField(v) {
    if (v == null) return []
    const s = String(v).trim()
    if (!s) return []
    return s
      .split(/[;,]+/)
      .map((x) => x.trim())
      .filter(Boolean)
  }

  async loadRows() {
    this.data = await d3
      .csv("./data/cleaned_nbs_data.csv", d3.autoType)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          cost: parseCostD3(row.total_cost),
          __sources_of_funding: row.sources_of_funding.trim().split(";"),
          __economicImpacts: row.economic_impacts
            ? row.economic_impacts
                .trim()
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          __areaTypes: row.type_of_area_before_implementation_of_the_nbs
            ? row.type_of_area_before_implementation_of_the_nbs
                .split(/[,;]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          __fundingSources: this.splitMultiValueField(row.sources_of_funding),
        }))
      )

    this.filteredData = this.data
    this.filteredDataForMap = this.data
  }

  render() {
    this.components = {
      filters: new Filters(this.filteredData),
      kpis: new KPIs(this.filteredData),
      results: new Results(this.filteredData),
      mapSimilarityBands: new MapSimilarityBands({
        rows: this.filteredData,
        geo: this.worldmapData,
      })
    }
  }

  update() {
    this.components.filters.update()

    this.components.kpis.update(
      this.components.kpis.transformData(this.filteredData)
    )

    this.components.results.update(
      this.components.results.transformData(this.filteredData)
    )
    this.components.mapSimilarityBands.update(
      this.components.mapSimilarityBands.transformData(this.filteredDataForMap)
    )
    this.components.funding.update(
      this.components.funding.transformData(this.filteredData)
    )
  }

  filterData() {
    const tempFiltered = this.data.filter((r) => {
      if (r.start_year != null && r.end_year != null) {
        if (
          r.start_year < window.yearRange.min ||
          r.end_year > window.yearRange.max
        )
          return false
      } else if (r.start_year != null && r.end_year == null) {
        if (
          r.start_year < window.yearRange.min ||
          r.start_year > window.yearRange.max
        )
          return false
      } else if (r.start_year == null && r.end_year != null) {
        if (
          r.end_year < window.yearRange.min ||
          r.end_year > window.yearRange.max
        )
          return false
      }

      const a = r.nbs_area_m2
      if (Number.isFinite(a)) {
        if (a < window.nbsAreaRange.min || a > window.nbsAreaRange.max)
          return false
      }

      if (window.selectedEconomicImpacts.length > 0) {
        const passImpacts = window.selectedEconomicImpacts.every((impact) =>
          r.__economicImpacts.includes(impact)
        )
        if (!passImpacts) return false
      }

      if (window.selectedFundingSource.length > 0) {
        const passFundingSource = window.selectedFundingSource.every((fund) =>
          r.__sources_of_funding.includes(fund)
        )
        if (!passFundingSource) return false
      }

      if (window.selectedAreaTypes.length > 0) {
        const passAreaTypes = window.selectedAreaTypes.every((t) =>
          r.__areaTypes.includes(t)
        )
        if (!passAreaTypes) return false
      }

      if (window.selectedTotalCosts && window.selectedTotalCosts.length > 0) {
        if (!window.selectedTotalCosts.includes(r.total_cost)) return false
      }

      const searchFields = [
        r.name_of_the_nbs_intervention_short_english_title,
        r.native_title_of_the_nbs_intervention,
        r.city,
        r.country,
        r.economic_impacts,
        r.type_of_area_before_implementation_of_the_nbs,
        r.total_cost,
        r.sources_of_funding,
      ]
        .map((x) => x?.toLowerCase())
        .join(",")

      return searchFields.includes(window.searchQuery)
    })

    this.filteredDataForMap = tempFiltered

    this.filteredData =
      window.selectedCities.length > 0
        ? tempFiltered.filter((r) =>
            window.selectedCities.some((c) => r.city == c)
          )
        : tempFiltered
  }
}

new ExplorationMode().init()

function parseCostD3(value) {
  if (!value || value.toLowerCase() === "unknown") {
    return null
  }

  const normalized = value
    .toLowerCase()
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim()

  const numbers = normalized.match(/\d+/g)?.map(Number) ?? []

  return numbers.length == 2
    ? d3.mean(numbers)
    : numbers.length == 1
    ? numbers[0]
    : null
}
