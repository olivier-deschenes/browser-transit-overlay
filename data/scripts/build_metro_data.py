from collections import defaultdict
from math import cos, hypot, radians
import csv
import json
from pathlib import Path

from pyproj import CRS, Transformer
import shapefile


DATA = Path(__file__).resolve().parents[1]
PROJECT = DATA.parent
SOURCE = DATA / "stm_sig"
REM_SOURCE = PROJECT / "rem_data"
OUTPUT = PROJECT / "extension" / "metro-data.json"
METRO_ROUTES = {"1", "2", "4", "5"}
COLORS = {
    "1": "#00A16B",
    "2": "#F58220",
    "4": "#FFD520",
    "5": "#0075C9",
}

# Coordinates are rounded to about 11 cm and polylines are thinned until a
# dropped point would move the drawn line by more than two metres. Both are
# well below one screen pixel at the deepest zoom Marketplace offers, so the
# overlay looks identical while the browser rasterises far fewer segments.
COORDINATE_PRECISION = 6
SNAP_PRECISION = 6
SIMPLIFY_TOLERANCE_METRES = 2.0
METRES_PER_DEGREE = 111_320.0
REFERENCE_LATITUDE = 45.5
LICENSE = {
    "notice": "Contains modified STM and Réseau express métropolitain data.",
    "stm": "https://www.stm.info/en/about/developers/terms-use",
    "rem": "https://rem.info/fr",
    "terms": "https://creativecommons.org/licenses/by/4.0/",
}


def transformer():
    projection = CRS.from_wkt((SOURCE / "stm_lignes_sig.prj").read_text())
    return Transformer.from_crs(projection, "EPSG:4326", always_xy=True)


def snap(point):
    return (round(point[0], SNAP_PRECISION), round(point[1], SNAP_PRECISION))


def to_metres(point):
    longitude, latitude = point

    return (
        longitude * METRES_PER_DEGREE * cos(radians(REFERENCE_LATITUDE)),
        latitude * METRES_PER_DEGREE,
    )


def unique_segment_paths(paths, seen):
    """Split polylines so each physical segment is drawn exactly once.

    Transit shapes repeat the same track for every branch and every
    direction, so the shared REM trunk arrives eleven times over. Stacking
    those copies costs a full rasterisation pass each and changes nothing on
    screen, since the duplicates land on the same pixels.
    """
    result = []

    for path in paths:
        current = []

        for start, end in zip(path, path[1:]):
            first, last = snap(start), snap(end)

            if first == last:
                continue

            key = (first, last) if first < last else (last, first)

            if key in seen:
                if len(current) > 1:
                    result.append(current)

                current = []
                continue

            seen.add(key)

            if not current:
                current = [start]

            current.append(end)

        if len(current) > 1:
            result.append(current)

    return result


def simplify(path):
    """Ramer-Douglas-Peucker thinning with the tolerance given in metres."""
    if len(path) < 3:
        return path

    projected = [to_metres(point) for point in path]
    keep = [False] * len(path)
    keep[0] = keep[-1] = True
    stack = [(0, len(path) - 1)]

    while stack:
        start, end = stack.pop()

        if end - start < 2:
            continue

        (start_x, start_y), (end_x, end_y) = projected[start], projected[end]
        run_x, run_y = end_x - start_x, end_y - start_y
        span = hypot(run_x, run_y)
        cross = end_x * start_y - end_y * start_x
        farthest = 0.0
        index = -1

        for candidate in range(start + 1, end):
            x, y = projected[candidate]

            if span:
                distance = abs(run_y * x - run_x * y + cross) / span
            else:
                distance = hypot(x - start_x, y - start_y)

            if distance > farthest:
                farthest = distance
                index = candidate

        if index != -1 and farthest > SIMPLIFY_TOLERANCE_METRES:
            keep[index] = True
            stack.append((start, index))
            stack.append((index, end))

    return [point for point, keeper in zip(path, keep) if keeper]


def prepare_paths(paths, seen):
    return [
        [
            [round(longitude, COORDINATE_PRECISION),
             round(latitude, COORDINATE_PRECISION)]
            for longitude, latitude in simplify(path)
        ]
        for path in unique_segment_paths(paths, seen)
    ]


