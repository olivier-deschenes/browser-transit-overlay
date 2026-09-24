"""New York: the subway and the Staten Island Railway, and PATH.

Two feeds and two publishers. The MTA publishes the subway and the Staten
Island Railway in one feed; the Port Authority runs PATH under the Hudson to
Hoboken, Jersey City and Newark, which is where a good share of a New York
rental search ends up, and PATH comes out of a feed of its own.

The subway's lines are its services, the letters and numbers on the bullets:
the A, the 7, the L. That is how the network is ridden and how a flat is
described, even though three or four services share most trunks — the
Lexington Avenue tracks carry the 4, the 5 and the 6 — and each is therefore
drawn over the same track as its neighbours. The variants the MTA prints with
a diamond (6X, 7X, FX) run over their own service's track and are drawn as
it. The Z is the J's skip-stop partner and is drawn as the J; the three
shuttles all print an S and are one line.

PATH's four services are drawn as its map draws them, one colour each. Its
late-night and weekend Journal Square–33rd Street service via Hoboken runs
over track the other four already cover and is drawn as the Journal Square
line; the weekend World Trade Center–33rd Street service is left out, since it
adds neither track nor a station.

The MTA's terms allow an app to use some but not all of its data and ask that
none of it be modified. Every coordinate this build keeps for the subway is
one of the feed's own, at the feed's own six decimals: what the simplifier
does to it is leave points out, and the stations are the feed's parent
stations where the feed puts them.
"""

from pathlib import Path

from gtfs_network import build as build_gtfs

DATA = Path(__file__).resolve().parents[2]
MTA_SOURCE = DATA / "mta_gtfs"
PATH_SOURCE = DATA / "path_gtfs"

ID = "new-york"

# Neither publisher asks for particular words. The MTA's terms allow saying
# that the data was obtained from it and forbid implying that it licenses or
# endorses what uses it; PATH's feed comes with no terms at all.
NOTICE = (
    "Contains a selection of data obtained from the MTA, and data from the "
    "Port Authority of New York and New Jersey, modified. Not endorsed by "
    "either."
)

REFERENCE_LATITUDE = 40.75

# The public line each MTA route is drawn as.
MTA_LINES = {
    "subway:1": {"1"},
    "subway:2": {"2"},
    "subway:3": {"3"},
    "subway:4": {"4"},
    "subway:5": {"5"},
    "subway:6": {"6", "6X"},
    "subway:7": {"7", "7X"},
    "subway:a": {"A"},
    "subway:c": {"C"},
    "subway:e": {"E"},
    "subway:b": {"B"},
    "subway:d": {"D"},
    "subway:f": {"F", "FX"},
    "subway:m": {"M"},
    "subway:g": {"G"},
    "subway:j": {"J", "Z"},
    "subway:l": {"L"},
    "subway:n": {"N"},
    "subway:q": {"Q"},
    "subway:r": {"R"},
    "subway:w": {"W"},
    # 42 St, Franklin Avenue and Rockaway Park: GS, FS and H in the feed.
    "subway:s": {"GS", "FS", "H"},
    "sir:sir": {"SI"},
}

# The public line each PATH route is drawn as. PATH's route ids are Trillium's
# numbering and say nothing about which service is which.
PATH_LINES = {
    "path:nwk-wtc": {"862", "74320"},
    "path:hob-wtc": {"860"},
    "path:jsq-33": {"861", "1024"},
    "path:hob-33": {"859"},
}


def build():
    subway = build_gtfs(MTA_SOURCE, MTA_LINES, REFERENCE_LATITUDE, NOTICE)
    path = build_gtfs(PATH_SOURCE, PATH_LINES, REFERENCE_LATITUDE, NOTICE)

    # A PATH station and the subway station across the street are two
    # stations with two sets of platforms, and stay two dots.
    return {
        "notice": NOTICE,
        "lines": subway["lines"] + path["lines"],
        "stations": sorted(
            subway["stations"] + path["stations"],
            key=lambda station: station["name"],
        ),
    }
