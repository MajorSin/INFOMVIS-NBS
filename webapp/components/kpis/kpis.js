class KPIs {
  constructor() {}

  update(data) {
    d3.select("#rowCount").text(data.rows)
    d3.select("#cityCount").text(data.cities)
    d3.select("#countryCount").text(data.countries)
    d3.select("#tableMeta").text(
      `Showing ${Math.min(data.rows, 250)} of ${data.rows}`
    )
  }
}
