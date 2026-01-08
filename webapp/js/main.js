class ExplorationMode {
  constructor() {
    this.startYearBounds = null
    this.data = []
    this.filteredData = []
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

    Object.defineProperty(window, "yearRange", {
      get: () => _yearRange,
      set: (value) => {
        _yearRange = value
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

  async loadRows() {
    this.data = await d3
      .csv("./data/cleaned_nbs_data.csv", d3.autoType)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          __sources_of_funding: row.sources_of_funding.trim().split(";"),
          __economicImpacts: row.economic_impacts
            ? row.economic_impacts.trim().split(";")
            : [],
        }))
      )

    this.filteredData = this.data
    this.filteredDataForMap = this.data
  }

  render() {
    this.components = {
      filters: new Filters(this.filteredData),
      results: new Results(this.filteredData),
      mapFilteredCities: new MapFilteredCities({
        rows: this.filteredData,
        geo: this.worldmapData,
      }),
      funding: new Funding(this.filteredData),
    }
  }

  update() {
    this.components.filters.update(
      this.components.filters.transformData(this.filteredData)
    )
    this.components.results.update(
      this.components.results.transformData(this.filteredData)
    )
    this.components.mapFilteredCities.update(
      this.components.mapFilteredCities.transformData(this.filteredDataForMap)
    )
    this.components.funding.update(
      this.components.funding.transformData(this.filteredData)
    )
  }

  filterData() {
    let tempFiltered = this.data.filter((r) => {
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

      if (window.selectedEconomicImpacts.length > 0) {
        const passImpacts = window.selectedEconomicImpacts.every((impact) =>
          r.__economicImpacts.includes(impact)
        )
        if (!passImpacts) return false
      }

      const searchFields = [
        r.name_of_the_nbs_intervention_short_english_title,
        r.native_title_of_the_nbs_intervention,
        r.city,
        r.country,
        r.economic_impacts,
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
