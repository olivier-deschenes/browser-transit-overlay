"""Paris: the métro and the RER, out of Île-de-France Mobilités' one feed.

The largest network here by a wide margin, and the one where the split inside
a city is by network rather than by operator. Île-de-France Mobilités
publishes the whole region, so there is one set of terms over both; what a
rider is choosing between is a métro line and an RER line, so that is what
the two switches are.

The RER reaches a long way past the métro — Creil, Étampes, Tournan — and is
drawn the whole way, because a search for a flat an hour out of Châtelet is
exactly the search this network answers.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "idfm_gtfs"

ID = "paris"

# The attribution statement the licence asks for, and the fact that what
# ships here is not the feed as published.
NOTICE = (
    "Contains data from Île-de-France Mobilités, licensed under the Licence "
    "Mobilités, modified."
)

# Roughly the latitude of the city, which is all the simplifier needs to turn
# its two-metre tolerance into degrees of longitude. The RER runs a degree of
# it north to south; at these latitudes that moves metres per degree of
# longitude by about a part in fifty, which the tolerance does not notice.
REFERENCE_LATITUDE = 48.85

# The public line each feed route is drawn as. IDFM's route ids are opaque and
# churn between releases, which is the whole reason this table exists; the
# names on the right are the ones painted on the trains.
#
# Lines 3bis and 7bis are their own lines rather than branches, and the feed
# agrees: they are separate routes, calling the short names "3B" and "7B"
# where the platforms say "3 bis" and "7 bis".
LINES = {
    "metro:1": {"IDFM:C01371"},
    "metro:2": {"IDFM:C01372"},
    "metro:3": {"IDFM:C01373"},
    "metro:3bis": {"IDFM:C01386"},
    "metro:4": {"IDFM:C01374"},
    "metro:5": {"IDFM:C01375"},
    "metro:6": {"IDFM:C01376"},
    "metro:7": {"IDFM:C01377"},
    "metro:7bis": {"IDFM:C01387"},
    "metro:8": {"IDFM:C01378"},
    "metro:9": {"IDFM:C01379"},
    "metro:10": {"IDFM:C01380"},
    "metro:11": {"IDFM:C01381"},
    "metro:12": {"IDFM:C01382"},
    "metro:13": {"IDFM:C01383"},
    "metro:14": {"IDFM:C01384"},
    "rer:a": {"IDFM:C01742"},
    "rer:b": {"IDFM:C01743"},
    "rer:c": {"IDFM:C01727"},
    "rer:d": {"IDFM:C01728"},
    "rer:e": {"IDFM:C01729"},
}


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE)
