class Funding {
  constructor(data) {
    const parent = d3.select("#fundingChart")

    this.margin = { top: 20, right: 40, bottom: 0, left: 340 }
    this.width =
      parent.node().getBoundingClientRect().width -
      this.margin.left -
      this.margin.right
    this.height = 650 - this.margin.top - this.margin.bottom

    this.svg = parent
      .append("svg")
      .attr("width", parent.node().getBoundingClientRect().width)
      .attr("height", 650)
      .append("g")

    this.svg.attr("transform", `translate(${this.margin.left}, ${0})`)

    this.tooltip = d3.select("#fundingTooltip")

    this.init(data)
  }

  init(data) {
    this.wrangleData(data)
  }

  wrangleData(data) {
    this.render(this.transformData(data))
  }

  render(data) {
    this.xScale = d3.scaleLinear().range([0, this.width])
    this.yScale = d3.scaleBand().range([0, this.height]).padding(0.3)

    this.xAxis = this.svg
      .append("g")
      .attr("transform", `translate(0,${this.height})`)
      .attr("class", "fundAxis")
    this.yAxis = this.svg.append("g").attr("class", "fundAxis")

    this.update(data)
  }

  update(data) {
    this.xScale.domain([0, d3.max(data, (d) => d.count)])
    this.yScale.domain(data.map((d) => d.source))

    const spacedTicks = this.xScale.ticks(10).filter((d) => Number.isInteger(d))

    this.xAxis
      .transition()
      .duration(200)
      .call(
        d3
          .axisBottom(this.xScale)
          .tickValues(spacedTicks)
          .tickFormat(d3.format("d"))
      )
    this.yAxis.transition().duration(200).call(d3.axisLeft(this.yScale))

    // Add x-axis label in bottom right corner, above tick line
    if (!this.xAxisLabel) {
      this.xAxisLabel = this.xAxis
        .append("text")
        .attr("class", "axis-label-corner")
        .attr("x", this.width - 5)
        .attr("y", -10)
        .attr("text-anchor", "end")
        .text("Projects")
    }

    this.svg
      .selectAll(".funding-source-bar")
      .data(data, (d) => d.source)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "funding-source-bar")
            .attr("id", (d) => d.source)
            .attr("x", 0)
            .attr("y", (d) => this.yScale(d.source))
            .attr("width", (d) => this.xScale(d.count))
            .attr("height", this.yScale.bandwidth())
            .attr("fill", (d) => "#17BECF")
            .style("display", (d) =>
              this.xScale(d.count) == 0 ? "none" : "block"
            )
            .on("mouseover", (event, d) => {
              this.tooltip
                .style("display", "block")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .text(`Projects: ${d.count}`)
            })
            .on("mousemove", (event) => {
              this.tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
            })
            .on("mouseout", () => {
              this.tooltip.style("display", "none")
            }),
        (update) =>
          update
            .transition()
            .duration(200)
            .attr("y", (d) => this.yScale(d.source))
            .attr("height", this.yScale.bandwidth())
            .attr("width", (d) => this.xScale(d.count))
            .style("display", (d) =>
              this.xScale(d.count) == 0 ? "none" : "block"
            ),
        (exit) => exit.remove()
      )
  }

  transformData(data) {
    const flattenData = data.map((row) => row.__sources_of_funding).flat()
    return [...new Set(flattenData)]
      .map((key) => ({
        source: key,
        count: flattenData.reduce(
          (acc, curr) => (curr == key ? acc + 1 : acc),
          0
        ),
      }))
      .sort((a, b) => b.count - a.count)
  }
}
