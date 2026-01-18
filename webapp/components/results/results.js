class Results {
  constructor(data) {
    this.total = 0
    this.tableBody = d3.select("#resultsTable tbody")
    this.data = []

    this.currentPage = 1
    this.totalPages = 0
    this.viewPerPage = 50

    this.sortField = "title"

    this.pageSelectBox = d3.select("#resultsShowPer")

    this.paginationWrappers = d3.select("#resultsPagination")

    this.totalElement = d3.select("#resultsTableTotal")

    this.init(data)
  }

  init(data) {
    this.pageSelectBox.on("change", (e) =>
      this.setViewPerPage(Number(e.target.value)),
    )
    this.wrangleData(data)
  }

  wrangleData(data) {
    this.update(data)
  }

  update(rows) {
    this.data = rows
    this.setCurrentPage(1)
  }

  setViewPerPage(number) {
    this.viewPerPage = number
    this.setCurrentPage(1)
  }

  setCurrentPage(pageNumber) {
    this.currentPage = pageNumber
    this.render(this.transformData(this.data))
  }

  render(rows) {
    this.totalElement.text(`Showing ${rows.length} out of ${this.data.length}`)

    this.paginationWrappers
      .selectAll("button")
      .data(Array.from(Array(this.totalPages)).map((_, i) => i + 1))
      .join(
        (enter) => {
          enter
            .append("button")
            .attr(
              "class",
              (page) =>
                `paginationButton${this.currentPage == page ? " active" : ""}`,
            )
            .text((page) => page)
            .on("click", (_, page) => this.setCurrentPage(page))
        },
        (update) =>
          update.attr(
            "class",
            (page) =>
              `paginationButton${this.currentPage == page ? " active" : ""}`,
          ),
        (exit) => exit.remove(),
      )

    this.tableBody
      .selectAll("tr")
      .data(rows, (d) => d[""])
      .join(
        (enter) => {
          const tr = enter.append("tr")

          tr.append("td").text(
            (d) =>
              d.name_of_the_nbs_intervention_short_english_title ??
              d.native_title_of_the_nbs_intervention ??
              "",
          )
          tr.append("td").text((d) => d.city)
          tr.append("td").text((d) => d.country)
          tr.append("td").text((d) => d.start_year)
          tr.append("td").text((d) => d.end_year)
        },
        (update) => {},
        (exit) => exit.remove(),
      )
  }

  transformData(data) {
    this.totalPages = Math.ceil(data.length / this.viewPerPage)
    const start = this.viewPerPage * (this.currentPage - 1)

    return data
      .sort((a, b) =>
        a.name_of_the_nbs_intervention_short_english_title.localeCompare(
          b.name_of_the_nbs_intervention_short_english_title,
        ),
      )
      .slice(start, start + this.viewPerPage)
  }
}
