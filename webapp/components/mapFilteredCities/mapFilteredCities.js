class MapFilteredCities {
  constructor(data) {
    window._selectedCities = []
    this.countriesData = []

    this.map = L.map("mapArea").setView([20, 0], 2)

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(this.map)

    // this.svg = d3.select("#mapVis")
    // this.svgGroup = this.svg.append("g")
    // this.countriesPath = this.svgGroup.append("g").attr("id", "countries")
    // this.pointsGroup = this.svgGroup.append("g").attr("id", "points")
    this.tooltip = d3.select("#mapTooltip")

    // this.w = this.svg.attr("width")
    // this.h = this.svg.attr("height")

    // this.zoom = d3
    //   .zoom()
    //   .scaleExtent([0.5, 8])
    //   .on("zoom", (event) => this.svgGroup.attr("transform", event.transform))
    // this.projection = d3
    //   .geoMercator()
    //   .scale(this.w / 2.5 / Math.PI)
    //   .translate([this.w / 2, this.h / 2])
    // this.geoPath = d3.geoPath().projection(this.projection)

    // this.svg.call(this.zoom)

    this.currentOption = "country"
    this.mapOptions = d3.selectAll("#mapOptions input")

    this.init(data)
  }

  init(data) {
    data.geo.features.forEach((f) => {
      if (f.geometry.type === "Polygon") {
        f.geometry.coordinates = this.normalizeCoords(f.geometry.coordinates)
      }
      if (f.geometry.type === "MultiPolygon") {
        f.geometry.coordinates = f.geometry.coordinates.map(
          this.normalizeCoords
        )
      }
    })

    this.wrangleData(data)
  }

  wrangleData(data) {
    this.countriesData = data.geo.features

    this.rScale = d3.scaleSqrt().range([2.5, 12])
    this.colorScale = d3
      .scaleSymlog()
      .range(["rgb(201, 229, 238)", "rgb(0, 29, 191)"])

    this.update(this.transformData(data))
  }

  update(data) {
    this.currentOption == "country"
      ? this.updateCountries(data)
      : this.updateCities(data)
  }

  updateCities(data) {
    // const max = d3.max(data.map((d) => d.count))
    // this.rScale.domain([1, max])
    // this.pointsGroup
    //   .selectAll("circle")
    //   .data(data, (d) => d.city)
    //   .join(
    //     (enter) =>
    //       enter
    //         .append("circle")
    //         .attr(
    //           "class",
    //           (d) =>
    //             `mapPoint${
    //               window.selectedCities.some((s) => s == d.city)
    //                 ? " selected"
    //                 : ""
    //             }`
    //         )
    //         .attr("cx", (d) => d.coordinates.x)
    //         .attr("cy", (d) => d.coordinates.y)
    //         .on("click", (event, d) => {
    //           window.selectedCities = window.selectedCities.some(
    //             (s) => s == d.city
    //           )
    //             ? window.selectedCities.filter((s) => s != d.city)
    //             : [...window.selectedCities, d.city]
    //           d3.select(event.target).attr(
    //             "class",
    //             (d) =>
    //               `mapPoint${
    //                 window.selectedCities.some((s) => s == d.city)
    //                   ? " selected"
    //                   : ""
    //               }`
    //           )
    //         })
    //         .on("mouseover", (event, d) =>
    //           this.tooltip
    //             .html(`${d.city}, ${d.country}<br/>Projects: ${d.count}`)
    //             .style("left", event.pageX + 10 + "px")
    //             .style("top", event.pageY - 10 + "px")
    //             .style("display", "block")
    //         )
    //         .on("mousemove", (event) =>
    //           this.tooltip
    //             .style("left", event.pageX + 10 + "px")
    //             .style("top", event.pageY - 10 + "px")
    //         )
    //         .on("mouseout", () => this.tooltip.style("display", "none"))
    //         .call((sel) =>
    //           sel
    //             .transition()
    //             .duration(200)
    //             .attr("r", (d) => this.rScale(d.count))
    //         ),
    //     (update) =>
    //       update
    //         .transition()
    //         .duration(200)
    //         .attr("r", (d) => this.rScale(d.count)),
    //     (exit) => exit.remove()
    //   )
  }

  updateCountries(data) {
    const max = d3.max(data.features.map((d) => d.values.count))
    this.colorScale.domain([0, max])

    L.geoJSON(data.features, {
      style: this.countryStyle,

      onEachFeature: (d, layer) => {
        layer.on("click", () => 
          d.values?.country != null
            ? (window.selectedCountries = window.selectedCountries.includes(
                d.values.country
              )
                ? window.selectedCountries.filter(
                    (source) => source != d.values.country
                  )
                : [...window.selectedCountries, d.values.country])
            : null
        )
        layer.on("mouseover", (event) =>
          this.tooltip
            .html(`${d.properties.name}<br/>Projects: ${d.values.count}`)
            .style("left", event.originalEvent.pageX + 10 + "px")
            .style("top", event.originalEvent.pageY - 10 + "px")
            .style("display", "block")
        )
        layer.on("mousemove", (event) =>
          this.tooltip
            .style("left", event.originalEvent.pageX + 10 + "px")
            .style("top", event.originalEvent.pageY - 10 + "px")
        )
        layer.on("mouseout", () => this.tooltip.style("display", "none"))
      },
    }).addTo(this.map)
    // this.rScale.domain([1, max])

    // this.pointsGroup.html("")
    // this.countriesPath
    //   .selectAll("path")
    //   .data(data, (d) => d.count)
    //   .join(
    //     (enter) =>
    //       enter
    //         .append("path")
    //         .attr("d", this.geoPath)
    //         .attr("fill", (d) => this.colorScale(d.values.count))
    //         .attr("stroke", "black")
    //         .attr("class", "countryPath")
    //         .attr("class", (d) =>
    //           d.values.count != 0 ? "selectableCountry" : ""
    //         )
    //         .on("click", (_, d) => {
    //           return d.values?.country != null
    //             ? (window.selectedCountries = window.selectedCountries.includes(
    //                 d.values.country
    //               )
    //                 ? window.selectedCountries.filter(
    //                     (source) => source != d.values.country
    //                   )
    //                 : [...window.selectedCountries, d.values.country])
    //             : null
    //         })
    //         .on("mouseover", (event, d) =>
    //           this.tooltip
    //             .html(
    //               `${d.properties.name}<br/>Projects: ${d.values?.count ?? 0}`
    //             )
    //             .style("left", event.pageX + 10 + "px")
    //             .style("top", event.pageY - 10 + "px")
    //             .style("display", "block")
    //         )
    //         .on("mousemove", (event) =>
    //           this.tooltip
    //             .style("left", event.pageX + 10 + "px")
    //             .style("top", event.pageY - 10 + "px")
    //         )
    //         .on("mouseout", () => this.tooltip.style("display", "none")),
    //     (update) =>
    //       update.attr(
    //         "fill",
    //         (d) => this.colorScale(d.values?.count ?? null) ?? "red"
    //       )
    //   )
  }

  countryStyle = (country) => ({
    color: "black",
    weight: 1,
    fillColor: this.colorScale(country.values.count),
    fillOpacity: 0.8,
  })

  transformData(data) {
    if (this.currentOption == "country") {
      const countriesData = Array.from(
        d3.rollup(
          data.rows,
          (leaves) => leaves,
          (d) => d.country
        )
      )
        .filter((d) => d[0] != null)
        .map((d) => ({
          // coordinates: this.parseCoordinate(d[1][0].coordinates),
          count: d[1].length,
          country: d[0],
        }))
        .sort((a, b) => b.count - a.count)

      return {
        ...data.geo,
        features: this.countriesData.map((row) => ({
          ...row,
          values: countriesData.find(
            (element) =>
              element.country.includes(row.properties.name) ||
              row.properties.name.includes(element.country)
          ) ?? { count: 0 },
        })),
      }
    }

    return Array.from(
      d3.rollup(
        data,
        (leaves) => leaves,
        (d) => d.coordinates
      )
    )
      .filter((d) => d[0] != null)
      .map((d) => ({
        // coordinates: this.parseCoordinate(d[0]),
        count: d[1].length,
        city: d[1][0].city,
        country: d[1][0].country,
      }))
  }

  // parseCoordinate(pointRaw) {
  //   const point = pointRaw.substring(1, pointRaw.length - 1).split(",")
  //   const projection = this.projection([point[1], point[0]])

  //   return { x: projection[0], y: projection[1] }
  // }

  normalizeCoords(coords) {
    return coords.map((ring) => {
      let lastLng = ring[0][0]

      return ring.map(([lng, lat]) => {
        while (lng - lastLng > 180) lng -= 360
        while (lng - lastLng < -180) lng += 360
        lastLng = lng
        return [lng, lat]
      })
    })
  }
}
