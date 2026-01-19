class Results {
  constructor(data) {
    this.tableBody = d3.select("#resultsTable tbody")

    this.comparisonProjects = []

    this.tableColums = [
      {
        column: "Title",
        sortStatus: null,
        dataColumn: true,
      },
      {
        column: "Country",
        sortStatus: null,
        dataColumn: true,
      },
      {
        column: "City",
        sortStatus: null,
        dataColumn: true,
      },
      {
        column: "Start year",
        sortStatus: null,
        dataColumn: true,
      },
      {
        column: "End year",
        sortStatus: null,
        dataColumn: true,
      },
      {
        column: "Compare this project",
        sortStatus: null,
        dataColumn: false,
      },
    ]

    this.total = 0
    this.data = []
    this.ids = []

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
    this.ids = rows.map((r) => r[""])
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

  updateSortStatus(d) {
    this.tableColums = this.tableColums.map((r) =>
      r.column == d.column
        ? { ...r, sortStatus: r.sortStatus == "asc" ? "desc" : "asc" }
        : { ...r, sortStatus: null },
    )
    this.setCurrentPage(1)
  }

  // TODO: Fix semicolomns format
  render(rows) {
    this.comparisonProjects = this.comparisonProjects.filter((d) =>
      this.ids.includes(d),
    )
    this.totalElement.text(`Showing ${rows.length} out of ${this.data.length}`)

    d3.select("#resultsTable thead tr")
      .selectAll("th")
      .data(this.tableColums)
      .join(
        (enter) =>
          enter
            .append("th")
            .attr("class", (d) =>
              d.sortStatus != null
                ? "active"
                : d.dataColumn
                  ? ""
                  : "staticColumn",
            )
            .html(
              (d) =>
                `<div>${d.column}${d.dataColumn ? `<i class="bi bi-sort-${d.sortStatus == "desc" ? "down-alt" : "up"} ${d.sortStatus != null ? " active" : ""}"></i></div>` : ""}`,
            )
            .on("click", (_, d) => d.dataColumn && this.updateSortStatus(d)),
        (update) =>
          update
            .attr("class", (d) =>
              d.sortStatus != null
                ? "active"
                : d.dataColumn
                  ? ""
                  : "staticColumn",
            )
            .html(
              (d) =>
                `<div>${d.column}${d.dataColumn ? `<i class="bi bi-sort-${d.sortStatus == "desc" ? "down-alt" : "up"} ${d.sortStatus != null ? " active" : ""}"></i></div>` : ""}`,
            ),
        (exit) => exit.remove(),
      )

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
          tr.append("td").text((d) => d.country)
          tr.append("td").text((d) => d.city)
          tr.append("td").text((d) => d.start_year)
          tr.append("td").text((d) => d.end_year)
          tr.append("td")
            .append("input")
            .on(
              "change",
              (_, d) =>
                (this.comparisonProjects = this.comparisonProjects.includes(
                  d[""],
                )
                  ? this.comparisonProjects.filter((r) => r != d[""])
                  : [...this.comparisonProjects, d[""]]),
            )
            .attr("type", "checkbox")
            .property("checked", (d) => this.comparisonProjects.includes(d[""]))
        },
        (update) => {},
        (exit) => exit.remove(),
      )
  }

  transformData(data) {
    this.totalPages = Math.ceil(data.length / this.viewPerPage)
    const start = this.viewPerPage * (this.currentPage - 1)

    const sortOn = this.tableColums.find((r) => r.sortStatus != null)

    return data
      .sort((a, b) => {
        if (sortOn == null) {
          return a.name_of_the_nbs_intervention_short_english_title.localeCompare(
            b.name_of_the_nbs_intervention_short_english_title,
          )
        } else if (sortOn.column == "Title") {
          return sortOn.sortStatus == "asc"
            ? a.name_of_the_nbs_intervention_short_english_title.localeCompare(
                b.name_of_the_nbs_intervention_short_english_title,
              )
            : b.name_of_the_nbs_intervention_short_english_title.localeCompare(
                a.name_of_the_nbs_intervention_short_english_title,
              )
        } else if (sortOn.column == "Country") {
          return sortOn.sortStatus == "asc"
            ? (a.country ?? "").localeCompare(b.country ?? "")
            : (b.country ?? "").localeCompare(a.country ?? "")
        } else if (sortOn.column == "City") {
          return sortOn.sortStatus == "asc"
            ? a.city.localeCompare(b.city)
            : b.city.localeCompare(a.city)
        } else if (sortOn.column == "Start year") {
          return sortOn.sortStatus == "asc"
            ? a.start_year - b.start_year
            : b.start_year - a.start_year
        }
        return sortOn.sortStatus == "asc"
          ? a.end_year - b.end_year
          : b.end_year - a.end_year
      })
      .slice(start, start + this.viewPerPage)
  }
}
