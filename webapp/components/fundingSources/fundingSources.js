class FundingSources {
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

    this.rectGroup = this.svg.append("g").attr("id", "fundingBarRectangles")

    this.labelsGroup = this.svg.append("g").attr("id", "fundingLabelsGroup")

    this.tooltip = d3.select("#fundingTooltip")

    this.fundingOptionsInput = d3.selectAll("#fundingOptions input")

    this.currentOption = "totalProjects"

    this.fundingOptions = [
      ...new Set(data.map((row) => row.fundingSources).flat()),
    ]

    window._selectedFundingSource = []

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
    this.xScale.domain([0, d3.max(data, (d) => d[this.row])])
    this.yScale.domain(data.map((d) => d.source))

    this.xAxis
      .transition()
      .duration(200)
      .call(
        d3
          .axisBottom(this.xScale)
          .tickValues(this.xScale.ticks().filter((d) => Number.isInteger(d)))
          .tickFormat((d) =>
            Math.abs(d) < 1000 ? d3.format("d")(d) : d3.format(".0s")(d),
          )
          .ticks(20),
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

    this.rectGroup
      .selectAll(".funding-source-bar")
      .data(data, (d) => d.source)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", (d) =>
              window.selectedFundingSource.includes(d.source)
                ? "funding-source-bar active"
                : "funding-source-bar",
            )
            .attr("id", (d) => d.source)
            .attr("x", 0)
            .attr("y", (d) => this.yScale(d.source))
            .attr("width", (d) => this.xScale(d[this.row]))
            .attr("height", this.yScale.bandwidth())
            .style("display", (d) =>
              this.xScale(d[this.row]) == 0 ? "none" : "block",
            )
            .on("mouseover", (event, d) =>
              this.tooltip
                .style("display", "block")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .html(
                  `<b>Projects:</b> ${d.count}<br/><b>NBS average area:</b> ${d.averageArea} m<sup>2</sup><br/><b>Average cost:</b> €${d.averageCost}`,
                ),
            )
            .on("mousemove", (event) =>
              this.tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px"),
            )
            .on("mouseout", () => this.tooltip.style("display", "none"))
            .on("click", (_, d) => clickFundingOption(d.source)),
        (update) => {
          d3.select("#funding-xAxis-label").text(
            this.currentOption == "totalProjects"
              ? "Projects"
              : this.currentOption == "squareMeter"
                ? "Average square meters (m²)"
                : "Average cost in euro (€)",
          )
          return update
            .transition()
            .duration(200)
            .attr("class", (d) =>
              window.selectedFundingSource.includes(d.source)
                ? "funding-source-bar active"
                : "funding-source-bar",
            )
            .attr("y", (d) => this.yScale(d.source))
            .attr("height", this.yScale.bandwidth())
            .attr("width", (d) => this.xScale(d[this.row]))
            .style("display", (d) =>
              this.xScale(d[this.row]) == 0 ? "none" : "block",
            )
        },
        (exit) => exit.remove(),
      )

    const labelPosition = findLabelPosition(this.xScale)
    this.labelsGroup
      .selectAll(".fundingRectLabels")
      .data(data, (d) => d.source)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "fundingRectLabels labelInside")
            .attr("dy", "0.35em")
            .attr("dx", -4)
            .attr("x", (d) => this.xScale(d[this.row]))
            .attr(
              "y",
              (d) => this.yScale(d.source) + this.yScale.bandwidth() / 2,
            )
            .text((d) =>
              this.row == "averageArea"
                ? `${d.totalArea} m²`
                : this.row == "averageCost"
                  ? `€ ${d.totalCost}`
                  : d[this.row],
            )
            .call((text) => labelPosition(this.row, text)),
        (update) =>
          update
            .transition()
            .duration(200)
            .attr("class", "fundingRectLabels labelInside")
            .attr("dy", "0.35em")
            .attr("dx", -4)
            .attr("x", (d) => this.xScale(d[this.row]))
            .attr(
              "y",
              (d) => this.yScale(d.source) + this.yScale.bandwidth() / 2,
            )
            .text((d) =>
              this.row == "averageArea"
                ? `${d.averageArea} m²`
                : this.row == "averageCost"
                  ? `€ ${d.averageArea}`
                  : d[this.row],
            )
            .call((text) => labelPosition(this.row, text)),
        (exit) => exit.remove(),
      )

    this.svg
      .selectAll(".fundAxis .tick")
      .on("click", (_, d) => clickFundingOption(d))
    d3.select("#fundingsMeta").text(
      `${window.selectedFundingSource.length} selected`,
    )
  }

  transformData(data) {
    this.row =
      this.currentOption == "totalProjects"
        ? "count"
        : this.currentOption == "squareMeter"
          ? "averageArea"
          : "averageCost"

    return this.fundingOptions
      .map((key) => ({
        source: key,
        values: data.reduce(
          (acc, row) =>
            row.fundingSources.includes(key)
              ? {
                  count: acc.count + 1,
                  totalArea: acc.totalArea + (row.area || 0),
                  totalCost: acc.totalCost + (row.cost || 0),
                }
              : acc,
          {
            count: 0,
            totalArea: 0,
            totalCost: 0,
          },
        ),
      }))
      .map((row) => ({
        source: row.source,
        count: row.values.count,
        averageArea:
          row.values.totalArea > 0
            ? Math.round(
                (row.values.totalArea / row.values.count + Number.EPSILON) *
                  100,
              ) / 100
            : 0,
        averageCost:
          row.values.totalCost > 0
            ? Math.round(
                (row.values.totalCost / row.values.count + Number.EPSILON) *
                  100,
              ) / 100
            : 0,
      }))
      .sort((a, b) => a.source.localeCompare(b.source))
      .sort((a, b) => b[this.row] - a[this.row])
  }
}

function clickFundingOption(option) {
  window.selectedFundingSource = window.selectedFundingSource.includes(option)
    ? window.selectedFundingSource.filter((source) => source != option)
    : [...window.selectedFundingSource, option]
}

const findLabelPosition = (scale) => (row, text) => {
  return text
    .filter((d) => scale(d[row]) - scale(0) < 100)
    .attr("dx", +4)
    .attr("class", "fundingRectLabels labelOutside")
}
