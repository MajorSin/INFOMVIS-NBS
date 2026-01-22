class CompareTable {
  constructor(data) {
    this.data = []
    this.columns = columns

    this.table = d3.select("#compareTable")

    this.showDifferentFields = false

    this.init(data)
  }

  init(data) {
    this.data = data

    d3.select("#backToExplore").on("click", () => (window.mode = "explore"))
    d3.select("#differentFieldsSlider").on("change", (e) =>
      this.changeTarget(e.target.checked),
    )
  }

  wrangleData() {
    const data = this.data
      .filter((r) => window.selectedProjects.includes(r.id))
      .reduce((acc, obj) => {
        Object.keys(obj).forEach((key) => {
          if (!acc[key]) acc[key] = []
          acc[key].push(obj[key])
        })
        return acc
      }, {})

    this.update(
      Object.fromEntries(
        Object.keys(
          this.showDifferentFields
            ? Object.fromEntries(
                Object.entries(data).filter(
                  ([_, arr]) => new Set(arr).size > 1,
                ),
              )
            : data,
        ).map((column) => [
          column,
          [
            this.columns.find((r) => r.fieldName == column)?.name ?? "",
            ...data[column],
          ],
        ]),
      ),
    )
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

  changeTarget(value) {
    this.showDifferentFields = value
    this.wrangleData()
  }
}
