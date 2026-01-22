function parseCost(value) {
  if (typeof(value) === 'number') {
    return value 
  }
  if (!value || value.toLowerCase() === "unknown") return null

  const normalized = value
    .toLowerCase()
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim()

  const numbers = normalized.match(/\d+/g)?.map(Number) ?? []

  return numbers.length == 2
    ? d3.mean(numbers)
    : numbers.length == 1
      ? numbers[0]
      : null
}

function splitMultiValueField(v) {
  return (
    v
      ?.trim()
      ?.split(/[;,]+/)
      .map((item) => item.trim().replace(/^- /, "")) ?? []
  )
}

const columns = [
  {
    name: "Title",
    fieldName: "title",
  },
  {
    name: "Native title",
    fieldName: "nativeTitle",
  },
  {
    name: "Description",
    fieldName: "short_description_of_the_intervention",
  },
  {
    name: "City",
    fieldName: "city",
  },
  {
    name: "Country",
    fieldName: "country",
  },
  {
    name: "City's population",
    fieldName: "cityPopulation",
  },
  {
    name: "Start year",
    fieldName: "startYear",
  },
  {
    name: "End year",
    fieldName: "endYear",
  },
  {
    name: "Duration",
    fieldName: "duration",
  },
  {
    name: "Cost",
    fieldName: "cost",
  },
  {
    name: "Funding source(s)",
    fieldName: "fundingSources",
  },
  {
    name: "Spacial scale",
    fieldName: "spatialScale",
  },
  {
    name: "Area in m^2",
    fieldName: "area",
  },
  {
    name: "Type of area before implementation",
    fieldName: "areaTypes",
  },
  {
    name: "Present stage",
    fieldName: "presentStage",
  },
  {
    name: "Implemented in response to local regulation strategy plan",
    fieldName: "responseToLocalRegulation",
  },
  {
    name: "Implemented in response to national regulations strategy plan",
    fieldName: "responseToNationalRegulation",
  },
  {
    name: "Implemented in response to EU regulation strategy plan",
    fieldName: "responseToEURegulation",
  },
  {
    name: "Primary beneficiaries",
    fieldName: "primary_beneficiaries",
  },
  {
    name: "Social and cultural impacts",
    fieldName: "socialCulturalImpacts",
  },
  {
    name: "Environmental impacts",
    fieldName: "environmentalImpacts",
  },
  {
    name: "Focus of the project",
    fieldName: "focus",
  },
  {
    name: "Goals of the intervention",
    fieldName: "goals",
  },
  {
    name: "Governance arrangements",
    fieldName: "governanceArrangements",
  },
  {
    name: "Implementation activities",
    fieldName: "implementationActivities",
  },
  {
    name: "Sustainability challanges addressed",
    fieldName: "sustainabilityChallengesAddressed",
  },
  {
    name: "Key actors",
    fieldName: "keyActors",
  },
  {
    name: "Last updated",
    fieldName: "lastUpdated",
  },
  {
    name: "Link to UNA city",
    fieldName: "link",
  },
]
