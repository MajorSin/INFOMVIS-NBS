class KPIs {
  constructor() {}

  update(data) {
    d3.select("#rowCount").text(data.rows)
    d3.select("#cityCount").text(data.cities)
    d3.select("#countryCount").text(data.countries)

    d3.select("#tableMeta").text(
      `Showing ${Math.min(data.rows, 250)} of ${data.rows}`
    )

    const topFunding = this.getTopFundingSource(data.fundingSources)
    d3.select("#topFundingSource").text(topFunding ?? "—")
  }

  getTopFundingSource(fundingSources) {
    if (!fundingSources || fundingSources.length === 0) return null

    const counts = new Map()

    for (const src of fundingSources) {
      if (!src || src.toLowerCase() === "unknown") continue
      counts.set(src, (counts.get(src) || 0) + 1)
    }

    if (counts.size === 0) return null

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])[0][0]
  }
}
