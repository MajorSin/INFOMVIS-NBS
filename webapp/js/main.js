class ExplorationMode {
  constructor() {
    this.startYearBounds = null
    this.allRows = null
  }

  async init() {
    await this.loadData()
  }

  async loadData() {
    this.allRows = await d3
      .csv("./data/cleaned_nbs_data.csv", d3.autoType)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          __economicImpacts: row.economic_impacts
            ? row.economic_impacts.trim().split(";")
            : [],
        }))
      )

    const years = this.allRows.map((r) => r.start_year).filter(Number.isFinite)
    this.startYearBounds = { min: Math.min(...years), max: Math.max(...years) }

    this.init()
  }

  init() {
    this.filters = new Filters(this.startYearBounds)

    this.render()
  }

  async render() {
    this.filters.init(this.allRows)
  }
}

new ExplorationMode().loadData()