def stm_line_data(project):
    lines = defaultdict(list)

    source = str(SOURCE / "stm_lignes_sig")

    with shapefile.Reader(source, encoding="utf-8") as reader:
        for shape_record in reader.iterShapeRecords():
            record = shape_record.record.as_dict()
            route_id = str(record["route_id"]).strip()

            if route_id not in METRO_ROUTES:
                continue

            coordinates = [
                list(project.transform(x, y))
                for x, y in shape_record.shape.points
            ]
            parts = [*shape_record.shape.parts, len(coordinates)]

            for start, end in zip(parts, parts[1:]):
                lines[route_id].append(coordinates[start:end])

    return [
        {
            "id": route_id,
            "color": COLORS[route_id],
            # Each metro line owns its colour, so duplicates are only dropped
            # within the line and never between two differently drawn lines.
            "paths": prepare_paths(lines[route_id], set()),
        }
        for route_id in sorted(lines, key=int)
    ]


def stm_station_data(project):
    stations = {}

    source = str(SOURCE / "stm_arrets_sig")

    with shapefile.Reader(source, encoding="utf-8") as reader:
        for shape_record in reader.iterShapeRecords():
            record = shape_record.record.as_dict()
            route_id = str(record["route_id"]).strip()

            if route_id not in METRO_ROUTES or int(record["loc_type"]) != 0:
                continue

            name = str(record["stop_name"]).removeprefix("Station ").strip()
            longitude, latitude = project.transform(
                *shape_record.shape.points[0]
            )
            station = stations.setdefault(
                name,
                {
                    "longitude": 0,
                    "latitude": 0,
                    "count": 0,
                    "lines": set(),
                },
            )
            station["longitude"] += longitude
            station["latitude"] += latitude
            station["count"] += 1
            station["lines"].add(route_id)

    return [
        {
            "name": name,
            "lines": sorted(station["lines"], key=int),
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


def read_csv(name):
    with (REM_SOURCE / name).open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def rem_line_data():
    routes = {
        route["route_id"]: f"#{route['route_color']}"
        for route in read_csv("routes.txt")
    }
    shape_routes = {
        trip["shape_id"]: trip["route_id"]
        for trip in read_csv("trips.txt")
    }
    shapes = defaultdict(list)

    for point in read_csv("shapes.txt"):
        shapes[point["shape_id"]].append(
            (
                int(point["shape_pt_sequence"]),
                [
                    float(point["shape_pt_lon"]),
                    float(point["shape_pt_lat"]),
                ],
            )
        )

    lines = defaultdict(list)
    for shape_id, points in shapes.items():
        route_id = shape_routes[shape_id]
        lines[route_id].append(
            [coordinates for _, coordinates in sorted(points)]
        )

    # Every REM branch renders in the same green, so the shared trunk is
    # deduplicated across routes: whichever route is processed first keeps
    # the geometry and the others keep only what is theirs alone.
    seen = set()
    data = []

    for route_id in sorted(lines):
        paths = prepare_paths(lines[route_id], seen)

        if paths:
            data.append(
                {"id": route_id, "color": routes[route_id], "paths": paths}
            )

    return data


def rem_station_data():
    return [
        {
            "name": stop["stop_name"].removeprefix("Station ").strip(),
            "lines": ["REM"],
            "coordinates": [
                round(float(stop["stop_lon"]), COORDINATE_PRECISION),
                round(float(stop["stop_lat"]), COORDINATE_PRECISION),
            ],
        }
        for stop in read_csv("stops.txt")
        if stop["location_type"] == "1"
    ]


def main():
    project = transformer()
    data = {
        "license": LICENSE,
        "lines": [*stm_line_data(project), *rem_line_data()],
        "stations": [*stm_station_data(project), *rem_station_data()],
    }
    OUTPUT.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    points = sum(
        len(path) for line in data["lines"] for path in line["paths"]
    )
    print(
        f"{OUTPUT.name}: {len(data['lines'])} lines, {points} points, "
        f"{len(data['stations'])} stations, "
        f"{OUTPUT.stat().st_size / 1024:.1f} KiB"
    )


if __name__ == "__main__":
    main()
