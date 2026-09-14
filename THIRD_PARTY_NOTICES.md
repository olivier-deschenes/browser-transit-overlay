# Third-party notices

The root MIT licence covers this project's original code and documentation. It does not replace the licences of third-party data, dependencies, branding, or imagery.

Source repository: [fb-marketplace-metro-map](https://github.com/olivier-deschenes/fb-marketplace-metro-map). File paths below refer to that repository; release ZIPs include the data licence as `LICENSE-DATA.txt`.

## STM transit data

`data/stm_sig/` contains source GIS data from the **Société de transport de Montréal (STM)**. The bundled transit network includes an adaptation of these data.

- Source: [STM developer resources](https://www.stm.info/en/about/developers).
- Terms: [STM terms of use](https://www.stm.info/en/about/developers/terms-use), also linked in `data/stm_sig/terms.txt`.
- Licence: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

## REM transit data

`rem_data/` contains the route, trip, shape, and stop files used from the **Réseau express métropolitain (REM)** GTFS dataset.

- Publisher: [Réseau express métropolitain](https://rem.info/).
- The supplied licence text is preserved in [`rem_data/__Licence.txt`](rem_data/__Licence.txt): Creative Commons Attribution 4.0 International.

## Adaptations and redistribution

`data/scripts/build_networks.py`, with the city generators under `data/scripts/cities/`, selects métro routes, converts the STM coordinate reference system to WGS 84, combines station records, removes duplicate track segments, simplifies lines with a two-metre tolerance, rounds coordinates, and writes the result with REM geometry to `extension/networks/montreal.json`.

Attribution: **Contains modified STM and Réseau express métropolitain data, licensed under CC BY 4.0.** Each geometry file carries this notice, `extension/networks.js` holds the source and licence links, and the extension displays attribution on its maps and settings page. Keep these notices when redistributing the data. Packaged extensions also include the CC BY 4.0 text as `LICENSE-DATA.txt`.

These are bundled snapshots; their original download dates were not recorded. They do not guarantee current service, routing, or station availability. Neither transit provider endorses this project.

## Dependencies and images

JavaScript and Python dependencies retain their own licences, available in their distributions. The extension itself has no third-party runtime library dependencies.

Screenshots illustrate the extension on third-party websites. The underlying map imagery, website interface, and third-party marks remain subject to their owners' rights and terms; the MIT licence does not grant rights to those elements. Facebook, Centris, Local Logic, STM, and REM names identify supported services or data sources and do not imply affiliation or endorsement.
