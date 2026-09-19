"""Rennes: the STAR's two métro lines.

The smallest network here, and the one whose feed needs the least explaining:
the two métro routes are the only rail in it, and every platform names the
station it is in.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "star_gtfs"

ID = "rennes"

NOTICE = (
    "Contains data from the STAR and Rennes Métropole, licensed under the "
    "ODbL 1.0, modified."
)

REFERENCE_LATITUDE = 48.11

# The public line each feed route is drawn as. The STAR writes its lines in
# lower case — line a and line b — and so does the feed.
LINES = {
    "star:a": {"7-1001"},
    "star:b": {"7-1002"},
}


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE)
