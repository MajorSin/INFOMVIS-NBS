class Results {
  constructor(data) {
    this.max = 250
    this.tableBody = d3.select("#resultsTable tbody")

    this.init(data)
  }

  init(data) {
    this.wrangleData(data)
  }

  wrangleData(data) {
    this.update(this.transformData(data))
  }

  update(rows) {
    this.tableBody.selectAll("tr").remove()

    const trs = this.tableBody.selectAll("tr").data(rows).enter().append("tr")

    trs.each(function (d) {
      const tr = d3.select(this)

      tr.append("td").text(d.title)
      tr.append("td").text(d.city)
      tr.append("td").text(d.country)
      tr.append("td").text(d.economicImpacts.join(", "))
      tr.append("td").text(d.startYear)
      tr.append("td").text(d.endYear)
    })

    if (rows.length > this.max) {
      const tr = this.tableBody.append("tr")
      tr.append("td")
        .attr("colspan", 6)
        .text(
          `Showing first ${this.max} of ${rows.length} rows. Add more filters to narrow results.`,
        )
        .style("color", "#a8b3cf")
    }
  }

  transformData(data) {
    return data
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, this.max)
  }
}
