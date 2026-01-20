class Compare {
  constructor(data) {
    this.data = data

    this.table = d3.select("#compareTable")
    this.thead = d3.select("#compareTable thead tr")
    this.tbody = d3.select("#compareTable tbody")
    this.showDifferentFields = false

    this.columns = [
      "name_of_the_nbs_intervention_short_english_title",
      "native_title_of_the_nbs_intervention",
      "short_description_of_the_intervention",
      "city",
      "country",
      "city_population",
      "start_year",
      "end_year",
      "duration",
      "total_cost",
      "sources_of_funding",
      "spatial_scale",
      "nbs_area_m2",
      "type_of_area_before_implementation_of_the_nbs",
      "present_stage_of_the_intervention",
      "nbs_intervention_implemented_in_response_to_a_local_regulation_strategy_plan",
      "nbs_intervention_implemented_in_response_to_a_national_regulations_strategy_plan",
      "nbs_intervention_implemented_in_response_to_an_eu_directive_strategy",
      "primary_beneficiaries",
      "social_and_cultural_impacts",
      "environmental_impacts",
      "focus_of_the_project",
      "goals_of_the_intervention",
      "governance_arrangements",
      "implementation_activities",
      "sustainability_challenges_addressed",
      "key_actors_initiating_organization",
      "last_updated",
      "link",
    ]

    this.init()
  }

  init() {
    d3.select("#backToExplore").on("click", () => (window.mode = "explore"))
    d3.select("#differentFieldsSlider").on("change", (e) =>
      this.setDifferentTarget(e.target.checked),
    )
  }

  update() {
    this.render(this.transformData())
  }

  render(rows) {
    this.thead
      .selectAll("th")
      .data(rows.name_of_the_nbs_intervention_short_english_title)
      .join(
        (enter) => enter.append("th").text((d) => d),
        (update) => update.text((d) => d),
        (exit) => exit.remove(),
      )

    const columnsToShow = Object.keys(rows)

    this.tbody
      .selectAll("tr")
      .data(this.columns.filter((c) => columnsToShow.includes(c)))
      .join("tr")
      .selectAll("td")
      .data((column) => rows[column])
      .join("td")
      .text((d) => d ?? "")
  }

  transformData() {
    const data = this.data
      .filter((r) => window.selectedProjects.includes(r[""]))
      .reduce((acc, obj) => {
        Object.keys(obj).forEach((key) => {
          if (!acc[key]) acc[key] = []
          acc[key].push(obj[key])
        })
        return acc
      }, {})

    return this.showDifferentFields
      ? Object.fromEntries(
          Object.entries(data).filter(([key, arr]) => new Set(arr).size > 1),
        )
      : data
  }

  setDifferentTarget(value) {
    this.showDifferentFields = value
    this.update()
  }
}
