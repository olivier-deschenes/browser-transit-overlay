"""San Francisco Bay Area: BART's five lines.

BART publishes each line as two routes, one per direction, and names them by
colour. The Oakland Airport connector, a cable-hauled shuttle from Coliseum
to the airport, is left out: it serves no neighbourhood anybody rents in.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "bart_gtfs"

ID = "san-francisco"

# BART's licence asks for no particular credit, and forbids using its marks
# in association with the data; naming it as the source is all this does.
NOTICE = (
    "Contains data from Bay Area Rapid Transit, modified. Not endorsed by "
    "BART."
)

REFERENCE_LATITUDE = 37.8

# The public line each feed route is drawn as: one route each way.
LINES = {
    "bart:red": {"7", "8"},
    "bart:orange": {"3", "4"},
    "bart:yellow": {"1", "2"},
    "bart:green": {"5", "6"},
    "bart:blue": {"11", "12"},
}


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE)
