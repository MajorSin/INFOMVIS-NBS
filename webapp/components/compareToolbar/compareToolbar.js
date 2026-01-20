class CompareToolbar {
  constructor() {
    this.compareElement = d3.select("#compareToolbar")
    this.number = 0
  }

  update(data) {
    this.render(this.wrangleData(data))
  }

  render(number) {
    if (this.number == number) return

    this.compareElement
      .selectAll("button")
      .data(number > 0 ? [number] : [])
      .join(
        (enter) => transitionAction(enter.append("button"), number),
        (update) => transitionAction(update, number),
        (exit) =>
          exit
            .transition(d3.easeCubicIn)
            .duration(100)
            .style("padding", "0px 40px")
            .remove(),
      )

    this.number = number
  }

  wrangleData(data) {
    return data.length
  }
}

function transitionAction(action, number) {
  action
    .text(
      number == 1
        ? "Select two or more projects to compare"
        : `Compare ${number} projects`,
    )
    .attr("class", number > 1 ? "" : "disabled")
    .transition(d3.easeCubicIn)
    .duration(200)
    .style("padding", "30px 40px")
    .transition(d3.easeCubicIn)
    .duration(100)
    .style("padding", "10px 40px")
}
