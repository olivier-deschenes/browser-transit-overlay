"""Toulouse: Tisséo's two métro lines.

One feed for the city, and the métro comes out of it the way the TTC's does:
the routes that are the métro, and the parent stations the feed names for
their platforms.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "tisseo_gtfs"

ID = "toulouse"

NOTICE = (
    "Contains data from Tisséo and Toulouse Métropole, licensed under the "
    "ODbL 1.0, modified."
)

REFERENCE_LATITUDE = 43.6

# The public line each feed route is drawn as.
LINES = {
    "tisseo:a": {"line:61"},
    "tisseo:b": {"line:69"},
}


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE)
