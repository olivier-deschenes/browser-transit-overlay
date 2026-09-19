# Third-party notices

The root MIT licence covers this project's original code and documentation. It does not replace the licences of third-party data, dependencies, branding, or imagery.

Source repository: [browser-transit-overlay](https://github.com/olivier-deschenes/browser-transit-overlay). File paths below refer to that repository; release ZIPs include the data licence as `LICENSE-DATA.txt`.

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

## Île-de-France Mobilités transit data

`data/idfm_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Île-de-France Mobilités (IDFM)** GTFS dataset, which covers the Paris métro and the RER.

- Source: [Réseaux urbains et interurbains d'Île-de-France Mobilités](https://transport.data.gouv.fr/datasets/reseau-urbain-et-interurbain-dile-de-france-mobilites) on the national access point, also linked in `data/idfm_gtfs/terms.txt`.
- Licence: [Licence Mobilités](https://wiki.lafabriquedesmobilites.fr/wiki/Licence_Mobilit%C3%A9s).

## SYTRAL transit data

`data/tcl_sytral/` contains the métro route and stop layers used from **SYTRAL Mobilités**, who run the Transports en Commun Lyonnais (TCL). The métro is taken from these map layers rather than from SYTRAL's GTFS feed, which carries no route geometry for it.

- Sources: [Lignes de métro et funiculaire](https://www.data.gouv.fr/datasets/lignes-de-metro-et-funiculaire-du-reseau-transports-en-commun-lyonnais) and [Points d'arrêt](https://www.data.gouv.fr/datasets/points-darret-du-reseau-transports-en-commun-lyonnais) du réseau Transports en Commun Lyonnais, also linked in `data/tcl_sytral/terms.txt`.
- Licence: [Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).

## RTM transit data

`data/rtm_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Régie des Transports Métropolitains (RTM)** GTFS dataset, published by the Métropole d'Aix-Marseille-Provence.

- Source: [Réseaux urbains de la Métropole Aix-Marseille-Provence](https://transport.data.gouv.fr/datasets/reseaux-de-transports-en-commun-de-la-metropole-daix-marseille-provence-et-des-bouches-du-rhone), also linked in `data/rtm_gtfs/terms.txt`.
- Licence: [Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).

## ilévia transit data

`data/ilevia_gtfs/` contains the route, trip, stop, and stop time files used from the **ilévia** GTFS dataset, published by the Métropole Européenne de Lille. That feed ships no `shapes.txt`, so the bundled Lille geometry is drawn through its stations rather than over its track.

- Source: [ilévia — Localisation des arrêts (bus, métro et tram) + GTFS](https://transport.data.gouv.fr/datasets/ilevia-localisation-des-arrets-bus-metro-et-tram-gtfs), also linked in `data/ilevia_gtfs/terms.txt`.
- Licence: [Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).

## Tisséo transit data

`data/tisseo_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Tisséo** GTFS dataset, published by Toulouse Métropole.

- Source: [Tisséo — réseau de transport urbain toulousain](https://transport.data.gouv.fr/datasets/tisseo-reseau-transport-urbain-toulousain), also linked in `data/tisseo_gtfs/terms.txt`.
- Licence: [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

## STAR transit data

`data/star_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Service des Transports en commun de l'Agglomération Rennaise (STAR)** GTFS dataset.

- Source: [Réseau urbain STAR](https://transport.data.gouv.fr/datasets/versions-des-horaires-theoriques-des-lignes-de-bus-et-de-metro-du-reseau-star-dans-les-formats-gtfs-et-netex-ainsi-que-les-urls-dacces-au-gtfs-rt-1), also linked in `data/star_gtfs/terms.txt`.
- Licence: [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

## Adaptations and redistribution

`data/scripts/build_networks.py`, with the city generators under `data/scripts/cities/` and the shared GTFS reader in `data/scripts/gtfs_network.py`, selects rapid transit routes, converts the STM coordinate reference system to WGS 84, combines station records, removes duplicate track segments, simplifies lines with a two-metre tolerance, rounds coordinates, and writes one file per city to `extension/networks/`.

Attribution, one line per city, and the line each city's geometry file carries:

- `montreal.json`: **Contains modified STM and Réseau express métropolitain data, licensed under CC BY 4.0.**
- `toronto.json`: **Contains information licensed under the Open Government Licence – Toronto, modified.**
- `paris.json`: **Contains data from Île-de-France Mobilités, licensed under the Licence Mobilités, modified.**
- `lyon.json`: **Contains data from SYTRAL Mobilités, licensed under the Licence Ouverte 2.0, modified.**
- `marseille.json`: **Contains data from the Métropole d'Aix-Marseille-Provence, licensed under the Licence Ouverte 2.0, modified.**
- `lille.json`: **Contains data from the Métropole Européenne de Lille, licensed under the Licence Ouverte 2.0, modified.**
- `toulouse.json`: **Contains data from Tisséo and Toulouse Métropole, licensed under the ODbL 1.0, modified.**
- `rennes.json`: **Contains data from the STAR and Rennes Métropole, licensed under the ODbL 1.0, modified.**

`extension/networks.js` holds the source and licence links for each operator, and the extension displays that attribution on its maps and settings page. Keep these notices when redistributing the data. Packaged extensions also include the CC BY 4.0 text as `LICENSE-DATA.txt`; the other licences are linked rather than bundled, which is what they ask for.

`toulouse.json` and `rennes.json` are derived from ODbL databases, so they are themselves offered under the ODbL 1.0: redistributing them, adapted or not, carries that licence and its share-alike condition with them. The other geometry files carry the terms of the data they came from, as listed above.

These are bundled snapshots. The Montréal inputs' original download dates were not recorded; the Toronto feed was downloaded on 15 September 2026, and the six French sources on 17 September 2026. They do not guarantee current service, routing, or station availability. No transit provider endorses this project.

## Dependencies and images

JavaScript and Python dependencies retain their own licences, available in their distributions. The extension itself has no third-party runtime library dependencies.

Screenshots illustrate the extension on third-party websites. The underlying map imagery, website interface, and third-party marks remain subject to their owners' rights and terms; the MIT licence does not grant rights to those elements. Facebook, Centris, Local Logic, STM, REM, TTC, Île-de-France Mobilités, RATP, TCL, SYTRAL, RTM, ilévia, Tisséo, and STAR names identify supported services or data sources and do not imply affiliation or endorsement.
