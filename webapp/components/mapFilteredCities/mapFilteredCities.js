class MapFilteredCities {
  constructor(data) {
    window._selectedCities = []
    this.countriesData = []

    this.mapSvg = d3.select("#mapVis")
    this.mapG = this.mapSvg.append("g")
    this.tooltip = d3.select("#mapTooltip")

    this.w = this.mapSvg.attr("width")
    this.h = this.mapSvg.attr("height")

    this.zoom = d3
      .zoom()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => this.mapG.attr("transform", event.transform))
    this.projection = d3
      .geoMercator()
      .scale(this.w / 2.5 / Math.PI)
      .translate([this.w / 2, this.h / 2])
    this.geoPath = d3.geoPath().projection(this.projection)

    this.mapSvg.call(this.zoom)

    this.init(data)
  }

  init(data) {
    this.wrangleData(data)
  }

  wrangleData(data) {
    this.countriesData = data.geo.features

    this.colorScale = d3
      .scaleLog()
      .range(["rgb(201, 229, 238)", "rgb(0, 29, 191)"])

    this.update(this.transformData(data.rows))
  }

  update(data) {
    const countriesCountData = data
      .filter((d) => d.values != null)
      .map((d) => d.values.count)

    this.colorScale.domain([
      d3.min(countriesCountData),
      d3.max(countriesCountData),
    ])

    this.mapG
      .selectAll("path")
      .data(data, (d) => d.count)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("d", this.geoPath)
            .attr(
              "fill",
              (d) => this.colorScale(d.values?.count ?? null) ?? "red"
            )
            .attr("stroke", "black")
            .attr("class", "countryPath")

            .on("mouseover", (event, d) =>
              this.tooltip
                .html(
                  `${d.properties.name}<br/>Projects: ${d.values?.count ?? 0}`
                )
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .style("display", "block")
            )
            .on("mousemove", (event) =>
              this.tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
            )
            .on("mouseout", () => this.tooltip.style("display", "none")),

        (update) =>
          update.attr(
            "fill",
            (d) => this.colorScale(d.values?.count ?? null) ?? "red"
          )
      )
  }

  transformData(data) {
    const countriesData = Array.from(
      d3.rollup(
        data,
        (leaves) => leaves,
        (d) => d.country
      )
    )
      .filter((d) => d[0] != null)
      .map((d) => ({
        coordinates: this.parseCoordinate(d[1][0].coordinates),
        count: d[1].length,
        country: d[0],
      }))
      .sort((a, b) => b.count - a.count)

    return this.countriesData.map((row) => ({
      ...row,
      values:
        countriesData.find(
          (element) =>
            element.country.includes(row.properties.name) ||
            row.properties.name.includes(element.country)
        ) ?? null,
    }))
  }

  parseCoordinate(pointRaw) {
    const point = pointRaw.substring(1, pointRaw.length - 1).split(",")
    const projection = this.projection([point[1], point[0]])

    return [projection[0], projection[1]]
  }
}
