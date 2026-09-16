"""Toronto: the TTC's rapid transit — the subway and the two light rail lines.

One feed, one operator, and the same output shape every city module returns.
What makes this one different from Montréal is that the feed knows which line
calls at which station, so the stations are read out of stop_times rather than
worked out from where they sit.
"""

from collections import defaultdict
from pathlib import Path
import re

from transit_geometry import prepare_paths, read_csv, round_coordinates

SOURCE = Path(__file__).resolve().parents[2] / "ttc_gtfs"

ID = "toronto"

# The attribution statement the licence asks for, word for word, and the fact
# that what ships here is not the feed as published.
NOTICE = (
    "Contains information licensed under the Open Government Licence – "
    "Toronto, modified."
)

# Roughly the latitude of the city, which is all the simplifier needs to turn
# its two-metre tolerance into degrees of longitude.
REFERENCE_LATITUDE = 43.7

# The public line each feed route is drawn as. The TTC numbers its routes the
# way it numbers its lines, so the two columns read alike today; they are still
# two different things, and this stays the one place a route id appears.
#
# Lines 5 and 6 are light rail rather than subway and the feed says so, but a
# rider looking for a flat twelve minutes to work is not sorting by rolling
# stock. They are drawn like the rest, with a switch each.
LINES = {
    "ttc:1": {"1"},
    "ttc:2": {"2"},
    "ttc:4": {"4"},
    "ttc:5": {"5"},
    "ttc:6": {"6"},
}

ROUTE_LINES = {
    route: line_id for line_id, routes in LINES.items() for route in routes
}

# Platforms are named for the station they are in: "Spadina Station -
# Northbound Platform", "Mount Dennis Station LRT Platform", and — for the one
# station the feed never calls a station — "York University - Northbound
# Platform". Everything from the word "Station", or from the dash that stands
# in for it, is the platform rather than the station.
PLATFORM = re.compile(r"\s+Station\b.*$|\s+-\s+.*$")


def station_name(name):
    return PLATFORM.sub("", name).strip()


def read_paths():
    shape_routes = {
        trip["shape_id"]: trip["route_id"]
        for trip in read_csv(SOURCE, "trips.txt")
    }
    shapes = defaultdict(list)

    for point in read_csv(SOURCE, "shapes.txt"):
        shapes[point["shape_id"]].append(
            (
                int(point["shape_pt_sequence"]),
                [float(point["shape_pt_lon"]), float(point["shape_pt_lat"])],
            )
        )

    paths = defaultdict(list)

    # By shape id rather than in the order the rows happened to arrive, so a
    # feed re-exported with its rows shuffled still produces the same file.
    for shape_id in sorted(shapes):
        line_id = ROUTE_LINES.get(shape_routes[shape_id])

        if line_id is None:
            continue

        paths[line_id].append(
            [coordinates for _, coordinates in sorted(shapes[shape_id])]
        )

    return paths


def read_stations():
    """One entry per station, whatever number of lines call at it.

    A station is drawn where the feed puts the station rather than at the
    middle of its platforms: Spadina's are a tunnel and a third of a kilometre
    apart, and their midpoint is a place no rider ever arrives.
    """
    stops = {stop["stop_id"]: stop for stop in read_csv(SOURCE, "stops.txt")}
    lines = {
        trip["trip_id"]: ROUTE_LINES.get(trip["route_id"])
        for trip in read_csv(SOURCE, "trips.txt")
    }
    # The feed gives nearly every platform a parent station to point at. The
    # few it leaves without one still carry that station's name, which is what
    # brings the two together.
    by_name = {
        station_name(stop["stop_name"]): stop
        for stop in stops.values()
        if stop["location_type"] == "1"
    }
    stations = defaultdict(set)

    for call in read_csv(SOURCE, "stop_times.txt"):
        line_id = lines.get(call["trip_id"])

        if line_id is None:
            continue

        platform = stops[call["stop_id"]]
        station = stops.get(platform["parent_station"]) or by_name[
            station_name(platform["stop_name"])
        ]
        stations[station_name(station["stop_name"])].add(line_id)

    return [
        {
            "name": name,
            "lines": sorted(lines_called),
            "coordinates": round_coordinates(
                (
                    float(by_name[name]["stop_lon"]),
                    float(by_name[name]["stop_lat"]),
                )
            ),
        }
        for name, lines_called in sorted(stations.items())
    ]


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
