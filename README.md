# Métro STM et REM pour Marketplace et Centris

A Chrome extension that overlays Montréal's métro and REM lines and stations on housing maps in Facebook Marketplace and Centris. The interface is in French.

![Montréal transit lines overlaid on a Marketplace map](docs/images/marketplace-map.png)

## Features

- Transit overlays on supported search maps, listing maps, and Marketplace map previews.
- Individual switches for sites, transit lines, stations, labels, and map controls.
- Custom landmarks from coordinates or full Google Maps links, with editable names and colours.
- A toolbar switch to enable or disable the overlay without losing your settings.

This is an independent project, unaffiliated with Meta/Facebook, Centris, Local Logic, the STM, or the REM. The bundled network is a snapshot, not a live service or journey planner. Changes to those sites can affect map detection.

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

## Repository layout

| Path | Purpose |
| --- | --- |
| `extension/` | Manifest V3 extension, settings, site adapters, and bundled network |
| `web/` | TanStack Start / React / Tailwind support and privacy website |
| `data/` | STM source files and network generation script |
| `rem_data/` | REM GTFS source subset and original licence |
| `scripts/` | Reproducible extension packaging |
| `tests/` | Extension behaviour and resource checks |
| `docs/` | Screenshot and release instructions |

## Contributing and releases

Bug reports and contributions are welcome in English or French. See [CONTRIBUTING.md](CONTRIBUTING.md) for checks and manual testing, and [the release guide](docs/RELEASING.md) before publishing a version. Report security problems privately using [SECURITY.md](SECURITY.md).

## Licence and attribution

Original code and documentation are under the [MIT licence](LICENSE). STM and REM data, including the derived `extension/metro-data.json`, retain their **CC BY 4.0** terms. Third-party branding and map imagery are not covered by the code licence. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for sources and modifications.
