"""The geometry work every network needs, and nothing about any one city.

A city module says where its data comes from and which public line each feed
route is drawn as; what happens to the coordinates after that is the same
everywhere, so it lives here. The one thing a caller has to supply is the
latitude its city sits at: metres per degree of longitude shrink towards the
poles, and the simplifier measures its tolerance in metres.
"""

from math import cos, hypot, radians
import csv

# Coordinates are rounded to about 11 cm and polylines are thinned until a
# dropped point would move the drawn line by more than two metres. Both are
# well below one screen pixel at the deepest zoom the supported sites offer,
# so the overlay looks identical while the browser rasterises far fewer
# segments.
COORDINATE_PRECISION = 6
SNAP_PRECISION = 6
SIMPLIFY_TOLERANCE_METRES = 2.0
METRES_PER_DEGREE = 111_320.0


def read_csv(directory, name):
    """Read one GTFS table. The feeds ship with a BOM often enough to assume."""
    with (directory / name).open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def snap(point):
    return (round(point[0], SNAP_PRECISION), round(point[1], SNAP_PRECISION))


def to_metres(point, reference_latitude):
    longitude, latitude = point

    return (
        longitude * METRES_PER_DEGREE * cos(radians(reference_latitude)),
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


def simplify(path, reference_latitude):
    """Ramer-Douglas-Peucker thinning with the tolerance given in metres."""
    if len(path) < 3:
        return path

    projected = [to_metres(point, reference_latitude) for point in path]
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


def round_coordinates(point):
    return [
        round(point[0], COORDINATE_PRECISION),
        round(point[1], COORDINATE_PRECISION),
    ]


def prepare_paths(paths, reference_latitude):
    """Everything drawn for one line, deduplicated, thinned, and rounded.

    The duplicates are dropped within a line and never between two of them: a
    line owns its colour, so a segment two lines share has to be drawn twice.
    That every route of a line shares one set of seen segments is the whole
    reason routes are collapsed into lines before they reach here.
    """
    seen = set()

    return [
        [round_coordinates(point) for point in simplify(path, reference_latitude)]
        for path in unique_segment_paths(paths, seen)
    ]
