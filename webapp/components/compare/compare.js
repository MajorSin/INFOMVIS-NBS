class Compare {
  constructor(data) {
    this.data = data

    this.table = d3.select("#compareTable")
    this.thead = d3.select("#compareTable thead tr")
    this.tbody = d3.select("#compareTable tbody")

    this.columns = [
      "name_of_the_nbs_intervention_short_english_title",
      "city",
      "country",
      "start_year",
      "end_year",
    ]

    this.init()
  }

  init() {
    d3.select("#backToExplore").on("click", () => (window.mode = "explore"))
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

    this.tbody
      .selectAll("tr")
      .data(this.columns)
      .join(
        (enter) =>
          enter
            .append("tr")
            .selectAll("td")
            .data((column) => rows[column])
            .join(
              (enter) => enter.append("td").text((d) => d ?? ""),
              (update) => update.text((d) => d ?? ""),
              (exit) => exit.remove(),
            ),
        (update) => {},
        (exit) => exit.remove(),
      )
  }

  transformData() {
    return this.data
      .filter((r) => window.selectedProjects.includes(r[""]))
      .reduce((acc, obj) => {
        Object.keys(obj).forEach((key) => {
          if (!acc[key]) acc[key] = []
          acc[key].push(obj[key])
        })
        return acc
      }, {})
  }
}
