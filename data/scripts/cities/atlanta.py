"""Atlanta: MARTA's four rail lines.

The Red and Gold lines share a trunk north–south through downtown, the Blue
and Green lines share one east–west, and the four meet at Five Points. The
feed names every station in capitals and with the word "station" after it,
and each is given the name MARTA signs it with instead.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "marta_gtfs"

ID = "atlanta"

# MARTA publishes its feed without a licence or any terms but one: its marks
# are not to be used.
NOTICE = "Contains data from MARTA, modified. Not endorsed by MARTA."

REFERENCE_LATITUDE = 33.75

# The public line each feed route is drawn as.
LINES = {
    "marta:red": {"29229"},
    "marta:gold": {"29227"},
    "marta:blue": {"29226"},
    "marta:green": {"29228"},
}

# Where title case alone does not give MARTA's own spelling.
NAMES = {
    "Brookhaven-Oglethorpe": "Brookhaven/Oglethorpe",
    "Edgewood-Candler Park": "Edgewood/Candler Park",
    "Hamilton E Holmes": "H. E. Holmes",
    "Inman Park-Reynoldstown": "Inman Park/Reynoldstown",
    "Lakewood-Ft Mcpherson": "Lakewood/Ft. McPherson",
    "North Ave": "North Avenue",
    "Sec District": "SEC District",
}


def name(stop_name):
    title = stop_name.removesuffix(" STATION").title()

    return NAMES.get(title, title)


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
