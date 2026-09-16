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

## TTC transit data

`data/ttc_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Toronto Transit Commission (TTC)** GTFS dataset, published by the City of Toronto.

- Source: [Merged GTFS — TTC Routes and Schedules](https://open.toronto.ca/dataset/merged-gtfs-ttc-routes-and-schedules/) on the City of Toronto Open Data Portal, also linked in `data/ttc_gtfs/terms.txt`.
- Licence: [Open Government Licence – Toronto](https://www.toronto.ca/city-government/data-research-maps/open-data/open-data-licence/), which the portal applies to the data it publishes.
- That licence asks for one attribution statement in particular, and `extension/networks/toronto.json` carries it word for word.

## Adaptations and redistribution

`data/scripts/build_networks.py`, with the city generators under `data/scripts/cities/`, selects rapid transit routes, converts the STM coordinate reference system to WGS 84, combines station records, removes duplicate track segments, simplifies lines with a two-metre tolerance, rounds coordinates, and writes one file per city to `extension/networks/`.

Attribution, one line per city, and the line each city's geometry file carries:

- `montreal.json`: **Contains modified STM and Réseau express métropolitain data, licensed under CC BY 4.0.**
- `toronto.json`: **Contains information licensed under the Open Government Licence – Toronto, modified.**

`extension/networks.js` holds the source and licence links for each operator, and the extension displays that attribution on its maps and settings page. Keep these notices when redistributing the data. Packaged extensions also include the CC BY 4.0 text as `LICENSE-DATA.txt`; the Open Government Licence – Toronto is linked rather than bundled, which is what it asks for.

These are bundled snapshots. The Montréal inputs' original download dates were not recorded; the Toronto feed was downloaded on 15 September 2026. They do not guarantee current service, routing, or station availability. No transit provider endorses this project.

## Dependencies and images

JavaScript and Python dependencies retain their own licences, available in their distributions. The extension itself has no third-party runtime library dependencies.

Screenshots illustrate the extension on third-party websites. The underlying map imagery, website interface, and third-party marks remain subject to their owners' rights and terms; the MIT licence does not grant rights to those elements. Facebook, Centris, Local Logic, STM, REM, and TTC names identify supported services or data sources and do not imply affiliation or endorsement.
