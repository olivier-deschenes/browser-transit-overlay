"""Reading a rapid-transit network out of one GTFS feed.

Most of the cities here arrive as GTFS, and what has to be done to a feed to
get a drawable network out of it is the same every time: keep the routes that
are the lines being drawn, collect the track those routes run over, and work
out which station is where and which lines call at it. Only the mapping from
feed routes to public line ids differs, so only that stays in a city module.

Three things feeds disagree about, and all three are handled here rather than
once per city:

    Track. Most feeds draw their routes in shapes.txt. Some publish the
    timetable and nothing else — ilévia's does, and SYTRAL's carries shapes
    for the buses but none for the métro — and the only line left to draw is
    the one through the stations in the order they are called at. That is a
    chord where the real track is a curve, which on these two networks is
    worth saying out loud: see the modules that rely on it.

    Stations. A feed either names a parent station for each platform, which
    is the answer, or it leaves platforms standing on their own, in which
    case the platforms sharing a name are the station and the station is the
    middle of them. The second only holds while the platforms of a station
    are near each other; where they are not, a city module says so and does
    its own grouping. A feed can also spell one station more than one way —
    Miami-Dade's names each platform for the direction it serves, and
    SEPTA's gives one platform of a station a parent and leaves the other
    without — and then the city names its stations itself, and the
    platforms that come out under one name are one station.

    Lines. A route is usually one public line, or one of several routes drawn
    as one line. Miami-Dade runs both of its lines as a single route, and
    there the city says which line a trip is from the stations it calls at.
"""

from collections import defaultdict
from statistics import fmean

from transit_geometry import prepare_paths, read_csv, round_coordinates


def read_trips(source, route_lines):
    """Every trip on a drawn line, as trip id to (line id, shape id)."""
    return {
        trip["trip_id"]: (
            route_lines[trip["route_id"]],
            (trip.get("shape_id") or "").strip(),
        )
        for trip in read_csv(source, "trips.txt")
        if trip["route_id"] in route_lines
    }


def read_calls(source, trips):
    """The stops each drawn trip calls at, in the order it calls at them.

    A stop where nobody may get on and nobody may get off is somewhere the
    train passes rather than a station: Edmonton's feed lists the platforms
    at its LRT garages and the tail track past Health Sciences that way.
    """
    calls = defaultdict(list)

    for call in read_csv(source, "stop_times.txt"):
        passes = (call.get("pickup_type") or "").strip() == "1" and (
            call.get("drop_off_type") or ""
        ).strip() == "1"

        if call["trip_id"] in trips and not passes:
            calls[call["trip_id"]].append(
                (int(call["stop_sequence"]), call["stop_id"])
            )

    return {
        trip_id: [stop_id for _, stop_id in sorted(sequence)]
        for trip_id, sequence in calls.items()
    }


def read_shapes(source, wanted):
    """The polylines the feed draws, for the shape ids asked for."""
    if not wanted:
        return {}

    points = defaultdict(list)

    for point in read_csv(source, "shapes.txt"):
        if point["shape_id"] in wanted:
            points[point["shape_id"]].append(
                (
                    int(point["shape_pt_sequence"]),
                    [
                        float(point["shape_pt_lon"]),
                        float(point["shape_pt_lat"]),
                    ],
                )
            )

    return {
        shape_id: [coordinates for _, coordinates in sorted(sequence)]
        for shape_id, sequence in points.items()
    }


def station_of(platform, stops, by_name):
    """The stops that together are the station a platform belongs to.

    One stop when the feed names a parent station, since the feed has then
    already said where the station is; the platforms sharing a name when it
    does not.
    """
    parent = (platform.get("parent_station") or "").strip()

    if parent in stops:
        return (stops[parent],)

    return tuple(by_name[platform["stop_name"]])


def named_station_of(platform, stops, name):
    """What a city calls the station a platform belongs to.

    The name of the platform's parent where it has one and its own where it
    does not, put through the city's own spelling of its stations.
    """
    parent = (platform.get("parent_station") or "").strip()

    return name(
        stops[parent]["stop_name"] if parent in stops else platform["stop_name"]
    )


