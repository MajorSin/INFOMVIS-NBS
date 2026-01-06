class Results {
  constructor() {
    this.max = 250
    this.tableBody = document.querySelector("#resultsTable tbody")
    this.data = []
  }

  init(data) {
    this.wrangleData(data)
  }

  wrangleData(data) {
    this.data = data
    this.update()
  }

  update() {
    const rows = this.data
      .sort((a, b) =>
        a.name_of_the_nbs_intervention_short_english_title.localeCompare(
          b.name_of_the_nbs_intervention_short_english_title
        )
      )
      .slice(0, this.max)
    this.tableBody.innerHTML = ""

    for (const r of rows) {
      const tr = document.createElement("tr")

      const title =
        r.name_of_the_nbs_intervention_short_english_title ??
        r.native_title_of_the_nbs_intervention ??
        ""

      const impacts = r.__economicImpacts.join(", ")

      tr.appendChild(this.td(title))
      tr.appendChild(this.td(r.city))
      tr.appendChild(this.td(r.country))
      tr.appendChild(this.td(impacts))
      tr.appendChild(this.td(r.start_year))
      tr.appendChild(this.td(r.end_year))

      this.tableBody.appendChild(tr)
    }

    if (this.data.length > this.max) {
      const tr = document.createElement("tr")
      const cell = document.createElement("td")
      cell.colSpan = 6
      cell.textContent = `Showing first ${this.max} of ${this.data.length} rows. Add more filters to narrow results.`
      cell.style.color = "#a8b3cf"
      tr.appendChild(cell)
      this.tableBody.appendChild(tr)
    }
  }

  td(text) {
    const cell = document.createElement("td")
    cell.textContent = (text ?? "").toString()
    return cell
  }
}
