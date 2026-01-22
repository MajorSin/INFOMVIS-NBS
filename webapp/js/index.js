class ExplorationMode extends Main {
  constructor() {
    super()

    this.exploreWrapper = d3.select("#exploreMode")
    this.compareWrapper = d3.select("#compareMode")
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
      compareToolbar: new CompareToolbar(),
      compareTable: new CompareTable([...this.data]),
    }
  }

  update() {
    super.update()

    this.components.projectsMap.wrangleData([...this.filteredDataForMap])
    this.components.fundingSources.wrangleData([...this.filteredData])
    this.components.lineChartModal.update(
      this.components.lineChartModal.transformData(this.filteredData),
    )

    if (window.mode == "compare") this.components.compareTable.wrangleData()
  }

  updateMode() {
    if (window.mode == "compare") {
      this.compareWrapper.style("display", "block")
      this.exploreWrapper.style("display", "none")
    } else {
      this.compareWrapper.style("display", "none")
      this.exploreWrapper.style("display", "block")
    }
    this.update()
  }
}

new ExplorationMode().init()
