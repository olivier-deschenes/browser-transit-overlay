"""Ottawa: OC Transpo's O-Train — Line 1, Line 2 and the Line 4 airport link.

Every platform names a parent station, and the parents are written in
capitals with the French after a tilde: "PARLIAMENT ~ PARLEMENT". They are
drawn here in the case and the English-then-French order the stations are
signed in.
"""

from pathlib import Path
import re

from gtfs_network import build as build_gtfs

SOURCE = Path(__file__).resolve().parents[2] / "octranspo_gtfs"

ID = "ottawa"

NOTICE = (
    "Contains information licensed under the Open Government Licence – "
    "City of Ottawa, modified."
)

REFERENCE_LATITUDE = 45.4

# The public line each feed route is drawn as.
LINES = {
    "octranspo:1": {"1-373"},
    "octranspo:2": {"2-354"},
    "octranspo:4": {"4-354"},
}

# The words a capitaliser gets wrong.
WORDS = {"UOTTAWA": "uOttawa"}

WORD = re.compile(r"[^\s\-/~]+")


def word(match):
    text = match.group(0)

    if text in WORDS:
        return WORDS[text]

    # Tunney's, not Tunney'S.
    return text[0] + text[1:].lower()


def name(stop_name):
    return WORD.sub(word, stop_name).replace(" ~ ", " / ")


def build():
    return build_gtfs(SOURCE, LINES, REFERENCE_LATITUDE, NOTICE, name=name)
