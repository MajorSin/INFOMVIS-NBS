class CompareTable {
  constructor(data) {
    this.data = data

    this.table = d3.select("#compareTable")
    this.showDifferentFields = false

    this.columns = columns

    this.init()
  }

  init() {
    d3.select("#backToExplore").on("click", () => (window.mode = "explore"))
    d3.select("#differentFieldsSlider").on("change", (e) =>
      this.setDifferentTarget(e.target.checked),
    )
  }

  wrangleData() {
    this.update(this.transformData())
  }

  update(rows) {
    const columnsToShow = Object.keys(rows)

    this.table
      .selectAll("tr")
      .data(
        this.columns
          .map((r) => r.fieldName)
          .filter((c) => columnsToShow.includes(c)),
      )
      .join("tr")
      .selectAll("td")
      .data((column) => rows[column])
      .join("td")
      .html((d) =>
        Array.isArray(d)
          ? `<ul>${d.map((e) => `<li>${e}</li>`).join("")}</ul>`
          : typeof d === "string" && d.startsWith("https://")
            ? `<a href="${d}" target="_blank">${d}</a>`
            : (d ?? '<span class="undefined">-</span>'),
      )
  }

  transformData() {
    const data = this.data
      .filter((r) => window.selectedProjects.includes(r.id))
      .reduce((acc, obj) => {
        Object.keys(obj).forEach((key) => {
          if (!acc[key]) acc[key] = []
          acc[key].push(obj[key])
        })
        return acc
      }, {})

    return Object.fromEntries(
      Object.keys(
        this.showDifferentFields
          ? Object.fromEntries(
              Object.entries(data).filter(([_, arr]) => new Set(arr).size > 1),
            )
          : data,
      ).map((column) => [
        column,
        [
          this.columns.find((r) => r.fieldName == column)?.name ?? "",
          ...data[column],
        ],
      ]),
    )
  }

  setDifferentTarget(value) {
    this.showDifferentFields = value
    this.update()
  }
}
