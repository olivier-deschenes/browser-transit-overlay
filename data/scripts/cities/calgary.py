"""Calgary: the CTrain's Red and Blue lines.

Calgary Transit's feed gives no platform a parent station and names each one
for the direction it serves — "NB Chinook CTrain Station", "SB Chinook CTrain
Station" — so the stations are grouped by name, once the direction and the
feed's several spellings of "station" are taken off. Downtown, the two
directions run a block apart on 7 Avenue and stop at different cross streets,
and those are different stations: 8 Street SW eastbound, 7 Street SW
westbound.
"""

from pathlib import Path
import re

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "calgarytransit_gtfs"

ID = "calgary"

NOTICE = (
    "Contains information licensed under the Open Government Licence – "
    "City of Calgary, modified."
)

REFERENCE_LATITUDE = 51.05

# The public line each feed route is drawn as.
LINES = {
    "ctrain:red": {"201-20786"},
    "ctrain:blue": {"202-20786"},
}

DIRECTION = re.compile(r"^(?:NB|SB|EB|WB)\s+")
SUFFIX = re.compile(
    r"\s+\(Free Fare Zone\)$|\s+(?:CTrain\s+)?(?:Station|Staion|Stn)$"
)

# The one station the feed spells two ways.
NAMES = {"Downtown-West Kerby": "Downtown West-Kerby"}


def name(stop_name):
    stop_name = SUFFIX.sub("", DIRECTION.sub("", stop_name))
    stop_name = SUFFIX.sub("", stop_name)

    return NAMES.get(stop_name, stop_name)


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
