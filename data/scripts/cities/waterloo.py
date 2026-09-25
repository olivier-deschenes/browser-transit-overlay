"""Waterloo Region: Grand River Transit's ION light rail.

GRT publishes ION in a feed of its own, apart from the buses. No platform
has a parent station and each is named for the direction it serves, so the
stations are grouped by name. Through downtown Kitchener the two directions
run on different streets, and some stations are served one way only.
"""

from pathlib import Path
import re

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "grt_gtfs"

ID = "waterloo"

# The credit the Region's licence asks for, where one is given, word for word.
NOTICE = (
    "Contains information provided by the Regional Municipality of Waterloo "
    "under licence, modified."
)

REFERENCE_LATITUDE = 43.45

# The public line each feed route is drawn as.
LINES = {
    "grt:ion": {"301"},
}

SUFFIX = re.compile(r"\s+Station\s+-\s+(?:North|South)bound$")


def name(stop_name):
    return SUFFIX.sub("", stop_name).replace(" Of ", " of ")


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
