class ExplorationMode extends Main {
  constructor() {
    super()
  }

  async init() {
    super.init()

    await this.loadData()

    this.render()
  }

  render() {
    super.render()
    this.components = {
      ...this.components,
      projectsMap: new ProjectsMap({
        rows: [...this.data],
        topo: this.topo,
      }),
      lineChartModal: new LineChartPopout([...this.data]),
      fundingSources: new FundingSources([...this.data]),
    }
  }

  update() {
    super.update()

    this.components.projectsMap.wrangleData([...this.filteredDataForMap])
    this.components.fundingSources.wrangleData([...this.filteredData])
    this.components.lineChartModal.update(
      this.components.lineChartModal.transformData(this.filteredData),
    )
  }
}

new ExplorationMode().init()
