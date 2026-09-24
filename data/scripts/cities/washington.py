"""Washington: WMATA's six Metrorail lines, from the District's map layers.

WMATA's own feed is behind a developer key, so the network is taken from the
two layers the District of Columbia publishes on Open Data DC instead: Metro
lines and Metro stations for the whole region, drawn by the District's GIS
office from WMATA's data and fitted to aerial photography, under CC BY 4.0.
The same move as Lyon's, and for a similar reason: the map is published
under clearer terms than the feed.

The line layer is one feature per line, each drawn end to end over the track
it runs on, so the trunk the Orange, Silver and Blue lines share downtown is
drawn once for each of them. The station layer is one point per station and
says which lines call at it.
"""

from collections import defaultdict
from pathlib import Path
import json

from transit_geometry import prepare_paths, round_coordinates

SOURCE = Path(__file__).resolve().parents[2] / "wmata_dcgis"

ID = "washington"

NOTICE = (
    "Contains data from the District of Columbia's Office of the Chief "
    "Technology Officer (Open Data DC), licensed under CC BY 4.0, modified."
)

REFERENCE_LATITUDE = 38.9

# The public line each layer feature is drawn as. WMATA prints a single letter
# on each line's disc — R, O, S, B, Y, G — and the layers spell the lines out
# by colour, in lower case.
LINES = {
    "wmata:r": {"red"},
    "wmata:o": {"orange"},
    "wmata:s": {"silver"},
    "wmata:b": {"blue"},
    "wmata:y": {"yellow"},
    "wmata:g": {"green"},
}

FEATURE_LINES = {
    feature: line_id for line_id, features in LINES.items() for feature in features
}


def read_layer(name):
    with (SOURCE / f"{name}.geojson").open(encoding="utf-8") as file:
        return json.load(file)["features"]


def parts(geometry):
    if geometry["type"] == "LineString":
        return [geometry["coordinates"]]

    return geometry["coordinates"]


def read_paths():
    paths = defaultdict(list)

    # By the layer's own feature id, so a re-exported layer still produces the
    # same file.
    for feature in sorted(
        read_layer("metro_lines_regional"),
        key=lambda feature: feature["properties"]["GIS_ID"],
    ):
        line_id = FEATURE_LINES.get(feature["properties"]["NAME"])

        if line_id is None:
            continue

        for part in parts(feature["geometry"]):
            paths[line_id].append([[point[0], point[1]] for point in part])

    return paths


def read_stations():
    stations = []

    for feature in read_layer("metro_stations_regional"):
        properties = feature["properties"]
        served = sorted(
            {
                FEATURE_LINES[name.strip()]
                for name in properties["LINE"].split(",")
                if name.strip() in FEATURE_LINES
            }
        )

        if served:
            stations.append(
                {
                    "name": properties["NAME"],
                    "lines": served,
                    "coordinates": round_coordinates(
                        feature["geometry"]["coordinates"]
                    ),
                }
            )

    return sorted(stations, key=lambda station: station["name"])


def build():
    paths = read_paths()

    return {
        "notice": NOTICE,
        "lines": [
            {
                "id": line_id,
                "paths": prepare_paths(paths[line_id], REFERENCE_LATITUDE),
            }
            for line_id in LINES
            if paths[line_id]
        ],
        "stations": read_stations(),
    }
