class ExplorationMode {
  constructor() {
    this.startYearBounds = null
    this.data = null
  }

  async init() {
    await this.loadData()
  }

  async loadData() {
    this.data = await d3
      .csv("./data/cleaned_nbs_data.csv", d3.autoType)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          __economicImpacts: row.economic_impacts
            ? row.economic_impacts.trim().split(";")
            : [],
        }))
      )

    const years = this.data.map((r) => r.start_year).filter(Number.isFinite)
    this.startYearBounds = { min: Math.min(...years), max: Math.max(...years) }

    this.init()
  }

  init() {
    this.render()
  }

  async render() {
    new Filters(this.data)
  }
}

new ExplorationMode().loadData()
