"""Lille: ilévia's two métro lines, drawn through their stations.

The one city here whose network is not drawn over its own track. The MEL
publishes ilévia's timetable and its stops and no route geometry at all —
there is no shapes.txt in the feed and nothing carrying the alignment
anywhere else in the métropole's open data — so each line is drawn as the
run of straight segments through the stations it calls at, in order.

On a VAL that follows the streets above it, that is a chord wherever the
track is a curve. What it gets right is every station, which is drawn where
ilévia puts it and which the line therefore passes exactly through; what it
gets wrong is the run between two of them, and by how much is not something
this repository can measure, because measuring it needs the alignment that is
missing in the first place. The fix is a geometry source rather than anything
in here — see data/README.md.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "ilevia_gtfs"

ID = "lille"

NOTICE = (
    "Contains data from the Métropole Européenne de Lille, licensed under "
    "the Licence Ouverte 2.0, modified."
)

REFERENCE_LATITUDE = 50.63

# The public line each feed route is drawn as. ilévia's route ids for the two
# métro lines are ME1 and ME2, and the lines themselves are simply 1 and 2.
LINES = {
    "ilevia:1": {"ME1"},
    "ilevia:2": {"ME2"},
}


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE)
