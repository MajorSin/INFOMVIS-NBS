class KPIs {
  constructor(data) {
    this.update(this.transformData(data))
  }

  update(data) {
    d3.select("#rowCount").text(data.rows)
    d3.select("#cityCount").text(data.cities)
    d3.select("#countryCount").text(data.countries)
    d3.select("#topFundingSource").text(data.topFundingSource)
  }

  transformData(data) {
    const years = data.map((r) => r.startYear).filter(Number.isFinite)
    const wrangledData = {
      yearRange: { min: d3.min(years), max: d3.max(years) },
      rows: data.length,
      cities: new Set(data.map((d) => d.city)).size,
      countries: new Set(data.map((d) => d.country)).size,
      topFundingSource: this.mostFrequent(data),
    }
    return wrangledData
  }

  mostFrequent(arr) {
    if (arr.length <= 0) return ""

    const counts = arr
      .map((r) => r.fundingSources)
      .flat()
      .reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1
        return acc
      }, {})

    return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b))
  }
}
