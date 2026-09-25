"""Edmonton: the ETS's three LRT lines — Capital, Metro and Valley.

Every platform names a parent station, but the parents are where the feed's
spelling slips — "South Camputs Ft. Edmonton Station", "Churchill Station
Underground" — so the stations are named here, the way ETS signs them. The
Valley Line's Churchill stop is on the square above the Capital and Metro
lines' Churchill station, and is drawn as the one interchange it is.

The feed also lists the platforms at the LRT garages and the tail track past
Health Sciences, as stops no one may board or leave at. gtfs_network.py
leaves those out on its own.
"""

from pathlib import Path
import re

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "ets_gtfs"

ID = "edmonton"

NOTICE = (
    "Contains information licensed under the Open Government Licence – "
    "City of Edmonton, modified."
)

REFERENCE_LATITUDE = 53.54

# The public line each feed route is drawn as.
LINES = {
    "ets:capital": {"021R"},
    "ets:metro": {"022R"},
    "ets:valley": {"023R"},
}

SUFFIX = re.compile(r"\s+(?:Station|Stop)(?:\s+Underground)?$")

NAMES = {
    "102 St": "102 Street",
    "Bay Enterprise": "Bay/Enterprise Square",
    "Health Sciences Jubilee": "Health Sciences/Jubilee",
    "Kingsway RAH": "Kingsway/Royal Alex",
    "McKernan Belgravia": "McKernan/Belgravia",
    "NAIT-Blatchford Market": "NAIT/Blatchford Market",
    "South Camputs Ft. Edmonton": "South Campus/Fort Edmonton Park",
}


def name(stop_name):
    stop_name = SUFFIX.sub("", stop_name)

    return NAMES.get(stop_name, stop_name)


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
