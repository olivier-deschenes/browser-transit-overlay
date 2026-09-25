"""Vancouver: TransLink's SkyTrain — the Expo, Millennium and Canada lines.

Out of TransLink's feed for the whole region, which also runs the West Coast
Express and the SeaBus. Those are left out: one is a commuter train that runs
five times a day in one direction, the other a ferry. Every platform names
its station as a parent, so the feed needs nothing from here beyond the
mapping and the names, which TransLink writes with "Station" on the end.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "translink_gtfs"

ID = "vancouver"

# The legend TransLink's terms ask to be displayed with the data, word for
# word, and the fact that what ships here is not the feed as published.
NOTICE = (
    "Route and arrival data used in this product or service is provided by "
    "permission of TransLink. TransLink assumes no responsibility for the "
    "accuracy or currency of the Data used in this product or service. "
    "Modified."
)

REFERENCE_LATITUDE = 49.25

# The public line each feed route is drawn as.
LINES = {
    "translink:expo": {"30053"},
    "translink:millennium": {"30052"},
    "translink:canada": {"13686"},
}


def name(stop_name):
    return stop_name.removesuffix(" Station")


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
