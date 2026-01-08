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

    this.fundingOptionsButtons = d3.selectAll(".fundingOption")

    this.currentOption = "totalProjects"

    this.init(data)
  }

  init(data) {
    this.wrangleData(data)
  }

  wrangleData(data) {
    this.render(this.transformData(data))
  }

  render(data) {
    this.xScale = d3.scaleSqrt().range([0, this.width])
    this.yScale = d3.scaleBand().range([0, this.height]).padding(0.3)

    this.xAxis = this.svg
      .append("g")
      .attr("transform", `translate(0,${this.height})`)
      .attr("class", "fundAxis")
    this.yAxis = this.svg.append("g").attr("class", "fundAxis")

    this.update(data)
  }

  update(data) {
    const row = this.currentOption == "totalProjects" ? "count" : "averageArea"

    this.xScale.domain([0, d3.max(data, (d) => d[row])])
    this.yScale.domain(data.map((d) => d.source))

    this.xAxis
      .transition()
      .duration(200)
      .call(
        d3
          .axisBottom(this.xScale)
          .tickValues(this.xScale.ticks().filter((d) => Number.isInteger(d)))
          .tickFormat((d) =>
            Math.abs(d) < 1000 ? d3.format("d")(d) : d3.format(".0s")(d)
          )
          .ticks(20)
      )
    this.yAxis.transition().duration(200).call(d3.axisLeft(this.yScale))

    if (!this.xAxisLabel) {
      this.xAxisLabel = this.xAxis
        .append("text")
        .attr("id", "funding-xAxis-label")
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
            .attr("width", (d) => this.xScale(d[row]))
            .attr("height", this.yScale.bandwidth())
            .attr("fill", (d) => "#17BECF")
            .style("display", (d) =>
              this.xScale(d[row]) == 0 ? "none" : "block"
            )
            .on("mouseover", (event, d) => {
              this.tooltip
                .style("display", "block")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .html(
                  `Projects: ${d[row]}<br/>NBS average area: ${d.averageArea} m<sup>2</sup>`
                )
            })
            .on("mousemove", (event) => {
              this.tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
            })
            .on("mouseout", () => {
              this.tooltip.style("display", "none")
            }),
        (update) => {
          d3.select("#funding-xAxis-label").text(
            this.currentOption == "totalProjects"
              ? "Projects"
              : "Average square meters"
          )
          return update
            .transition()
            .duration(200)
            .attr("y", (d) => this.yScale(d.source))
            .attr("height", this.yScale.bandwidth())
            .attr("width", (d) => this.xScale(d[row]))
            .style("display", (d) =>
              this.xScale(d[row]) == 0 ? "none" : "block"
            )
        },
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
        totalArea: data.reduce(
          (acc, row) =>
            row.__sources_of_funding.includes(key)
              ? acc + (row.nbs_area_m2 || 0)
              : acc,
          0
        ),
      }))
      .map((row) => ({
        ...row,
        averageArea:
          Math.round((row.totalArea / row.count + Number.EPSILON) * 100) / 100,
      }))
      .sort((a, b) => a.source.localeCompare(b.source))
      .sort((a, b) =>
        this.currentOption == "totalProjects"
          ? b.count - a.count
          : b.averageArea - a.averageArea
      )
  }
}
