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

1. Put the source data under `data/`, in a directory named for its operator and its format (`data/star_gtfs/`, `data/tcl_sytral/`), with a `terms.txt` listing the URL of each dataset used, one per line, and then its licence's, or the page its terms are on where there is no licence. From a GTFS feed keep `routes.txt`, `trips.txt`, `stop_times.txt`, `stops.txt` and, where the feed has one, `shapes.txt`, cut down to the lines being drawn the way [the French slices are cut](#france), or [the American ones](#united-states) where a feed re-samples its shapes: their routes, the trips kept for them, those trips' stop times and shapes, and the stops they call at along with the parent stations those stops name. No script does the cutting, so say in the pull request how the slice was made, and add the source, its URL and its download date under [Sources](#sources).
2. Write `data/scripts/cities/<city>.py` with an `ID`, a `NOTICE`, a `REFERENCE_LATITUDE`, the route-to-line mapping for its sources, and a `build()` returning `{"notice", "lines", "stations"}`. The `NOTICE` is the attribution the data's licence asks for, word for word where the licence gives one. `REFERENCE_LATITUDE` is roughly the latitude of the city centre: simplification works in metres, and a degree of longitude is worth fewer of them the further a city is from the equator. `transit_geometry.py` has the deduplication, simplification and rounding, and `gtfs_network.py` has everything a GTFS feed needs done to it, so a city on GTFS is its mapping and one call to `gtfs_network.build()` — [`rennes.py`](scripts/cities/rennes.py) is the whole of one. A city drawn from anything else reads its own sources and hands the paths to `transit_geometry.py`, as [`lyon.py`](scripts/cities/lyon.py) does with SYTRAL's map layers. A city module supplies only its sources and its mapping.
3. Add it to `CITIES` in `data/scripts/cities/__init__.py`.
4. Declare the city in `extension/networks.js`:
   - `country`: the country it is in.
   - `origin`: what its coordinates are measured from, near the city centre and inside `bounds`.
   - `bounds`: the box a viewport must fall inside for this network to be the one drawn, as `[[west, south], [east, north]]`. It covers the metro area a listing search can wander over, holds every line and station the city draws, and overlaps no other city's box.
   - `data`: its geometry file, `networks/<city>.json`.
   - `marketplaceSlug`: the city's segment in a Marketplace rental search path, `montreal` in `/marketplace/montreal/propertyrentals`, which the arrow beside the city in the map's city panel rewrites to jump the search there. Leave it out for a city Marketplace has no such path for, and the arrow never appears.
   - `systems`: its operators and their lines. An operator carries the licence its own feed is published under and the kind of service it runs (`mode`), which a line running something else states for itself; two operators on one map need not agree on either. A licence the catalogue has not carried before gets a constant of its own beside the others at the top of the file.
5. Name the city, each operator, and each line in every language block of `extension/i18n.js`: `city.<city>.name`, `system.<city>:<operator>.name`, and `line.<city>:<operator>:<line>.name` and `.detail`. A country or a kind of service the catalogue has not carried before needs a name too — `country.<country>.name`, `mode.<mode>.name` — since the settings page offers both as filters.
6. Run the generator, then `npm test`. The tests check that the registry and the generated geometry name the same lines, that a city's bounds hold everything it draws and its origin, and overlap no other city's, and that every language names everything the registry declares. They cannot check the live sites, so open a map of the new city as [the manual checks](../CONTRIBUTING.md#manual-extension-checks) describe.
7. Update everything that counts or lists the cities. The tests cannot tell when these are out of date:
   - [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md): a section for the source, the city's attribution line under "Adaptations and redistribution", its download date, the operator among the names at the end, and, for ODbL data, the paragraph on share-alike.
   - `extDescription` in every `extension/_locales/*/messages.json`, which counts the cities and must stay within 132 characters.
   - The [README](../README.md): the networks in its opening paragraph, the number of city names under "Privacy and permissions", the sources in "How transit networks fit together", and the licence paragraph at the end.

   The website needs no change: it builds its list of cities and lines from the same registry and names.

Settings need no migration. A new operator or line is absent from stored settings and therefore ships switched on. A new city ships switched off, because exactly one city is on at a time and the one that is on is the one somebody chose; it is on once it is picked.

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

### United States

Ten networks, all downloaded 24 September 2026 from the publishers' own URLs, listed in each directory's `terms.txt` with the terms that come with them.

- `data/mta_gtfs/`: the New York City Subway and the Staten Island Railway, out of the MTA's regular subway feed (feed version `20260826-X-long-term-supplement-trip-ids`). The MTA's terms allow using some but not all of the data and ask that none of it be modified: every subway coordinate the build keeps is one of the feed's own, at its own six decimals.
- `data/path_gtfs/`: PATH, from the feed the Port Authority publishes through Trillium. Its last release covers service to 1 June 2026, and no later one exists; the network it draws has not changed since. No licence.
- `data/wmata_dcgis/`: the Washington Metro, as the District of Columbia's *Metro Lines Regional* and *Metro Stations Regional* layers on Open Data DC rather than WMATA's feed, which needs a developer key. CC BY 4.0.
- `data/cta_gtfs/`: the CTA's eight 'L' lines. CTA Developer License Agreement.
- `data/mbta_gtfs/`: the MBTA's Red, Orange, Blue and Green lines and the Mattapan trolley (feed version `Fall 2026, version D`). MassDOT Developers License Agreement.
- `data/bart_gtfs/`: BART's five lines, without the Oakland Airport connector. BART Developer License Agreement.
- `data/septa_gtfs/`: SEPTA Metro's L, B and M lines, out of SEPTA's bus and Metro feed (`v202609061`). The trolleys SEPTA Metro also brands are left out: out of the tunnel they stop every block or two. SEPTA License Agreement.
- `data/lametro_gtfs/`: LA Metro's six rail lines, out of its rail feed. Metro's developer Terms & Conditions, which also ask that the data not be modified; the geometry here is simplified and rounded like every other city's.
- `data/marta_gtfs/`: MARTA's four rail lines. No licence; MARTA's only condition is that its marks are not used.
- `data/miamidade_gtfs/`: Metrorail's Green and Orange lines, which the feed runs as a single route. No licence.
- `data/mdotmta_gtfs/`: Baltimore's Metro SubwayLink, from MDOT MTA's Metro feed. No licence.

The nine GTFS slices keep the French rule with three changes, because several of these feeds publish a shape per variant of a trip that re-samples the same track — PATH's four services come with twenty — and matching segments exactly keeps every one of them:

- A shape counts as covered where it runs within 15 metres of a shape already kept, and it is kept only if it adds more than 100 metres of track that is not. An unbranched line therefore comes to one trip rather than one each way, and the stations are still all reached by the step that adds trips for them.
- Where a feed's calendar reaches the download date, only trips whose service still runs on it are considered, so a summer extension that ended on 7 September — the Rockaway Park shuttle's to Rockaway Boulevard — is not drawn. BART's and PATH's latest releases both end before it, and are taken whole.
- A shape run by fewer than four trips is not considered, and PATH's by fewer than ten: those are put-ins and one-off diversions, such as the one R train a weekday that runs down to Bay Parkway.

For an update, obtain new data from the transit publishers, preserve their terms, and record the source URL and download date with the change. Original download dates for the Montréal inputs were not recorded. Review station and line changes before committing both source files and generated JSON. CI regenerates the network and checks for drift.
