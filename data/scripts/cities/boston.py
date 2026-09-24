"""Boston: the MBTA's subway, which is to say the T's four colours.

The Red, Orange and Blue lines are heavy rail; the Green Line is four light
rail branches — B, C, D and E — that share a trunk under Boylston Street and
out to Medford and Union Square, and it is drawn as one line for the reason
the REM is: taking one branch away on its own would pull the trunk out from
under the other three. The Mattapan trolley runs on from Ashmont and is a
line of its own.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "mbta_gtfs"

ID = "boston"

# MassDOT's licence asks that it be clearly acknowledged as the provider of
# the data, and that nothing represent the data or its user as MassDOT's.
NOTICE = "Contains data provided by MassDOT (MBTA), modified."

REFERENCE_LATITUDE = 42.36

# The public line each feed route is drawn as.
LINES = {
    "mbta:red": {"Red"},
    "mbta:mattapan": {"Mattapan"},
    "mbta:orange": {"Orange"},
    "mbta:blue": {"Blue"},
    "mbta:green": {"Green-B", "Green-C", "Green-D", "Green-E"},
}


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE)
