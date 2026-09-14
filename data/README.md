# Transit data

The extension ships one geometry file per city under `extension/networks/`; end users do not need Python or a data download. The repository includes the source files needed to reproduce this snapshot.

## Regenerate

Use Python 3.13 or newer. From the repository root:

```sh
python -m venv .venv
```

Activate the environment:

```sh
# macOS / Linux
source .venv/bin/activate
```

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

Then run:

```sh
python -m pip install -r data/requirements.txt
python data/scripts/build_networks.py
git diff -- extension/networks
```

Rebuilding without changing the checked-in inputs should produce no diff. The generator writes UTF-8 with LF line endings on all platforms. The geometry is filtered, reprojected, deduplicated, simplified, and rounded; see [the notices](../THIRD_PARTY_NOTICES.md).

## What is where

A geometry file holds ids, paths, stations, and the notice the licence asks to travel with the data — nothing else. What a line is called, what colour it is drawn in, and who to credit for it live in `extension/networks.js`, so that none of it is stated twice.

Ids are three levels deep: `montreal:stm:1` is a city, an operator, and that operator's own public name for the line. The last segment is never a GTFS `route_id` — feed ids change between releases, and one drawn line is routinely several routes, which is exactly what the REM's `S1`, `S2` and `S3` are. A geometry file is named for its city, so the ids inside it leave the city off.

## Add a city

1. Write `data/scripts/cities/<city>.py` with an `ID`, a `NOTICE`, a `REFERENCE_LATITUDE`, the route-to-line mapping for its sources, and a `build()` returning `{"notice", "lines", "stations"}`. `transit_geometry.py` has the deduplication, simplification and rounding; a city module supplies only its sources and its mapping.
2. Add it to `CITIES` in `data/scripts/cities/__init__.py`.
3. Declare the city in `extension/networks.js`: its name, the origin its coordinates are measured from, the bounds a viewport must fall inside for this network to be the one drawn, its data file, and its operators and lines.
4. Run the generator. `npm test` checks that the registry and the generated geometry name the same lines, and that a city's bounds contain everything it draws.

Settings need no migration: a new city, operator or line is absent from stored settings and therefore ships switched on.

## Sources

- `data/stm_sig/`: STM stop and route shapefiles plus the route projection. Keep the `.shp`, `.shx`, and `.dbf` companions together.
- `rem_data/`: the `routes.txt`, `trips.txt`, `shapes.txt`, and `stops.txt` subset of the REM GTFS feed, with its supplied licence.

For an update, obtain new data from the transit publishers, preserve their terms, and record the source URL and download date with the change. Original download dates for the current inputs were not recorded. Review station and line changes before committing both source files and generated JSON. CI regenerates the network and checks for drift.
