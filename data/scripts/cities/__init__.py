"""One module per city, each one naming its own sources and its own lines.

A city module is the only place a feed's route ids are allowed to appear.
Everything downstream — the extension's registry, its settings, its geometry
files — speaks in the public line ids these modules map those routes onto.
"""

from . import montreal, toronto

CITIES = (montreal, toronto)
