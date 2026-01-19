class MapFilteredCities {
  constructor(data) {
    this.allCountries = []

    this.map = L.map("mapArea").setView([20, 0], 2)

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(this.map)

    this.tooltip = d3.select("#mapTooltip")

    this.currentOption = "country"
    this.mapOptions = d3.selectAll("#mapOptions input")

    this.cityPath = L.layerGroup()
    this.countryPath = L.layerGroup()

    this.legend = L.control({ position: "bottomleft" })

    this.init(data)
  }

  init(data) {
    this.wrangleData({
      ...data,
      geo: {
        ...data.geo,
        features: data.geo.features.map((f) => ({
          ...f,
          geometry: {
            ...f.geometry,
            coordinates:
              f.geometry.type == "Polygon"
                ? this.normalizeCoords(f.geometry.coordinates)
                : f.geometry.coordinates.map(this.normalizeCoords),
          },
        })),
      },
    })
  }

  wrangleData(data) {
    this.allCountries = data.geo.features

    this.radiusScale = d3.scaleSqrt().range([4, 24])
    this.colorScale = d3
      .scaleSymlog()
      .range(["rgb(238, 247, 250)", "rgb(15, 43, 204)"])

    this.update(this.transformData(data.rows))
  }

  update(data) {
    this.currentOption == "country"
      ? this.updateCountries(data)
      : this.updateCities(data)
  }

  updateCities(data) {
    this.removePaths()

    const legend = document.getElementsByClassName("mapLegend")[0]
    if (legend != null) legend.remove()

    const max = d3.max(data.features.map((d) => d.count))
    this.radiusScale.domain([1, max])

    this.cityPath = L.geoJSON(data.features, {
      pointToLayer: (d, latlng) =>
        new L.circleMarker(latlng, this.cityPointStyle(d)),
      onEachFeature: (d, layer) => {
        layer.on("mouseover", (event) => {
          layer.setStyle(this.cityPointStyle(d, true))
          this.tooltip
            .html(`${d.city}, ${d.country}<br/>Projects: ${d.count}`)
            .style("left", event.originalEvent.pageX + 10 + "px")
            .style("top", event.originalEvent.pageY - 10 + "px")
            .style("display", "block")
        })
        layer.on("mousemove", (event) =>
          this.tooltip
            .style("left", event.originalEvent.pageX + 10 + "px")
            .style("top", event.originalEvent.pageY - 10 + "px"),
        )
        layer.on(
          "click",
          () =>
            (window.selectedCities = window.selectedCities.some(
              (s) => s == d.city,
            )
              ? window.selectedCities.filter((s) => s != d.city)
              : [...window.selectedCities, d.city]),
        )
        layer.on("mouseout", () => {
          layer.setStyle(this.cityPointStyle(d))
          this.tooltip.style("display", "none")
        })
      },
    }).addTo(this.map)
  }

  cityPointStyle(d, hover = false) {
    const included = window.selectedCities.includes(d.city)
    return {
      radius: this.radiusScale(d.count),
      fillOpacity: hover ? 1 : 0.7,
      fillColor: included ? "white" : "#17becf",
      color: included ? "white" : "#17becf",
    }
  }

  updateCountries(data) {
    this.removePaths()

    const max = d3.max(data.features.map((d) => d.values.count))
    this.colorScale.domain([0, max])

    this.legend.onAdd = () => {
      const div = L.DomUtil.create("div", "mapLegend")

      const max = this.colorScale.domain()[1]
      const grades =
        max > 3
          ? [0, max * 0.33, max * 0.67, max]
          : max == 3
            ? [0, max * 0.5, max]
            : max == 2
              ? [0, max]
              : [max]

      div.innerHTML = "<strong>Projects</strong>"
      const legendContent = document.createElement("div")
      legendContent.setAttribute("id", "legend")

      for (let i = 0; i < grades.length; i++) {
        const from = Math.round(grades[i])
        legendContent.innerHTML += `<div><i style="background:${this.colorScale(from)}"></i><span>${from}</span></div>`
      }

      div.append(legendContent)

      return div
    }

    this.legend.addTo(this.map)

    this.countryPath = L.geoJSON(data.features, {
      style: (d) => ({
        color: "black",
        weight: 1,
        fillColor: this.colorScale(d.values.count),
        fillOpacity: window.selectedCountries.includes(d.values.country)
          ? 0.9
          : 0.7,
      }),
      onEachFeature: (d, layer) => {
        layer.on("click", () =>
          d.values?.country != null
            ? (window.selectedCountries = window.selectedCountries.includes(
                d.values.country,
              )
                ? window.selectedCountries.filter(
                    (source) => source != d.values.country,
                  )
                : [...window.selectedCountries, d.values.country])
            : null,
        )
        layer.on("mouseover", (event) =>
          this.tooltip
            .html(`${d.properties.name}<br/>Projects: ${d.values.count}`)
            .style("left", event.originalEvent.pageX + 10 + "px")
            .style("top", event.originalEvent.pageY - 10 + "px")
            .style("display", "block"),
        )
        layer.on("mousemove", (event) =>
          this.tooltip
            .style("left", event.originalEvent.pageX + 10 + "px")
            .style("top", event.originalEvent.pageY - 10 + "px"),
        )
        layer.on("mouseout", () => this.tooltip.style("display", "none"))
      },
    }).addTo(this.map)
  }

  transformData(data) {
    if (this.currentOption == "country") {
      const countriesData = Array.from(
        d3.rollup(
          data,
          (leaves) => leaves,
          (d) => d.country,
        ),
      )
        .filter((d) => d[0] != null)
        .map((d) => ({
          count: d[1].length,
          country: d[0],
        }))
        .sort((a, b) => b.count - a.count)

      return {
        ...data.geo,
        features: this.allCountries.map((row) => ({
          ...row,
          values: countriesData.find(
            (element) =>
              element.country.includes(row.properties.name) ||
              row.properties.name.includes(element.country),
          ) ?? { count: 0 },
        })),
      }
    }

    return {
      type: "FeatureCollection",
      features: Array.from(
        d3.rollup(
          data,
          (leaves) => leaves,
          (d) => d.city,
        ),
      )
        .filter((d) => d[0] != null)
        .map((d) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: d[1][0].coordinates,
          },
          count: d[1].length,
          city: d[0],
          country: d[1][0].country,
        }))
        .sort((a, b) => b.count - a.count),
    }
  }

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

  removePaths() {
    this.map.removeLayer(this.cityPath)
    this.map.removeLayer(this.countryPath)
  }
}
