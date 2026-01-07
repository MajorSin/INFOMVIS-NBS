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
      const title =
        d.name_of_the_nbs_intervention_short_english_title ??
        d.native_title_of_the_nbs_intervention ??
        ""

      tr.append("td").text(title)
      tr.append("td").text(d.city)
      tr.append("td").text(d.country)
      tr.append("td").text(d.__economicImpacts.join(", "))
      tr.append("td").text(d.start_year)
      tr.append("td").text(d.end_year)
    })

    if (rows.length > this.max) {
      const tr = this.tableBody.append("tr")
      tr.append("td")
        .attr("colspan", 6)
        .text(
          `Showing first ${this.max} of ${rows.length} rows. Add more filters to narrow results.`
        )
        .style("color", "#a8b3cf")
    }
  }

  transformData(data) {
    return data
      .sort((a, b) =>
        a.name_of_the_nbs_intervention_short_english_title.localeCompare(
          b.name_of_the_nbs_intervention_short_english_title
        )
      )
      .slice(0, this.max)
  }
}
