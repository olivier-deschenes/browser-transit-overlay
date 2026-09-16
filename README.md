# Transport en commun pour Marketplace et Centris

A Chrome extension that overlays rapid transit lines and stations on housing maps in Facebook Marketplace and Centris: Montréal's métro and the REM, and Toronto's TTC subway and light rail. The interface is in French.

![Montréal transit lines overlaid on a Marketplace map](docs/images/marketplace-map.png)

## Features

- Transit overlays on supported search maps, listing maps, and Marketplace map previews.
- Individual switches for sites, transit operators and their lines, stations, labels, and map controls.
- Custom landmarks from coordinates or full Google Maps links, with editable names and colours.
- A toolbar switch to enable or disable the overlay without losing your settings.
- When a Marketplace map wanders off the network, one button per supported city to jump to its housing search.

This is an independent project, unaffiliated with Meta/Facebook, Centris, Local Logic, the STM, the REM, the TTC, or the City of Toronto. The bundled network is a snapshot, not a live service or journey planner. Changes to those sites can affect map detection.

## Install from source

1. Clone this repository or download and extract its source archive.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Choose **Load unpacked** and select the **`extension/` folder**, which contains `manifest.json`.
4. Open a housing map on [Facebook Marketplace](https://www.facebook.com/marketplace/) or [Centris](https://www.centris.ca/). Reload an existing tab after installing or updating.

No build, API key, or developer account is needed to load the extension. Click its toolbar icon to toggle the overlay; open its **Options** or the map's gear button to change settings.

## Privacy and permissions

The extension uses `chrome.storage.local` for settings and landmarks. It loads its transit data from the installed extension and has no analytics or developer backend. Google Maps links are parsed locally; shortened links must first be opened by the user to obtain a full link containing coordinates.

The only declared API permission is `storage`. Content scripts run on Marketplace, Centris, and the Local Logic frame used by Centris listings. The Local Logic adapter checks that Centris embedded the frame. Its page-world bridge reads the map's camera so the overlay follows it.

Landmarks are drawn into the host page, so scripts on that page can read their displayed names and locations. Resetting settings preserves landmarks; delete them individually or uninstall the extension to remove them. See the [privacy policy](https://metro.odeschenes.dev/confidentialite) and [security policy](SECURITY.md).

## Development

Use **Node.js 24** for checks and the website. Python **3.13 or newer** is needed only for packaging or rebuilding transit data.

```sh
# Extension regression and package-integrity checks; no npm install needed here
npm test

# Build a distributable ZIP using only approved extension files and notices
python scripts/package_extension.py

# Website
cd web
npm ci
npm run dev
```

The ZIP is written to `dist/metro-marketplace-<version>.zip`, with `manifest.json` at its root. Generated archives are not committed. Unpack the ZIP before loading it through Chrome's **Load unpacked** option.

For website build and deployment details, see [web/README.md](web/README.md). To regenerate the bundled transit network, see [data/README.md](data/README.md). Both local development and CI work without Cloudflare credentials.

## How transit networks fit together

Networks are organised by city. Every line has a three-part id, such as `montreal:stm:1` (city, operator, line), and that id is shared from the data sources to the saved switches.

```text
data/stm_sig/, rem_data/,           source shapefiles and GTFS
data/ttc_gtfs/
        │
data/scripts/cities/<city>.py       maps feed routes to public line ids
        │  data/scripts/build_networks.py  (uses transit_geometry.py)
        ▼
extension/networks/<city>.json      geometry only: ids, paths, stations, notice
        ▲
        │  fetched by content.js for the city the map is showing
extension/networks.js               registry: names, colours, bounds, attribution
        │
        ├─ settings.js / options.js  a switch for each city, operator, and line
        └─ content.js + sites.js     draws lines on Marketplace, Centris, and Local Logic maps
```

- **[`data/scripts/cities/`](data/scripts/cities/)** is the only place where GTFS route ids or shapefile route ids appear. [`montreal.py`](data/scripts/cities/montreal.py) combines the STM métro and the REM into one city; [`toronto.py`](data/scripts/cities/toronto.py) takes the TTC's subway and light rail out of one city-wide feed.
- **[`data/scripts/build_networks.py`](data/scripts/build_networks.py)** writes one file per city in [`CITIES`](data/scripts/cities/__init__.py) to [`extension/networks/`](extension/networks/). Shared simplification, deduplication, and rounding live in [`transit_geometry.py`](data/scripts/transit_geometry.py).
- **[`extension/networks.js`](extension/networks.js)** declares each city's operators, lines, colours, map bounds, data file, and the licence each operator's data was published under. Geometry files never repeat this information.
- **[`extension/settings.js`](extension/settings.js)** gets its defaults from the registry, so a new city, operator, or line is switched on without a settings migration. [`options.js`](extension/options.js) builds the settings page from the same registry.
- **[`extension/content.js`](extension/content.js)** chooses the city whose bounds contain the viewport, loads its geometry, and draws it through the site adapter selected in [`sites.js`](extension/sites.js).
- **[`tests/networks.test.mjs`](tests/networks.test.mjs)** checks that the registry and generated geometry list the same lines, and that each city's bounds contain everything it draws.

To add a city, follow [Add a city](data/README.md#add-a-city). The data licences for each network are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Repository layout

| Path | Purpose |
| --- | --- |
| [`extension/`](extension/) | Manifest V3 extension: [network registry](extension/networks.js), [settings](extension/settings.js), [site adapters](extension/sites.js), and [bundled geometry](extension/networks/) |
| [`web/`](web/) | TanStack Start / React / Tailwind support and privacy website ([guide](web/README.md)) |
| [`data/`](data/) | STM and TTC source files and the [per-city network generators](data/scripts/cities/) ([guide](data/README.md)) |
| [`rem_data/`](rem_data/) | REM GTFS source subset and original licence |
| [`scripts/`](scripts/) | Reproducible [extension packaging](scripts/package_extension.py) |
| [`tests/`](tests/) | Extension behaviour, [network registry](tests/networks.test.mjs), and resource checks |
| [`docs/`](docs/) | Screenshot and [release instructions](docs/RELEASING.md) |

## Contributing and releases

Bug reports and contributions are welcome in English or French. See [CONTRIBUTING.md](CONTRIBUTING.md) for checks and manual testing, and [the release guide](docs/RELEASING.md) before publishing a version. Report security problems privately using [SECURITY.md](SECURITY.md).

## Licence and attribution

Original code and documentation are under the [MIT licence](LICENSE). The bundled transit data keeps the terms it was published under, and those differ by operator: STM and REM data are **CC BY 4.0**, while the TTC feed comes from the City of Toronto under the **Open Government Licence – Toronto**. The derived geometry in `extension/networks/` carries the same terms as the data it came from. Third-party branding and map imagery are not covered by the code licence. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for sources and modifications.
