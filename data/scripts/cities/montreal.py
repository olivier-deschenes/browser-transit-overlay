"""Montréal: the STM métro from the STM's shapefiles, the REM from its GTFS.

Two sources, two shapes of file, and one output. What the rest of the build
needs from a city module is this one: ID, NOTICE, and a build() returning the
lines and stations of the city with its own line ids already on them.
"""

from collections import defaultdict
from pathlib import Path

from pyproj import CRS, Transformer
import shapefile

from transit_geometry import (
    COORDINATE_PRECISION,
    prepare_paths,
    read_csv,
    round_coordinates,
)

DATA = Path(__file__).resolve().parents[2]
PROJECT = DATA.parent
STM_SOURCE = DATA / "stm_sig"
REM_SOURCE = PROJECT / "rem_data"

ID = "montreal"
NOTICE = "Contains modified STM and Réseau express métropolitain data."

# Roughly the latitude of the island, which is all the simplifier needs to
# turn its two-metre tolerance into degrees of longitude.
REFERENCE_LATITUDE = 45.5

# stops.txt says nothing about which route serves a stop, and with the REM's
# routes all drawn as one line there is nothing left to work out: every
# station in the feed is a station of that line.
REM_LINE = "rem:a"

# The public line each feed route is drawn as. This is the only place in the
# project where a route id from either feed appears: everything downstream
# knows the network by these ids, which are the operators' own names for their
# lines and survive a feed being re-exported with different ones.
#
# The REM's three routes share a trunk and one colour, and once that trunk has
# been deduplicated they share one another's geometry as well — the track S3
# runs on downtown is kept under S1. Drawing them as three lines would mean
# taking one away pulled that track out from under the others, so they are one
# line, and the deduplication that used to have to reach across routes is now
# simply the deduplication within a line that every line gets.
LINES = {
    "stm:1": {"1"},
    "stm:2": {"2"},
    "stm:4": {"4"},
    "stm:5": {"5"},
    REM_LINE: {"S1", "S2", "S3"},
}

# Read the other way round, which is the way the two readers below ask: the
# system a line belongs to is the first segment of its own id, and that is
# also which source the route id was read out of.
ROUTE_LINES = {
    (line_id.split(":")[0], route): line_id
    for line_id, routes in LINES.items()
    for route in routes
}


def stm_transformer():
    projection = CRS.from_wkt((STM_SOURCE / "stm_lignes_sig.prj").read_text())

    return Transformer.from_crs(projection, "EPSG:4326", always_xy=True)


def read_stm_paths(project, paths):
    with shapefile.Reader(
        str(STM_SOURCE / "stm_lignes_sig"), encoding="utf-8"
    ) as reader:
        for shape_record in reader.iterShapeRecords():
            record = shape_record.record.as_dict()
            route_id = str(record["route_id"]).strip()
            line_id = ROUTE_LINES.get(("stm", route_id))

            if line_id is None:
                continue

            coordinates = [
                list(project.transform(x, y))
                for x, y in shape_record.shape.points
            ]
            parts = [*shape_record.shape.parts, len(coordinates)]

            for start, end in zip(parts, parts[1:]):
                paths[line_id].append(coordinates[start:end])


def read_stm_stations(project):
    """One entry per station, whatever number of lines call at it.

    The shapefile has a record per line per platform, so the coordinates are
    averaged and the lines collected: a transfer station is one dot that stays
    on the map for as long as any one of its lines is still switched on.
    """
    stations = {}

    with shapefile.Reader(
        str(STM_SOURCE / "stm_arrets_sig"), encoding="utf-8"
    ) as reader:
        for shape_record in reader.iterShapeRecords():
            record = shape_record.record.as_dict()
            route_id = str(record["route_id"]).strip()
            line_id = ROUTE_LINES.get(("stm", route_id))

            if line_id is None or int(record["loc_type"]) != 0:
                continue

            name = str(record["stop_name"]).removeprefix("Station ").strip()
            longitude, latitude = project.transform(
                *shape_record.shape.points[0]
            )
            station = stations.setdefault(
                name,
                {"longitude": 0, "latitude": 0, "count": 0, "lines": set()},
            )
            station["longitude"] += longitude
            station["latitude"] += latitude
            station["count"] += 1
            station["lines"].add(line_id)

    return [
        {
            "name": name,
            "lines": sorted(station["lines"]),
            "coordinates": [
                round(
                    station["longitude"] / station["count"],
                    COORDINATE_PRECISION,
                ),
                round(
                    station["latitude"] / station["count"],
                    COORDINATE_PRECISION,
                ),
            ],
        }
        for name, station in sorted(stations.items())
    ]


def read_rem_paths(paths):
    shape_routes = {
        trip["shape_id"]: trip["route_id"]
        for trip in read_csv(REM_SOURCE, "trips.txt")
    }
    shapes = defaultdict(list)

    for point in read_csv(REM_SOURCE, "shapes.txt"):
        shapes[point["shape_id"]].append(
            (
                int(point["shape_pt_sequence"]),
                [float(point["shape_pt_lon"]), float(point["shape_pt_lat"])],
            )
        )

    # By shape id rather than in the order the rows happened to arrive, so a
    # feed re-exported with its rows shuffled still produces the same file.
    for shape_id in sorted(shapes):
        line_id = ROUTE_LINES.get(("rem", shape_routes[shape_id]))

        if line_id is None:
            continue

        paths[line_id].append(
            [coordinates for _, coordinates in sorted(shapes[shape_id])]
        )


def read_rem_stations():
    return [
        {
            "name": stop["stop_name"].removeprefix("Station ").strip(),
            "lines": [REM_LINE],
            "coordinates": round_coordinates(
                (float(stop["stop_lon"]), float(stop["stop_lat"]))
            ),
        }
        for stop in read_csv(REM_SOURCE, "stops.txt")
        if stop["location_type"] == "1"
    ]


def build():
    project = stm_transformer()
    paths = defaultdict(list)

    read_stm_paths(project, paths)
    read_rem_paths(paths)

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
        "stations": [*read_stm_stations(project), *read_rem_stations()],
    }
