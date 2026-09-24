"""Chicago: the CTA's eight 'L' lines.

The CTA publishes one feed for its buses and trains, and the 'L' comes out of
it as eight routes, one per line, each named for its colour. Four of them run
round the Loop and back out again, so a single trip draws the whole of the
Brown, Orange, Pink and Purple lines, elevated track downtown included.

Station names are the CTA's own, which say which line a platform is on
wherever two stations share a street — Addison (Blue), Addison (Brown) — and
that is kept: the map draws both.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "cta_gtfs"

ID = "chicago"

# The credit line the CTA's licence suggests, which it leaves optional; the
# licence asks that nothing imply the CTA endorses what uses its data.
NOTICE = (
    "Data provided by Chicago Transit Authority, modified. Not endorsed by "
    "the CTA."
)

REFERENCE_LATITUDE = 41.88

# The public line each feed route is drawn as.
LINES = {
    "cta:red": {"Red"},
    "cta:blue": {"Blue"},
    "cta:brown": {"Brn"},
    "cta:green": {"G"},
    "cta:orange": {"Org"},
    "cta:pink": {"Pink"},
    "cta:purple": {"P"},
    "cta:yellow": {"Y"},
}


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE)
