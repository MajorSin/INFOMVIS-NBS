class SimilarityBand extends Main {
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
      mapSimilarityBands: new MapSimilarityBands({
        rows: this.filteredData,
        geo: topojson.feature(this.topo, this.topo.objects.countries),
      }),
    }
  }

  update() {
    super.update()

    this.components.mapSimilarityBands.update(
      this.components.mapSimilarityBands.transformData(this.filteredDataForMap),
    )
  }
}

new SimilarityBand().init()
