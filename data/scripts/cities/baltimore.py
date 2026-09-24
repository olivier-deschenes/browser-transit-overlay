"""Baltimore: the Metro SubwayLink, MDOT MTA's one subway line.

From Owings Mills in the northwest, through downtown, to Johns Hopkins
Hospital. The feed names its stations in capitals and with the word "metro"
after each, and each is given the name the platform signs carry instead.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "mdotmta_gtfs"

ID = "baltimore"

# MDOT MTA publishes its feed without a licence, and with a disclaimer that it
# endorses no application using it.
NOTICE = "Contains data from the Maryland Transit Administration, modified."

REFERENCE_LATITUDE = 39.3

# The public line each feed route is drawn as.
LINES = {
    "mta:metro": {"11682"},
}


def name(stop_name):
    return stop_name.removesuffix(" METRO").title()


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
