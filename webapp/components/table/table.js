class Table {
  constructor(data) {
    this.tableBody = d3.select("#resultsTable tbody")

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

  wrangleData(data, resetPage = true) {
    if (resetPage) this.currentPage = 1

    this.totalPages = Math.ceil(data.length / this.viewPerPage)

    const sortOn = this.tableColums.find((r) => r.sortStatus != null)

    this.data = [...data].sort((a, b) =>
      sortOn == null
        ? a.title.localeCompare(b.title)
        : sortOn.column == "Title"
          ? sortOn.sortStatus == "asc"
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title)
          : sortOn.column == "Country"
            ? sortOn.sortStatus == "asc"
              ? (a.country ?? "").localeCompare(b.country ?? "")
              : (b.country ?? "").localeCompare(a.country ?? "")
            : sortOn.column == "City"
              ? sortOn.sortStatus == "asc"
                ? a.city.localeCompare(b.city)
                : b.city.localeCompare(a.city)
              : sortOn.column == "Start year"
                ? sortOn.sortStatus == "asc"
                  ? a.startYear - b.startYear
                  : b.startYear - a.startYear
                : sortOn.sortStatus == "asc"
                  ? a.endYear - b.endYear
                  : b.endYear - a.endYear,
    )

    this.update()
  }

  update() {
    const start = this.viewPerPage * (this.currentPage - 1)

    const currentData = this.data.slice(start, start + this.viewPerPage)
    
    this.totalElement.text(
      `Showing ${currentData.length} out of ${currentData.length}`,
    )

    d3.select("#resultsTable thead tr")
      .selectAll("th")
      .data(this.tableColums, (d) => d.id)
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

    const rows = this.tableBody.selectAll("tr").data(currentData).join("tr")

    rows
      .selectAll("td")
      .data((d) => [d.title, d.country, d.city, d.startYear, d.endYear])
      .join("td")
      .text((d) => d)

    rows
      .append("td")
      .append("input")
      .attr("type", "checkbox")
      .property("checked", (d) => window.selectedProjects.includes(d.id))
      .on("change", (event, d) => {
        window.selectedProjects = event.target.checked
          ? [...window.selectedProjects, d.id]
          : window.selectedProjects.filter((r) => r != d.id)
      })
  }

  setViewPerPage(number) {
    this.viewPerPage = number
    this.setCurrentPage(1)
  }

  setCurrentPage(pageNumber) {
    this.currentPage = pageNumber
    this.update()
  }

  updateSortStatus(d) {
    this.tableColums = this.tableColums.map((r) =>
      r.column == d.column
        ? { ...r, sortStatus: r.sortStatus == "asc" ? "desc" : "asc" }
        : { ...r, sortStatus: null },
    )
    this.wrangleData(this.data, false)
  }
}
