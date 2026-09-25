"""One module per city, each one naming its own sources and its own lines.

A city module is the only place a feed's route ids are allowed to appear.
Everything downstream — the extension's registry, its settings, its geometry
files — speaks in the public line ids these modules map those routes onto.
"""

from . import (
    atlanta,
    baltimore,
    boston,
    chicago,
    lille,
    los_angeles,
    lyon,
    marseille,
    miami,
    montreal,
    new_york,
    paris,
    philadelphia,
    rennes,
    san_francisco,
    toronto,
    toulouse,
    washington,
)

CITIES = (
    montreal,
    toronto,
    paris,
    lyon,
    marseille,
    lille,
    toulouse,
    rennes,
    new_york,
    washington,
    chicago,
    boston,
    san_francisco,
    philadelphia,
    los_angeles,
    atlanta,
    miami,
    baltimore,
)
