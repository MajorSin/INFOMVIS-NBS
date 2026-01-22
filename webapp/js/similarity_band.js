class ExplorationMode {
  constructor() {
    this.data = []
    this.filteredData = []
    this.filteredDataForMap = []
    this.worldmapData = null

    this.components = null

    var _selectedProjects =
      typeof _selectedProjects !== "undefined" &&
      Array.isArray(_selectedProjects)
        ? _selectedProjects
        : []

    window._selectedProjects = _selectedProjects

    Object.defineProperty(window, "selectedProjects", {
      get: () => _selectedProjects,
      set: (value) => {
        _selectedProjects = Array.isArray(value) ? value : []
        window._selectedProjects = _selectedProjects
        this.components?.compareToolbar?.update(_selectedProjects) ?? null
      },
    })

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

    var _selectedCountries =
      typeof _selectedCountries !== "undefined" &&
      Array.isArray(_selectedCountries)
        ? _selectedCountries
        : []

    window._selectedCountries = _selectedCountries
    window.selectedCountries = _selectedCountries

    var _costRange =
      typeof _costRange !== "undefined" &&
      _costRange &&
      typeof _costRange === "object"
        ? _costRange
        : { min: -Infinity, max: Infinity }

    window._costRange = _costRange
    window.costRange = _costRange

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
      this.render(),
    )
  }

  async loadWorldMap() {
    const topo = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json",
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
          id: row[""],
          title: row.name_of_the_nbs_intervention_short_english_title,
          description: row.short_description_of_the_intervention,
          nativeTitle: row.native_title_of_the_nbs_intervention,
          city: row.city,
          cityPopulation: row.city_population,
          coordinates: row.coordinates
            .substring(1, row.coordinates.length - 1)
            .split(",")
            .map(Number)
            .reverse(),
          country: row.country,
          economicImpacts: this.splitMultiValueField(row.economic_impacts),
          areaTypes: this.splitMultiValueField(
            row.type_of_area_before_implementation_of_the_nbs,
          ),
          fundingSources: this.splitMultiValueField(row.sources_of_funding),
          startYear: row.start_year,
          endYear: row.end_year,
          area: row.nbs_area_m2,
          cost: parseCost(row.total_cost),
          duration: row.duration,
          cityPopulation: row.city_population,
          spatialScale: row.spatial_scale,
          presentStage: row.present_stage_of_the_intervention,
          responseToLocalRegulation:
            row.nbs_intervention_implemented_in_response_to_a_local_regulation_strategy_plan,
          responseToNationalRegulation:
            row.nbs_intervention_implemented_in_response_to_a_national_regulations_strategy_plan,
          responseToEURegulation:
            row.nbs_intervention_implemented_in_response_to_an_eu_directive_strategy,
          primaryBeneficiaries: this.splitMultiValueField(
            row.primary_beneficiaries,
          ),
          socialCulturalImpacts: this.splitMultiValueField(
            row.social_and_cultural_impacts,
          ),
          environmentalImpacts: this.splitMultiValueField(
            row.environmental_impacts,
          ),
          focus: this.splitMultiValueField(row.focus_of_the_project),
          goals: this.splitMultiValueField(row.goals_of_the_intervention),
          governanceArrangements: this.splitMultiValueField(
            row.governance_arrangements,
          ),
          implementationActivities: this.splitMultiValueField(
            row.implementation_activities,
          ),
          sustainabilityChallengesAddressed: this.splitMultiValueField(
            row.sustainability_challenges_addressed,
          ),
          keyActors: this.splitMultiValueField(
            row.key_actors_initiating_organization,
          ),
          lastUpdated: Date.parse(row.last_updated),
          link: row.link,
        })),
      )

    this.filteredData = this.data
    this.filteredDataForMap = this.data
  }

  render() {
    this.components = {
      filters: new Filters(this.filteredData),
      kpis: new KPI(this.filteredData),
      results: new Table(this.filteredData),
      mapSimilarityBands: new MapSimilarityBands({
        rows: this.filteredData,
        geo: this.worldmapData,
      }),
    }
  }

  update() {
    if (!this.components) return

    this.components.filters.update()
    this.components.kpis.wrangleData([...this.filteredData])
    this.components.results.wrangleData([...this.filteredData])
    this.components.mapSimilarityBands.update(
      this.components.mapSimilarityBands.transformData(this.filteredDataForMap),
    )
  }

  filterData() {
    const tempFiltered = this.data.filter((r) => {
      if (r.startYear != null && r.startYear < window.yearRange.min) {
        return false
      }
      if (r.endYear != null && r.endYear > window.yearRange.max) return false

      const a = r.area
      if (Number.isFinite(a)) {
        if (a < window.nbsAreaRange.min || a > window.nbsAreaRange.max)
          return false
      }

      if (window.selectedEconomicImpacts.length > 0) {
        const passImpacts = window.selectedEconomicImpacts.every((impact) =>
          r.economicImpacts.includes(impact),
        )
        if (!passImpacts) return false
      }

      if (window.selectedFundingSource.length > 0) {
        const passFundingSource = window.selectedFundingSource.every((fund) =>
          r.fundingSources.includes(fund),
        )
        if (!passFundingSource) return false
      }

      if (window.selectedAreaTypes.length > 0) {
        const passAreaTypes = window.selectedAreaTypes.every((t) =>
          r.areaTypes.includes(t),
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

    this.filteredDataForMap = [...tempFiltered]

    this.filteredData = tempFiltered.filter(
      (r) =>
        (window.selectedCities.length <= 0 ||
          window.selectedCities.some((c) => r.city == c)) &&
        (window.selectedCountries.length <= 0 ||
          window.selectedCountries.some((c) => r.country == c)),
    )
  }
}

new ExplorationMode().init()
