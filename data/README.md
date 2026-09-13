# Transit data

The extension ships `extension/metro-data.json`; end users do not need Python or a data download. The repository includes the source files needed to reproduce this snapshot.

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
python data/scripts/build_metro_data.py
git diff -- extension/metro-data.json
```

Rebuilding without changing the checked-in inputs should produce no diff. The generator writes UTF-8 with LF line endings on all platforms. The geometry is filtered, reprojected, deduplicated, simplified, and rounded; see [the notices](../THIRD_PARTY_NOTICES.md).

## Sources

- `data/stm_sig/`: STM stop and route shapefiles plus the route projection. Keep the `.shp`, `.shx`, and `.dbf` companions together.
- `rem_data/`: the `routes.txt`, `trips.txt`, `shapes.txt`, and `stops.txt` subset of the REM GTFS feed, with its supplied licence.

For an update, obtain new data from the transit publishers, preserve their terms, and record the source URL and download date with the change. Original download dates for the current inputs were not recorded. Review station and line changes before committing both source files and generated JSON. CI regenerates the network and checks for drift.
