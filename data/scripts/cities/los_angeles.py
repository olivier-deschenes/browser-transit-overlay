"""Los Angeles: LA Metro's six rail lines.

Two subway lines, the B and the D, and four light rail lines — the A, C, E
and K — published together in Metro's rail feed. The A Line runs from Long
Beach through downtown to Pomona and is drawn the whole way.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "lametro_gtfs"

ID = "los-angeles"

# Metro's terms ask that it be acknowledged as the provider of the data, and
# that nothing represent its user as Metro or as a partner of Metro.
NOTICE = "Contains data provided by LA Metro, modified. Not endorsed by Metro."

REFERENCE_LATITUDE = 34.05

# The public line each feed route is drawn as. Metro's lines are letters; its
# route ids are an internal numbering from before the letters.
LINES = {
    "metro:a": {"801"},
    "metro:b": {"802"},
    "metro:c": {"803"},
    "metro:d": {"805"},
    "metro:e": {"804"},
    "metro:k": {"807"},
}


def name(stop_name):
    """Metro's name for a station, without the word the feed puts after it.

    Union Station is called that, and keeps it.
    """
    if stop_name == "Union Station":
        return stop_name

    return stop_name.removesuffix(" Station")


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
