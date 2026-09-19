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

A geometry file holds ids, paths, stations, and the notice the licence asks to travel with the data — nothing else. What colour a line is drawn in, who to credit for it, and the terms it came out under live in `extension/networks.js`. What it is called depends on the language, so each language names it by its id in `extension/i18n.js`. None of it is stated twice.

Ids are three levels deep: `montreal:stm:1` is a city, an operator, and that operator's own public name for the line. The last segment is never a GTFS `route_id` — feed ids change between releases, and one drawn line is routinely several routes, which is exactly what the REM's `S1`, `S2` and `S3` are. A geometry file is named for its city, so the ids inside it leave the city off.

## Add a city

1. Write `data/scripts/cities/<city>.py` with an `ID`, a `NOTICE`, a `REFERENCE_LATITUDE`, the route-to-line mapping for its sources, and a `build()` returning `{"notice", "lines", "stations"}`. `transit_geometry.py` has the deduplication, simplification and rounding, and `gtfs_network.py` has everything a GTFS feed needs done to it, so a city on GTFS is its mapping and one call to `gtfs_network.build()`. A city module supplies only its sources and its mapping.
2. Add it to `CITIES` in `data/scripts/cities/__init__.py`.
3. Declare the city in `extension/networks.js`: the country it is in, the origin its coordinates are measured from, the bounds a viewport must fall inside for this network to be the one drawn, its data file, and its operators and lines. An operator carries the licence its own feed is published under and the kind of service it runs (`mode`), which a line running something else states for itself; two operators on one map need not agree on either.
4. Name the city, each operator, and each line in every language block of `extension/i18n.js`: `city.<city>.name`, `system.<city>:<operator>.name`, and `line.<city>:<operator>:<line>.name` and `.detail`. A country or a kind of service the catalogue has not carried before needs a name too — `country.<country>.name`, `mode.<mode>.name` — since the settings page offers both as filters.
5. Run the generator. `npm test` checks that the registry and the generated geometry name the same lines, that a city's bounds contain everything it draws, and that every language names everything the registry declares.

Settings need no migration: a new city, operator or line is absent from stored settings and therefore ships switched on.

## Sources

- `data/stm_sig/`: STM stop and route shapefiles plus the route projection. Keep the `.shp`, `.shx`, and `.dbf` companions together.
- `rem_data/`: the `routes.txt`, `trips.txt`, `shapes.txt`, and `stops.txt` subset of the REM GTFS feed, with its supplied licence.
- `data/ttc_gtfs/`: a slice of the TTC's [merged GTFS feed](https://open.toronto.ca/dataset/merged-gtfs-ttc-routes-and-schedules/), downloaded 15 September 2026 (feed version `S1000538`), under the licence linked in `terms.txt`.

The TTC publishes one feed for the whole system, and 84 MB of it is buses. What is kept is the five rapid-transit routes, and of those only one trip in each direction of each line: the one calling at the most stations, and among ties the one drawn with the most points. Every other trip on those lines was checked to run over track and stations these ten already cover, so the cut costs the drawing nothing. Rebuild the slice the same way from a newer feed rather than by hand.

### France

Six métro networks, all reached through [the national access point](https://transport.data.gouv.fr/) and all downloaded 17 September 2026. Each directory's `terms.txt` links the dataset it came from and the licence it came out under.

- `data/idfm_gtfs/`: the Paris métro and RER, out of Île-de-France Mobilités' feed for the whole region — 1 GB unzipped, of which the 21 lines drawn here are a very small part. Licence Mobilités.
- `data/tcl_sytral/`: Lyon's métro, as SYTRAL's route and stop map layers rather than as GTFS. Licence Ouverte 2.0.
- `data/rtm_gtfs/`: the RTM's two Marseille lines, out of the Métropole d'Aix-Marseille-Provence's RTM feed. Licence Ouverte 2.0.
- `data/ilevia_gtfs/`: ilévia's two Lille lines. Licence Ouverte 2.0.
- `data/tisseo_gtfs/`: Tisséo's two Toulouse lines. ODbL 1.0.
- `data/star_gtfs/`: the STAR's two Rennes lines. ODbL 1.0.

The five GTFS slices are cut the same way, and it is not quite the TTC's rule: a line that branches — RER C runs to six different places — is not covered by one trip per direction. What is kept for each line is the shapes that draw track no kept shape already covers, longest first, plus whatever further trips it takes to call at every station the line serves. On an unbranched line that comes to the same two trips the TTC slice keeps. Rebuild a slice this way from a newer feed rather than by hand.

Two of the six publish no geometry for their métro, and each needed its own answer:

- **Lyon.** SYTRAL's GTFS draws its buses and its tramways and leaves every métro trip without a `shape_id`. SYTRAL separately publishes the métro as a map layer, under a clearer licence than the feed, so Lyon is built from that and the feed is not used at all.
- **Lille.** ilévia's feed has no `shapes.txt`, and the métropole publishes no alignment anywhere else. Lille is therefore the one network here drawn through its stations instead of over its track: right at every station, a chord between them. Replacing it with real geometry means finding a source for the alignment — nothing in `lille.py` needs to change beyond where it reads from.

For an update, obtain new data from the transit publishers, preserve their terms, and record the source URL and download date with the change. Original download dates for the Montréal inputs were not recorded. Review station and line changes before committing both source files and generated JSON. CI regenerates the network and checks for drift.
