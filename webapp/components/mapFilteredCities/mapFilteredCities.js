const cityKey = (city, country) => `${city}-${country}`

class MapFilteredCities {
  constructor() {
    this.mapMeta = document.getElementById("mapMeta")

    this.selectedCity = null

    this.cityPanelTitle = document.getElementById("cityPanelTitle")
    this.cityPanelBody = document.getElementById("cityPanelBody")
    this.clearCityBtn = document.getElementById("clearCityBtn")
    clearCityBtn.onclick = () => {
      this.selectedCity = null
    }

    this.zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .extent([
        [0, 0],
        [this.w, this.h],
      ])
      .on("zoom", (event) => {
        console.log(event.transform)
        this.mapG.attr("transform", event.transform)
      })

    this.mapSvg = d3.select("#mapVis")
    this.w = +this.mapSvg.attr("width")
    this.h = +this.mapSvg.attr("height")
    this.mapG = this.mapSvg.append("g")
    this.countriesG = this.mapG.append("g").attr("class", "countries")
    this.pointsG = this.mapG.append("g").attr("class", "points")

    this.zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .extent([
        [0, 0],
        [this.w, this.h],
      ])
      .on("zoom", (event) => {
        this.mapG.attr("transform", event.transform)
      })

    this.mapSvg
      .append("rect")
      .attr("class", "zoom-capture")
      .attr("width", this.w)
      .attr("height", this.h)
      .attr("fill", "transparent")
      .lower()

    this.mapSvg.call(this.zoom)

    this.projection = d3
      .geoMercator()
      .translate([this.w / 2, this.h / 1.55])
      .scale(this.w / (2 * Math.PI))
    this.geoPath = d3.geoPath().projection(this.projection)

    this.statusBox = document.getElementById("statusBox")
  }

  async init(data) {
    this.mapSvg
      .append("rect")
      .attr("class", "zoom-capture")
      .attr("width", this.w)
      .attr("height", this.h)
      .attr("fill", "transparent")
    this.mapSvg.call(this.zoom)

    await this.loadWorldMap(data)
  }

  async loadWorldMap(data) {
    const topo = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
    ).then((r) => r.json())
    const geo = topojson.feature(topo, topo.objects.countries)

    this.countriesG
      .selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("d", this.geoPath)
      .attr("fill", "rgba(255,255,255,0.03)")
      .attr("stroke", "rgba(255,255,255,0.10)")
      .attr("stroke-width", 0.7)

    // this.drawCityCircles(data)
  }

  // drawCityCircles(data) {
  //   const rMax = d3.max(data, (d) => d.count) ?? 1
  //   const rScale = d3.scaleSqrt().domain([1, rMax]).range([2.5, 12])

  //   this.pointsG
  //     .selectAll("circle")
  //     .data(data, (d) => d.key)
  //     .join(
  //       (enter) =>
  //         enter
  //           .append("circle")
  //           .attr("cx", (d) => this.projection([d.coords.lon, d.coords.lat])[0])
  //           .attr("cy", (d) => this.projection([d.coords.lon, d.coords.lat])[1])
  //           .attr("r", 0)
  //           .attr("fill", (d) =>
  //             this.selectedCity && this.selectedCity.key === d.key
  //               ? "rgba(231,238,252,0.95)"
  //               : "rgba(231,238,252,0.65)"
  //           )
  //           .attr("stroke", "rgba(255,255,255,0.7)")
  //           .attr("stroke-width", 0.7)
  //           .on("click", (event, d) => {
  //             event.stopPropagation()
  //             this.selectedCity = {
  //               key: d.key,
  //               city: d.city,
  //               country: d.country,
  //             }
  //             renderCityPanel()
  //           })
  //           .call((sel) =>
  //             sel
  //               .transition()
  //               .duration(200)
  //               .attr("r", (d) => rScale(d.count))
  //           ),
  //       (update) =>
  //         update
  //           .transition()
  //           .duration(200)
  //           .attr("cx", (d) => this.projection([d.coords.lon, d.coords.lat])[0])
  //           .attr("cy", (d) => this.projection([d.coords.lon, d.coords.lat])[1])
  //           .attr("r", (d) => rScale(d.count))
  //           .attr("fill", (d) =>
  //             this.selectedCity && this.selectedCity.key === d.key
  //               ? "rgba(231,238,252,0.95)"
  //               : "rgba(231,238,252,0.65)"
  //           ),
  //       (exit) => exit.remove()
  //     )

  //   this.renderCityPanel()
  // }

  // renderCityPanel() {
  //   if (!this.selectedCity) {
  //     cityPanelTitle.textContent = "City results"
  //     cityPanelBody.textContent =
  //       "Select a city on the map to list the interventions."
  //     return
  //   }

  //   const rows = data.filter(
  //     (r) => cityKey(r.city, r.country) === selectedCity.key
  //   )

  //   cityPanelTitle.textContent = `${selectedCity.city}${
  //     selectedCity.country ? ", " + selectedCity.country : ""
  //   } (${rows.length})`

  //   if (rows.length === 0) {
  //     cityPanelBody.textContent =
  //       "No results for this city under the current filters."
  //     return
  //   }

  //   const ul = document.createElement("ul")

  //   for (const r of rows) {
  //     const li = document.createElement("li")
  //     const title =
  //       r.name_of_the_nbs_intervention_short_english_title ??
  //       r.native_title_of_the_nbs_intervention ??
  //       "Untitled"

  //     const url = (r.link ?? "").toString().trim()
  //     if (url) {
  //       const a = document.createElement("a")
  //       a.href = url
  //       a.target = "_blank"
  //       a.rel = "noopener noreferrer"
  //       a.textContent = title
  //       li.appendChild(a)
  //     } else {
  //       li.textContent = title
  //     }

  //     ul.appendChild(li)
  //   }

  //   cityPanelBody.innerHTML = ""
  //   cityPanelBody.appendChild(ul)
  // }
}