def read_places(stops, name=None):
    """Where each platform's station is, and what that station is called.

    Worked out once and handed to both of the things that need it, because a
    feed drawn through its stations has to draw them in the same places it
    marks them: a line running over the platforms while the dots sit on the
    parent stations is a line that misses its own stops by the width of the
    concourse.

    A city that names its stations itself has them grouped by those names
    instead: every stop that comes out under one name is that station, and
    the station is the middle of them.
    """
    if name is not None:
        named = {
            stop_id: named_station_of(platform, stops, name)
            for stop_id, platform in stops.items()
        }
        by_station = defaultdict(list)

        for stop_id, station in named.items():
            by_station[station].append(stops[stop_id])

        return {
            stop_id: (station, station, middle(by_station[station]))
            for stop_id, station in named.items()
        }

    by_name = defaultdict(list)

    for stop in stops.values():
        by_name[stop["stop_name"]].append(stop)

    places = {}

    for stop_id, platform in stops.items():
        group = station_of(platform, stops, by_name)
        places[stop_id] = (
            group[0]["stop_id"],
            group[0]["stop_name"],
            middle(group),
        )

    return places


def middle(group):
    return (
        fmean(float(stop["stop_lon"]) for stop in group),
        fmean(float(stop["stop_lat"]) for stop in group),
    )


def read_paths(source, trips, calls, places):
    """Everything drawn for each line, from shapes where the feed has them.

    By shape id and by trip id rather than in the order the rows happened to
    arrive, so a feed re-exported with its rows shuffled produces the same
    file.
    """
    shapes = read_shapes(
        source, {shape_id for _, shape_id in trips.values() if shape_id}
    )
    drawn = defaultdict(list)
    seen = set()

    for trip_id in sorted(trips):
        line_id, shape_id = trips[trip_id]
        path = shapes.get(shape_id)

        if path is None:
            # No shape: the stations in the order they are called at, and
            # through the stations rather than through their platforms, so
            # the line meets every dot drawn on it.
            path = [
                list(places[stop_id][2]) for stop_id in calls.get(trip_id, ())
            ]
        elif shape_id in seen:
            continue
        else:
            seen.add(shape_id)

        if len(path) > 1:
            drawn[line_id].append(path)

    return drawn


def read_stations(trips, calls, places):
    """One entry per station, whatever number of lines call at it.

    A feed that names parent stations is taken at its word and the station is
    drawn where the feed puts it. A feed that does not is grouped by name,
    and the station is then the middle of the platforms that share one —
    which is where a rider actually arrives only because these are platforms
    of one métro station, metres apart over a single set of tracks, rather
    than the two ends of a passageway.
    """
    called = defaultdict(set)
    placed = {}

    for trip_id, (line_id, _) in trips.items():
        for stop_id in calls.get(trip_id, ()):
            key, stop_name, point = places[stop_id]

            called[key].add(line_id)
            placed[key] = (stop_name, point)

    return sorted(
        (
            {
                "name": stop_name,
                "lines": sorted(called[key]),
                "coordinates": round_coordinates(point),
            }
            for key, (stop_name, point) in placed.items()
        ),
        key=lambda station: station["name"],
    )


def build(source, lines, reference_latitude, notice, name=None, line_of=None):
    """The whole of one city's geometry, in the shape build_networks writes.

    `lines` maps each public line id to the feed routes drawn as that line,
    and its order is the order the lines come out in, so the file reads the
    same way from one build to the next however the sources are ordered.

    `name`, where a city gives one, turns the name the feed gives a station
    into the one it is drawn under, and the stops that come out under one
    name are one station. `line_of`, where a route is more than one line,
    says which of them a trip is from the names of the stations it calls at.
    """
    route_lines = {
        route: line_id for line_id, routes in lines.items() for route in routes
    }
    stops = {stop["stop_id"]: stop for stop in read_csv(source, "stops.txt")}
    places = read_places(stops, name)
    trips = read_trips(source, route_lines)
    calls = read_calls(source, trips)

    if line_of is not None:
        called = {
            trip_id: [places[stop_id][1] for stop_id in calls.get(trip_id, ())]
            for trip_id in trips
        }
        trips = {
            trip_id: (line_of(called[trip_id]), shape_id)
            for trip_id, (_, shape_id) in trips.items()
        }
        trips = {trip_id: trip for trip_id, trip in trips.items() if trip[0]}

    paths = read_paths(source, trips, calls, places)

    return {
        "notice": notice,
        "lines": [
            {
                "id": line_id,
                "paths": prepare_paths(paths[line_id], reference_latitude),
            }
            for line_id in lines
            if paths[line_id]
        ],
        "stations": read_stations(trips, calls, places),
    }
