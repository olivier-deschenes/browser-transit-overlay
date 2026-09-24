"""Miami: Metrorail's Green and Orange lines.

Miami-Dade publishes Metrorail as a single route, and the two lines have to
be told apart by where a train goes: the Green Line runs from Dadeland South
to Palmetto, the Orange Line from Dadeland South to the airport, and the two
share everything south of Earlington Heights. The feed also names every
platform for the direction it serves — PALMETTO STATION RAIL NORTHBOUND — so
the stations are grouped by the names Miami-Dade signs them with instead.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "miamidade_gtfs"

ID = "miami"

# Miami-Dade publishes its feed without a licence or any terms of use.
NOTICE = "Contains data from Miami-Dade County, modified."

REFERENCE_LATITUDE = 25.78

# Both lines are the one route; which is which is line_of's to say.
LINES = {
    "metrorail:green": {"31009"},
    "metrorail:orange": {"31009"},
}

# The station each platform belongs to, by the feed's name for it once the
# direction is taken off.
NAMES = {
    "ALLAPATTAH STATION RAIL": "Allapattah",
    "BRICKELL STATION RAIL": "Brickell",
    "BROWNSVILLE STATION RAIL": "Brownsville",
    "COCONUT GROVE STAT. RAIL": "Coconut Grove",
    "CULMER STATION RAIL": "Culmer",
    "DADELAND NORTH STAT.RAIL": "Dadeland North",
    "DADELAND SOUTH STAT.RAIL": "Dadeland South",
    "DOUGLAS ROAD STAT. RAIL": "Douglas Road",
    "EARLINGTON HTS.STAT.RAIL": "Earlington Heights",
    "GOVERNMENT CTR.STAT.RAIL": "Government Center",
    "HIALEAH STATION RAIL": "Hialeah",
    "HISTORIC OVERTOWN/LYRIC THEATRE STAT.RAIL": "Historic Overtown/Lyric Theatre",
    "M.L. KING STATION RAIL": "Dr. Martin Luther King Jr. Plaza",
    "MIAMI INTERNATIONAL AIRPORT STATION": "Miami International Airport",
    "NORTHSIDE STATION RAIL": "Northside",
    "OKEECHOBEE STATION RAIL": "Okeechobee",
    "PALMETTO STATION RAIL": "Palmetto",
    "SANTA CLARA STATION RAIL": "Santa Clara",
    "SOUTH MIAMI STATION RAIL": "South Miami",
    "TRI-RAIL STATION RAIL": "Tri-Rail",
    "UHEALTH JACKSON STATION RAIL": "UHealth Jackson",
    "UNIVERSITY STATION RAIL": "University",
    "VIZCAYA STATION RAIL": "Vizcaya",
}


def name(stop_name):
    for direction in (" NORTHBOUND", " SOUTHBOUND"):
        stop_name = stop_name.removesuffix(direction)

    return NAMES[stop_name]


def line_of(stations):
    """The line a trip is on, from the terminal only one line reaches.

    A trip that reaches neither stays on the track both lines share, and is
    already drawn by the trips that do.
    """
    if "Palmetto" in stations:
        return "metrorail:green"

    if "Miami International Airport" in stations:
        return "metrorail:orange"

    return None


def build():
    return build_gtfs(
        SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name, line_of=line_of
    )
