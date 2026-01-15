class KPIs {
  constructor(data) {
    this.update(this.transformData(data))
  }

  update(data) {
    d3.select("#rowCount").text(data.rows)
    d3.select("#cityCount").text(data.cities)
    d3.select("#countryCount").text(data.countries)
  }

  transformData(data) {
    const years = data.map((r) => r.start_year).filter(Number.isFinite)
    const wrangledData = {
      yearRange: { min: d3.min(years), max: d3.max(years) },
      rows: data.length,
      cities: new Set(data.map((d) => d.city)).size,
      countries: new Set(data.map((d) => d.country)).size,
    }
    return wrangledData
  }
}
