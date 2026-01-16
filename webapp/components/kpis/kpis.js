class KPIs {
  constructor(data) {
    this.update(this.transformData(data))
  }

  update(data) {
    d3.select("#rowCount").text(data.rows)
    d3.select("#cityCount").text(data.cities)
    d3.select("#countryCount").text(data.countries)
    d3.select("#topFundingSource").text(
      this.getTopFundingSource(data.fundingSources) ?? "—"
    )
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

  getTopFundingSource(fundingSources) {
    if (!fundingSources || fundingSources.length === 0) return null

    const counts = new Map()

    for (const src of fundingSources) {
      if (!src || src.toLowerCase() === "unknown") continue
      counts.set(src, (counts.get(src) || 0) + 1)
    }

    if (counts.size === 0) return null

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  }
}
