"""Lyon: the TCL's four métro lines, from SYTRAL's own map layers.

The only city here that is not built from a GTFS feed, and not by choice.
SYTRAL publishes a timetable feed like everyone else, and that feed draws its
buses and its tramways in shapes.txt and draws the métro nowhere at all —
every métro trip in it is a run of stop times with no shape to go with them.

What SYTRAL does publish is the map: one layer of métro and funicular routes
and one of stops, both on the Métropole de Lyon's server, both under the
Licence Ouverte, and both carrying the alignment the feed leaves out. So the
network is taken from there instead, and the feed is not used. The funiculars
are in the same layer and are left out of the ids below: they are a pair of
cable cars up Fourvière, and the switch a rider wants is the métro's.

A route layer is drawn once per direction, out and back over the same track.
That costs nothing: the same deduplication that collapses the REM's shared
trunk drops the return trip's segments as it meets them.
"""

from collections import defaultdict
from pathlib import Path
import json

from transit_geometry import prepare_paths, round_coordinates

SOURCE = Path(__file__).resolve().parents[2] / "tcl_sytral"

ID = "lyon"

NOTICE = (
    "Contains data from SYTRAL Mobilités, licensed under the Licence "
    "Ouverte 2.0, modified."
)

REFERENCE_LATITUDE = 45.75

# The public line each layer feature is drawn as. SYTRAL names its métro
# lines in the layer the way the stations do — A, B, C, D — so this table is
# almost an identity today, and is still the one place the layer's own
# spelling is allowed to appear.
LINES = {
    "tcl:a": {"A"},
    "tcl:b": {"B"},
    "tcl:c": {"C"},
    "tcl:d": {"D"},
}

FEATURE_LINES = {
    feature: line_id for line_id, features in LINES.items() for feature in features
}


def read_layer(name):
    with (SOURCE / f"{name}.geojson").open(encoding="utf-8") as file:
        return json.load(file)["features"]


def read_paths():
    paths = defaultdict(list)

    # By the trace code the layer gives each direction, rather than in the
    # order the features happened to arrive, so a re-exported layer still
    # produces the same file.
    for feature in sorted(
        read_layer("lignes_metro"),
        key=lambda feature: feature["properties"]["code_trace"],
    ):
        line_id = FEATURE_LINES.get(feature["properties"]["ligne"])

        if line_id is None:
            continue

        for part in feature["geometry"]["coordinates"]:
            paths[line_id].append([[point[0], point[1]] for point in part])

    return paths


def read_stations():
    """One entry per station, whatever number of lines call at it.

    The stops layer is one point per platform and says which lines call at
    each, so the platforms sharing a name are the station and the station is
    the middle of them.
    """
    grouped = defaultdict(list)

    for feature in read_layer("arrets_metro"):
        properties = feature["properties"]
        served = sorted(
            {
                FEATURE_LINES[name]
                for name in properties["desserte"].split(",")
                if name in FEATURE_LINES
            }
        )

        if served:
            grouped[properties["nom"]].append(
                (served, feature["geometry"]["coordinates"])
            )

    stations = []

    for name, platforms in sorted(grouped.items()):
        served = sorted({line_id for lines, _ in platforms for line_id in lines})
        points = [point for _, point in platforms]
        stations.append(
            {
                "name": name,
                "lines": served,
                "coordinates": round_coordinates(
                    (
                        sum(point[0] for point in points) / len(points),
                        sum(point[1] for point in points) / len(points),
                    )
                ),
            }
        )

    return stations


def build():
    paths = read_paths()

    return {
        "notice": NOTICE,
        # In the order the lines are declared, so the file reads the same way
        # from one build to the next however the sources are ordered.
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
