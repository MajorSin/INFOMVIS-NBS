class MapFilteredCities {
  constructor(data) {
    window._selectedCities = []
    this.allCountries = []

    this.map = L.map("mapArea").setView([20, 0], 2)

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(this.map)

    this.tooltip = d3.select("#mapTooltip")

    this.currentOption = "country"
    this.mapOptions = d3.selectAll("#mapOptions input")

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

    this.radiusScale = d3.scaleSqrt().range([2, 20])
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
    const max = d3.max(data.features.map((d) => d.count))
    this.radiusScale.domain([1, max])

    L.geoJSON(data.features, {
      pointToLayer: (d, latlng) =>
        new L.circleMarker(latlng, {
          radius: this.radiusScale(d.count),
          fillColor: "rgb(255, 255, 255)",
          fillOpacity: 0.8,
          color: "rgb(255, 255, 255)",
        }),
      onEachFeature: (d, layer) => {
        layer.on("mouseover", (event) =>
          this.tooltip
            .html(`${d.city}, ${d.country}<br/>Projects: ${d.count}`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px")
            .style("display", "block")
        )
        layer.on("mousemove", (event) =>
          this.tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px")
        )
        layer.on("mouseout", () => this.tooltip.style("display", "none"))
      },
    }).addTo(this.map)
  }

  updateCountries(data) {
    const max = d3.max(data.features.map((d) => d.values.count))
    this.colorScale.domain([0, max])

    L.geoJSON(data.features, {
      style: (country) => ({
        color: "black",
        weight: 1,
        fillColor: this.colorScale(country.values.count),
        fillOpacity: 0.8,
      }),
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
  }

  transformData(data) {
    // todo: possible bug when updating
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
              row.properties.name.includes(element.country)
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
          (d) => d.coordinates
        )
      )
        .filter((d) => d[0] != null)
        .map((d) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: this.parseCoordinate(d[0]),
          },
          count: d[1].length,
          city: d[1][0].city,
          country: d[1][0].country,
        })),
    }
  }

  parseCoordinate(pointRaw) {
    return pointRaw
      .substring(1, pointRaw.length - 1)
      .split(",")
      .map(Number)
      .reverse()
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
}
