class MapFilteredCities {
  constructor(data) {
    window._selectedCities = []

    this.mapSvg = d3.select("#mapVis")
    this.mapG = this.mapSvg.append("g")
    this.countriesG = this.mapG.append("g").attr("id", "countries")
    this.pointsG = this.mapG.append("g").attr("id", "points")
    this.tooltip = d3.select("#mapTooltip")

    this.w = this.mapSvg.attr("width")
    this.h = this.mapSvg.attr("height")

    this.zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .extent([
        [0, 0],
        [this.w, this.h],
      ])
      .on("zoom", (event) => this.mapG.attr("transform", event.transform))

    this.projection = d3
      .geoMercator()
      .translate([this.w / 2, this.h / 1.55])
      .scale(this.w / (2 * Math.PI))
    this.geoPath = d3.geoPath().projection(this.projection)

    this.mapSvg.call(this.zoom)

    this.init(data)
  }

  init(data) {
    this.countriesG
      .selectAll("path")
      .data(data.geo.features)
      .join("path")
      .attr("d", this.geoPath)
      .attr("fill", "rgba(255,255,255,0.03)")
      .attr("stroke", "rgba(255,255,255,0.10)")
      .attr("stroke-width", 0.7)

    this.wrangleData(data)
  }

  wrangleData(data) {
    const newData = this.transformData(data.rows)

    const rMax = d3.max(newData, (d) => d.count)
    this.rScale = d3.scaleSqrt().domain([1, rMax]).range([2.5, 12])

    this.update(newData)
  }

  update(data) {
    this.pointsG
      .selectAll("circle")
      .data(data, (d) => d.city)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "mapPoint")
            .attr("cx", (d) => d.coordinates.x)
            .attr("cy", (d) => d.coordinates.y)
            .attr("stroke", "rgba(255,255,255,0.7)")
            .attr("stroke-width", 0.7)
            .attr("fill", "rgba(231,238,252,0.65)")
            .on("click", (event, d) => {
              if (window.selectedCities.some((s) => s == d.city)) {
                window.selectedCities = window.selectedCities.filter(
                  (s) => s != d.city
                )
                d3.select(event.target)
                  .transition()
                  .duration(200)
                  .attr("stroke-width", "0.7")
                  .attr("fill", "rgba(231,238,252,0.65)")
                return
              }
              window.selectedCities = window.selectedCities = [
                ...window.selectedCities,
                d.city,
              ]
              d3.select(event.target)
                .transition()
                .duration(200)
                .attr("stroke-width", "0px")
                .attr("fill", "rgba(231,238,252,0.95)")
            })
            .on("mouseover", (event, d) =>
              this.tooltip
                .html(`${d.city}, ${d.country}<br/>Projects: ${d.count}`)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .transition()
                .duration(200)
                .style("display", "block")
            )
            .on("mousemove", (event) =>
              this.tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
            )
            .on("mouseout", () =>
              this.tooltip.transition().duration(200).style("display", "none")
            )
            .call((sel) =>
              sel
                .transition()
                .duration(200)
                .attr("r", (d) => this.rScale(d.count))
            ),
        (update) =>
          update
            .transition()
            .duration(200)
            .attr("r", (d) => this.rScale(d.count))
            .attr("fill", "rgba(231,238,252,0.65)"),
        (exit) => exit.remove()
      )
  }

  transformData(data) {
    return Array.from(
      d3.rollup(
        data,
        (leaves) => leaves,
        (d) => d.coordinates
      )
    )
      .filter((d) => d[0] != null)
      .map((d) => ({
        coordinates: this.parseCoordinate(d[0]),
        count: d[1].length,
        city: d[1][0].city,
        country: d[1][0].country,
      }))
  }

  parseCoordinate(pointRaw) {
    const point = pointRaw.split(",")
    const projection = this.projection([point[1], point[0]])

    return {
      x: projection[0],
      y: projection[1],
    }
  }
}
