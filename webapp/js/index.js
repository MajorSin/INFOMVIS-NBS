class ExplorationMode {
  constructor() {
    this.data = []
    this.filteredData = []
    this.filteredDataForMap = []
    this.topo = null

    this.exploreWrapper = d3.select("#exploreMode")
    this.compareWrapper = d3.select("#compareMode")

    this.components = null
  }

  async init() {
    Object.defineProperty(window, "selectedEconomicImpacts", {
      get: () => _selectedEconomicImpacts,
      set: (value) => {
        _selectedEconomicImpacts = value
        this.wrangleData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedAreaTypes", {
      get: () => _selectedAreaTypes,
      set: (value) => {
        _selectedAreaTypes = value
        this.wrangleData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedTotalCosts", {
      get: () => _selectedTotalCosts,
      set: (value) => {
        _selectedTotalCosts = value
        this.wrangleData()
        this.update()
      },
    })

    Object.defineProperty(window, "yearRange", {
      get: () => _yearRange,
      set: (value) => {
        _yearRange = value
        this.wrangleData()
        this.update()
      },
    })

    Object.defineProperty(window, "nbsAreaRange", {
      get: () => _nbsAreaRange,
      set: (value) => {
        _nbsAreaRange = value
        this.wrangleData()
        this.update()
      },
    })

    Object.defineProperty(window, "costRange", {
      get: () => _costRange,
      set: (value) => {
        _costRange = value
        this.wrangleData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedCities", {
      get: () => _selectedCities,
      set: (value) => {
        _selectedCities = value
        this.wrangleData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedFundingSource", {
      get: () => _selectedFundingSource,
      set: (value) => {
        _selectedFundingSource = value
        this.wrangleData()
        this.update()
      },
    })

    Object.defineProperty(window, "selectedCountries", {
      get: () => _selectedCountries,
      set: (value) => {
        _selectedCountries = value
        this.wrangleData()
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
        this.components?.compareToolbar?.wrangleData(value) ?? null
      },
    })
    window._mode = "overview"

    Promise.all([this.loadData(), this.loadWorldMap()]).then((data) => {
      this.data = [...data[0]]
      this.filteredData = [...data[0]]
      this.filteredDataForMap = [...data[0]]
      this.render(data[1])
    })
  }

  async loadWorldMap() {
    return await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json",
    ).then((r) => r.json())
  }

  async loadData() {
    return await d3
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
          economicImpacts: splitMultiValueField(row.economic_impacts),
          areaTypes: splitMultiValueField(
            row.type_of_area_before_implementation_of_the_nbs,
          ),
          fundingSources: splitMultiValueField(row.sources_of_funding),
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
          primaryBeneficiaries: splitMultiValueField(row.primary_beneficiaries),
          socialCulturalImpacts: splitMultiValueField(
            row.social_and_cultural_impacts,
          ),
          environmentalImpacts: splitMultiValueField(row.environmental_impacts),
          focus: splitMultiValueField(row.focus_of_the_project),
          goals: row.goals_of_the_intervention,
          governanceArrangements: row.governance_arrangements,
          implementationActivities: row.implementation_activities,
          sustainabilityChallengesAddressed: splitMultiValueField(
            row.sustainability_challenges_addressed,
          ),
          keyActors: splitMultiValueField(
            row.key_actors_initiating_organization,
          ),
          lastUpdated: new Date(row.last_updated),
          link: row.link,
        })),
      )
  }

  render(geo) {
    this.components = {
      filters: new Filters([...this.data]),
      kpi: new KPI([...this.data]),
      table: new Table([...this.data]),
      projectsMap: new ProjectsMap({
        rows: [...this.data],
        topo: geo,
      }),
      lineChartModal: new LineChartPopout([...this.data]),
      fundingSources: new FundingSources([...this.data]),
      compareToolbar: new CompareToolbar(),
      compareTable: new CompareTable([...this.data]),
    }
  }

  update() {
    this.components.projectsMap.wrangleData([...this.filteredDataForMap])
    this.components.kpi.wrangleData([...this.filteredData])
    this.components.table.wrangleData([...this.filteredData])
    this.components.fundingSources.wrangleData([...this.filteredData])
    this.components.filters.update()
    this.components.lineChartModal.update(
      this.components.lineChartModal.transformData(this.filteredData),
    )

    if (window.mode == "compare") this.components.compareTable.wrangleData()
  }

  wrangleData() {
    const {
      yearRange,
      nbsAreaRange,
      costRange,
      selectedEconomicImpacts,
      selectedFundingSource,
      selectedAreaTypes,
      selectedCities,
      selectedCountries,
    } = window

    const hasEconomicImpacts = selectedEconomicImpacts.length > 0
    const hasFundingSource = selectedFundingSource.length > 0
    const hasAreaTypes = selectedAreaTypes.length > 0
    const hasCities = selectedCities.length > 0
    const hasCountries = selectedCountries.length > 0

    const citiesSet = new Set(selectedCities)
    const countriesSet = new Set(selectedCountries)

    const filtered = this.data.filter(
      (r) =>
        !(r.startYear != null && r.startYear < yearRange.min) &&
        !(r.endYear != null && r.endYear > yearRange.max) &&
        !(
          Number.isFinite(r.area) &&
          (r.area < nbsAreaRange.min || r.area > nbsAreaRange.max)
        ) &&
        !(
          Number.isFinite(r.cost) &&
          (r.cost < costRange.min || r.cost > costRange.max)
        ) &&
        !(
          hasEconomicImpacts &&
          !selectedEconomicImpacts.every((i) => r.economicImpacts.includes(i))
        ) &&
        !(
          hasFundingSource &&
          !selectedFundingSource.every((f) => r.fundingSources.includes(f))
        ) &&
        !(
          hasAreaTypes &&
          !selectedAreaTypes.every((t) => r.areaTypes.includes(t))
        ),
    )

    this.filteredDataForMap = [...filtered]

    this.filteredData = filtered.filter(
      (r) =>
        (!hasCities || citiesSet.has(r.city)) &&
        (!hasCountries || countriesSet.has(r.country)),
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
