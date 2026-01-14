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
  }

  async init() {
    Promise.all([this.loadRows(), this.loadWorldMap()]).then(() => this.render())
  }

  async loadWorldMap() {
    const topo = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
    ).then((r) => r.json())
    this.worldmapData = topojson.feature(topo, topo.objects.countries)
  }

  parseAreaToM2(v) {
    if (v == null) return null
    const s = String(v).trim()

    const cleaned = s
      .replaceAll(",", "")
      .replaceAll(/\s/g, "")
      .replaceAll(/m\^?2|m²/gi, "")

    const num = Number(cleaned)
    return Number.isFinite(num) ? num : null
  }

  async loadRows() {
    this.data = await d3
      .csv("./data/cleaned_nbs_data.csv", d3.autoType)
      .then((rows) =>
        rows.map((row) => {
          const areaFromM2 = Number.isFinite(row.nbs_area_m2)
            ? row.nbs_area_m2
            : this.parseAreaToM2(row.nbs_area)

          return {
            ...row,
            __economicImpacts: row.economic_impacts
              ? row.economic_impacts.trim().split(";").map((s) => s.trim()).filter(Boolean)
              : [],
            __nbsAreaM2: areaFromM2,
            __areaTypes: row.type_of_area_before_implementation_of_the_nbs
              ? row.type_of_area_before_implementation_of_the_nbs
                  .split(/[,;]+/) // supports comma or semicolon lists
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
          }
        })
      )

    this.filteredData = this.data
    this.filteredDataForMap = this.data
  }

  render() {
    this.components = {
      filters: new Filters(this.filteredData),
      kpis: new KPIs(),
      results: new Results(this.filteredData),
      mapFilteredCities: new MapFilteredCities({
        rows: this.filteredData,
        geo: this.worldmapData,
      }),
    }
  }

  update() {
    const meta = this.components.filters.transformData(this.filteredData)

    this.components.filters.update(meta)
    this.components.kpis.update(meta)

    this.components.results.update(
      this.components.results.transformData(this.filteredData)
    )
    this.components.mapFilteredCities.update(
      this.components.mapFilteredCities.transformData(this.filteredDataForMap)
    )
  }

  filterData() {
    const tempFiltered = this.data.filter((r) => {
      // Year range filter
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

      // NBS area filter
      const a = r.__nbsAreaM2
      if (Number.isFinite(a)) {
        if (a < window.nbsAreaRange.min || a > window.nbsAreaRange.max)
          return false
      }

      // Economic impacts filter — AND semantics
      if (window.selectedEconomicImpacts.length > 0) {
        const passImpacts = window.selectedEconomicImpacts.every((impact) =>
          r.__economicImpacts.includes(impact)
        )
        if (!passImpacts) return false
      }

      // Area types filter — AND semantics (same rule as economic impacts)
      if (window.selectedAreaTypes.length > 0) {
        const passAreaTypes = window.selectedAreaTypes.every((t) =>
          r.__areaTypes.includes(t)
        )
        if (!passAreaTypes) return false
      }

      // Search filter
      const searchFields = [
        r.name_of_the_nbs_intervention_short_english_title,
        r.native_title_of_the_nbs_intervention,
        r.city,
        r.country,
        r.economic_impacts,
        r.type_of_area_before_implementation_of_the_nbs,
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
