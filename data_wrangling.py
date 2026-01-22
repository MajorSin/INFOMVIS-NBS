import pandas as pd
import numpy as np
import re
import os
from datetime import datetime
import torch
from sentence_transformers.util import cos_sim
import time
import requests
import numpy as np
import pandas as pd
import numpy as np
import re
import os
from SPARQLWrapper import SPARQLWrapper, JSON
from sentence_transformers import SentenceTransformer

file_path = "../dataset/nbs-xls-export 20251119.xlsx"
df = pd.read_excel(file_path, sheet_name="Worksheet")

def clean_columns(df):
    df = df.copy()
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(r"[^\w]+", "_", regex=True)
        .str.replace(r"__+", "_", regex=True)
        .str.strip("_")
    )
    return df

df = clean_columns(df)

rename_map = {
    "sustainability_challenge_s_addressed": "sustainability_challenges_addressed",
    "source_s_of_funding": "sources_of_funding",
    "type_of_fund_s_used": "type_of_funds_used"
}

df = df.rename(columns=rename_map)

def clean_datetime(value):
    if pd.isna(value):
        return None
    value = str(value)
    value = re.sub(r"^[A-Za-z]{3},\s*", "", value)
    value = value.strip()

    for fmt in ["%m/%d/%Y - %H:%M", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(value, fmt)
        except:
            continue
    return None

df["last_updated"] = df["last_updated"].apply(clean_datetime)

df["city_population"] = (
    df["city_population"]
    .astype(str)
    .str.replace(",", "", regex=False)
)

df["city_population"] = pd.to_numeric(df["city_population"], errors="coerce")
df["city_population"] = df["city_population"].astype("Int64")


def extract_years(x):
    x = str(x).lower()
    if "unknown" in x:
        return pd.NA, pd.NA

    x = x.replace("–", "-")

    parts = [p.strip() for p in x.split("-")]

    if len(parts) == 2:
        start = re.sub(r"\D", "", parts[0])
        end = re.sub(r"\D", "", parts[1])

        start_year = int(start) if start.isdigit() else pd.NA
        end_year = int(end) if end.isdigit() else pd.NA
        return start_year, end_year
    return pd.NA, pd.NA

df[["start_year", "end_year"]] = df["duration"].apply(lambda x: pd.Series(extract_years(x)))


def parse_area(value):
    if pd.isna(value):
        return None

    s = str(value).lower().strip()

    s = s.replace(",", "")

    nums = re.findall(r"\d+\.?\d*", s)

    if not nums:
        return None

    if len(nums) >= 2:
        nums = [float(n) for n in nums]
        num = sum(nums) / len(nums)
    else:
        num = float(nums[0])

    if "km" in s:
        return num * 1_000_000
    elif "ha" in s or "hectare" in s:  
        return num * 10_000 
    elif "m2" in s or "m²" in s or "sqm" in s:
        return num
    else:
        return num

df["nbs_area_m2"] = df["nbs_area"].apply(parse_area).astype("Float64")


multi_value_columns = [
    "sustainability_challenges_addressed",
    "focus_of_the_project",
    "goals_of_the_intervention",
    "implementation_activities",
    "climate_change_adaptation_what_activities_are_implemented_to_realize_the_conservation_goals_and_targets",
    "climate_change_mitigation_what_activities_are_implemented_to_realize_the_conservation_goals_and_targets",
    "habitats_and_biodiversity_conservation_what_activities_are_implemented_to_realize_the_conservation_goals_and_targets",
    "habitats_and_biodiversity_restoration_what_activities_are_implemented_to_realize_the_restoration_goals_and_targets",
    "primary_beneficiaries",
    "governance_arrangements",
    "key_actors_initiating_organization",
    "participatory_methods_forms_of_community_involvement_used",
    "please_specify_the_roles_of_the_specific_government_and_non_government_actor_groups_involved_in_the_initiative",
    "sources_of_funding",
    "type_of_funds_used",
    "type_of_non_financial_contribution",
    "who_provided_the_non_financial_contribution",
    "environmental_impacts",
    "economic_impacts",
    "social_and_cultural_impacts",
    "type_of_reported_impacts",
    "list_of_references"
]

def normalize_separators(value):
    if pd.isna(value):
        return None
    v = str(value)
    v = v.replace("\n", ";").replace(",", ";").replace(" / ", ";").replace("/", ";")
    v = re.sub(r";{2,}", ";", v)
    return v.strip(" ;")

output_folder = "../dataset_cleaning_working_folder"
os.makedirs(output_folder, exist_ok=True)

id_col = "name_of_the_nbs_intervention_short_english_title"

long_tables = {}

for col in multi_value_columns:
    if col not in df.columns:
        continue

    df[col] = df[col].apply(normalize_separators)

    tmp = df[[id_col, col]].copy()
    tmp[col] = tmp[col].str.split(";")
    tmp = tmp.explode(col)
    tmp[col] = tmp[col].str.strip()
    tmp = tmp.dropna(subset=[col])

    long_tables[col] = tmp


    filename = f"{output_folder}/long_{col}.csv"
    
main_output = f"{output_folder}/cleaned_nbs_data.csv"





os.listdir("../dataset_cleaning_working_folder")


def get_coordinates(row):
    endpoint_url = "https://query.wikidata.org/sparql"
    sparql = SPARQLWrapper(endpoint_url)
    sparql.setReturnFormat(JSON)

    city_original = row["city"].strip().title()

    country_raw = row.get("country", None)

    if country_raw is None or (isinstance(country_raw, float) and str(country_raw) == "nan"):
        country = None
    else:
        country = country_raw.strip().title()

    city_candidates = [city_original]

    parts = [p.strip().title() for p in row["city"].split() if p.strip()]
    city_candidates.extend(parts)

    def run_query(city_candidate):

        city_candidate = city_candidate.strip().title()

        if country is None:
            query = f"""
            SELECT ?coord WHERE {{
              ?city rdfs:label "{city_candidate}"@en.
              ?city wdt:P625 ?coord.
            }}
            LIMIT 1
            """
        else:
            query = f"""
            SELECT ?coord WHERE {{
              ?city rdfs:label "{city_candidate}"@en.
              ?country rdfs:label "{country}"@en.

              ?city wdt:P17 ?country.
              ?city wdt:P625 ?coord.
            }}
            LIMIT 1
            """

        sparql.setQuery(query)

        try:
            results = sparql.query().convert()
        except Exception as e:
            print(f"Query failed for '{city_candidate}':", e)
            return None

        bindings = results["results"]["bindings"]
        if not bindings:
            print(f"No results for '{city_candidate}' (country={country})")
            return None

        coord_value = bindings[0]["coord"]["value"]
        lon, lat = coord_value.replace("Point(", "").replace(")", "").split()
        return float(lat), float(lon)

    for city_candidate in city_candidates:
        coords = run_query(city_candidate)
        if coords:
            return coords

    return None


df["coordinates"] = df.apply(axis=1, func=get_coordinates)

df.nbs_area.head()
df['nbs_area_float'] = df.nbs_area.apply(lambda string :  float(string.replace("m²", "")) if type(string) == str else string)
df['total_cost_low_float'] = df['total_cost'].apply(lambda string : min([float(v) for v in string.replace(",","")
                                                                          .replace("€","")
                                                                          .replace(" - ", " ")
                                                                          .replace("More than ","")
                                                                          .replace("Less than ","")
                                                                          .replace("Not applicable", "nan")
                                                                          .replace("Unknown", "nan")
                                                                          .split(" ")]))

df['total_cost_high_float'] = df['total_cost'].apply(lambda string : max([float(v) for v in string.replace(",","")
                                                                          .replace("€","")
                                                                          .replace(" - ", " ")
                                                                          .replace("More than ","")
                                                                          .replace("Less than ","")
                                                                          .replace("Not applicable", "nan")
                                                                          .replace("Unknown", "nan")
                                                                          .split(" ")]))

df['cost_per_sq_m_low'] = df.total_cost_low_float / df.nbs_area_float
df['cost_per_sq_m_high'] = df.total_cost_high_float / df.nbs_area_float

model = SentenceTransformer('all-MiniLM-L6-v2')

embeddings_columns = df[["name_of_the_nbs_intervention_short_english_title", "native_title_of_the_nbs_intervention", "short_description_of_the_intervention"]]
text_for_embeddings = embeddings_columns.fillna("").agg(" ".join, axis=1)

embeddings = model.encode(text_for_embeddings, convert_to_tensor=True)


similarity_matrix = cos_sim(embeddings, embeddings)

np.savetxt("similarity_matrix.csv", similarity_matrix.cpu().numpy(), delimiter=",")

with open("../dataset_cleaned/similarity_matrix.pt", "wb") as f:
    torch.save(similarity_matrix, f)
    

missing_coords_indexes = np.argwhere(df["coordinates"].isna()).flatten()

session = requests.Session()
session.headers.update({
    "User-Agent": "CityCoordFetcher/1.0 (contact: you@example.com)",
    "Accept": "application/json",
    "Accept-Language": "en"
})

def photon_geocode(city: str, country: str, timeout=20):
    params = {"q": f"{city}, {country}", "limit": 1, "lang": "en"}
    r = session.get("https://photon.komoot.io/api/", params=params, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    feats = data.get("features", [])
    if not feats:
        return None
    lon, lat = feats[0]["geometry"]["coordinates"]
    return (float(lat), float(lon))

for i in missing_coords_indexes:
    city = df.iloc[i].city
    country = df.iloc[i].country
    if pd.isna(city) or pd.isna(country):
        continue

    try:
        df.at[i, "coordinates"] = photon_geocode(str(city), str(country))
    except Exception as e:
        print(f"Failed for {city}, {country}: {e}")
        df.at[i, "coordinates"] = None

    time.sleep(0.5)

df.to_csv("./data/cleaned_nbs_data.csv", index=True)