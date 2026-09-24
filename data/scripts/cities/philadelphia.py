"""Philadelphia: SEPTA Metro's rapid transit lines.

The L (Market–Frankford), the B (Broad Street, with its express and its
spur to 8th–Market) and the M (Norristown High Speed Line), out of the feed
SEPTA publishes for everything that is not regional rail. SEPTA Metro also
brands its trolleys, and they are left out: once out of the tunnel they stop
every block or two, and three hundred dots of street stops are not what a
map of rapid transit is for.

SEPTA gives some platforms a parent station and leaves others, sometimes the
other platform of the same station, without one, so its stations are grouped
by name, the way SEPTA spells them on the platform rather than in the feed.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "septa_gtfs"

ID = "philadelphia"

# SEPTA's licence asks for no particular credit, and forbids using its marks
# commercially or altered.
NOTICE = "Contains data from SEPTA, modified. Not endorsed by SEPTA."

REFERENCE_LATITUDE = 39.95

# The public line each feed route is drawn as.
LINES = {
    "septa:l": {"L1"},
    "septa:b": {"B1", "B2", "B3"},
    "septa:m": {"M1"},
}

# What the feed appends to a station's name to tell its platforms or its
# lines apart, none of which is part of the name.
SUFFIXES = (" - B1", " - B2 & B3", " - B2", " - BSL", " Station")

# The two stations the feed spells two ways.
NAMES = {
    "69th Street Transit Center": "69th St Transit Center",
    "Race Vine": "Race-Vine",
}


def name(stop_name):
    for suffix in SUFFIXES:
        stop_name = stop_name.removesuffix(suffix)

    return NAMES.get(stop_name, stop_name)


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
