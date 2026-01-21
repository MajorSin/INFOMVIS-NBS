class ExplorationMode {
  constructor() {
    this.data = []
    this.filteredData = []
    this.filteredDataForMap = []
    this.topo = null

    this.exploreWrapper = d3.select("#exploreMode")
    this.compareWrapper = d3.select("#compareMode")

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

    Object.defineProperty(window, "costRange", {
      get: () => _costRange,
      set: (value) => {
        _costRange = value
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

    Object.defineProperty(window, "selectedCountries", {
      get: () => _selectedCountries,
      set: (value) => {
        _selectedCountries = value
        this.filterData()
        this.update()
      },
    })

    Object.defineProperty(window, "mode", {
      get: () => _mode,
      set: (value) => {
        _mode = value
        this.updateMode()
      },
    })

    Object.defineProperty(window, "selectedProjects", {
      get: () => _selectedProjects,
      set: (value) => {
        _selectedProjects = value
        this.components?.compareToolbar?.update(value) ?? null
      },
    })
  }

  async init() {
    Promise.all([this.loadRows(), this.loadWorldMap()]).then(() =>
      this.render(),
    )
    window._mode = "overview"
  }

  async loadWorldMap() {
    this.topo = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json",
    ).then((r) => r.json())
  }

  splitMultiValueField(v) {
    return v.trim().split(/[;,]+/) ?? []
  }

  async loadRows() {
    this.data = await d3
      .csv("./data/cleaned_nbs_data.csv", d3.autoType)
      .then((rows) =>
        rows.map((row) => ({
          city: row.city,
          cityPopulation: row.city_population,
          coordinates: row.coordinates
            .substring(1, row.coordinates.length - 1)
            .split(",")
            .map(Number)
            .reverse(),
          country: row.country,
          economicImpacts: row.economic_impacts
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
        })),
      )

    this.filteredData = this.data
    this.filteredDataForMap = this.data
  }

  render() {
    this.components = {
      filters: new Filters(this.filteredData),
      kpis: new KPIs(this.filteredData),
      results: new Results(this.filteredData),
      mapFilteredCities: new MapFilteredCities({
        rows: this.filteredData,
        topo: this.topo,
        geo: topojson.feature(this.topo, this.topo.objects.countries),
      }),
      lineChartModal: new LineChartPopout(this.filteredData),
      funding: new Funding(this.filteredData),
      compareToolbar: new CompareToolbar(),
      compare: new Compare(this.data),
    }

    const fundingComponent = this.components.funding
    // TODO: put this in funding  component and everything else in a list
    fundingComponent.fundingOptionsInput.on("change", (element) => {
      fundingComponent.currentOption = element.target.value
      fundingComponent.update(fundingComponent.transformData(this.filteredData))
    })

    const mapComponent = this.components.mapFilteredCities
    mapComponent.mapOptions.on("change", (element) => {
      mapComponent.currentOption = element.target.value
      mapComponent.update(mapComponent.transformData(this.filteredDataForMap))
    })
  }

  update() {
    this.components.filters.update()

    this.components.kpis.update(
      this.components.kpis.transformData(this.filteredData),
    )

    this.components.lineChartModal.update(
      this.components.lineChartModal.transformData(this.filteredData),
    )

    this.components.lineChartModal.update(
      this.components.lineChartModal.transformData(this.filteredData),
    )

    this.components.results.update(this.filteredData)
    this.components.mapFilteredCities.update(
      this.components.mapFilteredCities.transformData(this.filteredDataForMap),
    )
    this.components.funding.update(
      this.components.funding.transformData(this.filteredData),
    )

    if (window.mode == "compare") this.components.compare.update()
  }

  filterData() {
    const tempFiltered = this.data.filter((r) => {
      if (
        (r.startYear != null && r.startYear < window.yearRange.min) ||
        (r.endYear != null && r.endYear > window.yearRange.max)
      )
        return false

      const a = r.area
      if (Number.isFinite(a)) {
        if (a < window.nbsAreaRange.min || a > window.nbsAreaRange.max)
          return false
      }

      if (window.selectedEconomicImpacts.length > 0) {
        const passImpacts = window.selectedEconomicImpacts.every((impact) =>
          r.__economicImpacts.includes(impact),
        )
        if (!passImpacts) return false
      }

      if (window.selectedFundingSource.length > 0) {
        const passFundingSource = window.selectedFundingSource.every((fund) =>
          r.__sources_of_funding.includes(fund),
        )
        if (!passFundingSource) return false
      }

      if (window.selectedAreaTypes.length > 0) {
        const passAreaTypes = window.selectedAreaTypes.every((t) =>
          r.__areaTypes.includes(t),
        )
        if (!passAreaTypes) return false
      }

      const cost = r.cost
      if (Number.isFinite(cost)) {
        if (cost < window.costRange.min || cost > window.costRange.max) {
          return false
        }
      }

      return true
    })

    this.filteredDataForMap = tempFiltered

    // TODO: Decide on filtering all data or only selected for map
    this.filteredData = tempFiltered.filter(
      (r) =>
        (window.selectedCities.length <= 0 ||
          window.selectedCities.some((c) => r.city == c)) &&
        (window.selectedCountries.length <= 0 ||
          window.selectedCountries.some((c) => r.country == c)),
    )
  }

  updateMode() {
    if (window.mode == "compare") {
      this.compareWrapper.style("display", "block")
      this.exploreWrapper.style("display", "none")
    } else {
      this.compareWrapper.style("display", "none")
      this.exploreWrapper.style("display", "block")
    }
    this.update()
  }
}

new ExplorationMode().init()

function parseCost(value) {
  if (!value || value.toLowerCase() === "unknown") return null

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
