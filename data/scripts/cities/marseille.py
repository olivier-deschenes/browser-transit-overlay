"""Marseille: the RTM's two métro lines, out of the Aix-Marseille feed.

The métropole publishes one dataset covering every network in it, of which
the RTM's is one; the two métro routes are taken out of the RTM feed and the
buses, the tramways and the fourteen other networks are left where they are.

Unlike the other feeds here, this one names no parent stations: its métro
stops are platforms standing on their own, so the platforms sharing a name
are the station. They sit metres apart over one set of tracks, except at
Castellane and Saint-Charles, where four platforms of two crossing lines
still span little more than a hundred metres — a station-sized distance, and
the middle of it is inside the station.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "rtm_gtfs"

ID = "marseille"

NOTICE = (
    "Contains data from the Métropole d'Aix-Marseille-Provence, licensed "
    "under the Licence Ouverte 2.0, modified."
)

REFERENCE_LATITUDE = 43.3

# The public line each feed route is drawn as. The RTM calls its lines M1 and
# M2; the feed's route ids are an internal numbering that says nothing about
# which line is which, which is why this table is not a formality.
LINES = {
    "rtm:m1": {"RTM-116"},
    "rtm:m2": {"RTM-125"},
}


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE)
