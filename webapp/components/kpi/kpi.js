class KPI {
  constructor(data) {
    this.rowElement = d3.select("#rowCount")
    this.cityElement = d3.select("#cityCount")
    this.countryElement = d3.select("#countryCount")
    this.fundingElement = d3.select("#topFundingSource")

    this.init(data)
  }

  init(data) {
    this.wrangleData(data)
  }

  wrangleData(data) {
    const years = data.map((r) => r.startYear).filter(Number.isFinite)
    this.update({
      yearRange: { min: d3.min(years), max: d3.max(years) },
      rows: data.length,
      cities: new Set(data.map((d) => d.city)).size,
      countries: new Set(data.map((d) => d.country)).size,
      topFundingSource: mostFrequent(data),
    })
  }

  update(data) {
    this.rowElement.text(data.rows)
    this.cityElement.text(data.cities)
    this.countryElement.text(data.countries)
    this.fundingElement.text(data.topFundingSource)
  }
}

function mostFrequent(arr) {
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
