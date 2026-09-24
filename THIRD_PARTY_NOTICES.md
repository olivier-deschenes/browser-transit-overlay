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

## MTA transit data

`data/mta_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Metropolitan Transportation Authority (MTA)** New York City Subway GTFS dataset, which also covers the Staten Island Railway.

- Source: [MTA developer resources](https://www.mta.info/developers), also linked in `data/mta_gtfs/terms.txt`.
- Terms: [Terms and conditions for MTA data feeds](https://www.mta.info/developers/terms-and-conditions). They allow an app to use some but not all of the data, ask that none of it be modified, and forbid stating or implying that the MTA licenses or endorses the app, or that the data is accurate, complete, or timely. The subway geometry here keeps only points the feed itself has, at its own precision.

## PATH transit data

`data/path_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Port Authority Trans-Hudson (PATH)** GTFS dataset, which the Port Authority of New York and New Jersey publishes through Trillium.

- Source: [PATH GTFS](https://mobilitydatabase.org/feeds/gtfs/mdb-517), also linked in `data/path_gtfs/terms.txt`.
- The feed is published without a licence or terms of use.

## Open Data DC transit data

`data/wmata_dcgis/` contains the **Metro Lines Regional** and **Metro Stations Regional** layers, which the District of Columbia's Office of the Chief Technology Officer publishes from Washington Metropolitan Area Transit Authority (WMATA) data. The Washington Metro is taken from these layers rather than from WMATA's own feed, which is available only with a developer key.

- Sources: [Metro Lines Regional](https://opendata.dc.gov/datasets/DCGIS::metro-lines-regional/about) and [Metro Stations Regional](https://opendata.dc.gov/datasets/DCGIS::metro-stations-regional/about) on Open Data DC, also linked in `data/wmata_dcgis/terms.txt`.
- Licence: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

## CTA transit data

`data/cta_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Chicago Transit Authority (CTA)** GTFS dataset.

- Source: [CTA GTFS](https://www.transitchicago.com/developers/gtfs/), also linked in `data/cta_gtfs/terms.txt`.
- Terms: [CTA Developer License Agreement and Terms of Use](https://www.transitchicago.com/developers/terms/), which licenses using, redistributing, and creating derivative works of the data for the purpose of assisting transit riders or promoting public transportation, and forbids implying any affiliation with or endorsement by the CTA.

## MBTA transit data

`data/mbta_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Massachusetts Bay Transportation Authority (MBTA)** GTFS dataset, published by the Massachusetts Department of Transportation (MassDOT).

- Source: [MBTA GTFS](https://www.mbta.com/developers/gtfs), also linked in `data/mbta_gtfs/terms.txt`.
- Terms: [MassDOT Developers License Agreement](https://cdn.mbta.com/sites/default/files/2023-08/mbta-massdot-develop-license-agreement.pdf), which licenses using, reproducing, and redistributing the data, provided MassDOT is clearly acknowledged as its provider.

## BART transit data

`data/bart_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **San Francisco Bay Area Rapid Transit District (BART)** GTFS dataset.

- Source: [BART GTFS](https://www.bart.gov/schedules/developers/gtfs), also linked in `data/bart_gtfs/terms.txt`.
- Terms: [BART Developer License Agreement](https://www.bart.gov/schedules/developers/developer-license-agreement), which licenses using, reproducing, and redistributing the data and forbids using BART's marks in association with it.

## SEPTA transit data

`data/septa_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Southeastern Pennsylvania Transportation Authority (SEPTA)** GTFS dataset.

- Source: [SEPTA GTFS](https://github.com/septadev/GTFS), also linked in `data/septa_gtfs/terms.txt`.
- Terms: [SEPTA License Agreement](https://www.septa.org/license-agreement/), which licenses using, reproducing, and redistributing the datasets.

## LA Metro transit data

`data/lametro_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Los Angeles County Metropolitan Transportation Authority (LA Metro)** rail GTFS dataset.

- Source: [LA Metro rail GTFS](https://gitlab.com/LACMTA/gtfs_rail), also linked in `data/lametro_gtfs/terms.txt`.
- Terms: [Metro Terms & Conditions](https://developer.metro.net/terms-conditions/), which limit use to displaying or otherwise making the data available, ask that Metro be acknowledged as its provider, and ask that the data not be changed or otherwise modified. The geometry here is simplified and rounded like every other city's.

## MARTA transit data

`data/marta_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Metropolitan Atlanta Rapid Transit Authority (MARTA)** GTFS dataset.

- Source: [MARTA app developer resources](https://itsmarta.com/app-developer-resources.aspx), also linked in `data/marta_gtfs/terms.txt`.
- The feed is published without a licence. The page it is published on prohibits using MARTA's marks without MARTA's written consent.

## Miami-Dade transit data

`data/miamidade_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Miami-Dade County Department of Transportation and Public Works** GTFS dataset.

- Source: [Transit open data feeds](https://www.miamidade.gov/global/transportation/open-data-feeds.page), also linked in `data/miamidade_gtfs/terms.txt`.
- The feed is published without a licence or terms of use; the county's website [disclaimer](https://www.miamidade.gov/global/disclaimer/disclaimer.page) applies.

## MDOT MTA transit data

`data/mdotmta_gtfs/` contains the route, trip, shape, stop, and stop time files used from the **Maryland Transit Administration (MDOT MTA)** Metro SubwayLink GTFS dataset.

- Source: [MDOT MTA developer resources](https://www.mta.maryland.gov/developer-resources), also linked in `data/mdotmta_gtfs/terms.txt`.
- The feed is published without a licence. MDOT MTA does not guarantee the data's accuracy, nor warrant or endorse any application that uses it.

## Adaptations and redistribution

`data/scripts/build_networks.py`, with the city generators under `data/scripts/cities/` and the shared GTFS reader in `data/scripts/gtfs_network.py`, selects rapid transit routes, converts the STM coordinate reference system to WGS 84, combines station records and gives some of them the names their operators sign them with, removes duplicate track segments, simplifies lines with a two-metre tolerance, rounds coordinates, and writes one file per city to `extension/networks/`.

Attribution, one line per city, and the line each city's geometry file carries:

- `montreal.json`: **Contains modified STM and Réseau express métropolitain data, licensed under CC BY 4.0.**
- `toronto.json`: **Contains information licensed under the Open Government Licence – Toronto, modified.**
- `paris.json`: **Contains data from Île-de-France Mobilités, licensed under the Licence Mobilités, modified.**
- `lyon.json`: **Contains data from SYTRAL Mobilités, licensed under the Licence Ouverte 2.0, modified.**
- `marseille.json`: **Contains data from the Métropole d'Aix-Marseille-Provence, licensed under the Licence Ouverte 2.0, modified.**
- `lille.json`: **Contains data from the Métropole Européenne de Lille, licensed under the Licence Ouverte 2.0, modified.**
- `toulouse.json`: **Contains data from Tisséo and Toulouse Métropole, licensed under the ODbL 1.0, modified.**
- `rennes.json`: **Contains data from the STAR and Rennes Métropole, licensed under the ODbL 1.0, modified.**
- `new-york.json`: **Contains a selection of data obtained from the MTA, and data from the Port Authority of New York and New Jersey, modified. Not endorsed by either.**
- `washington.json`: **Contains data from the District of Columbia's Office of the Chief Technology Officer (Open Data DC), licensed under CC BY 4.0, modified.**
- `chicago.json`: **Data provided by Chicago Transit Authority, modified. Not endorsed by the CTA.**
- `boston.json`: **Contains data provided by MassDOT (MBTA), modified.**
- `san-francisco.json`: **Contains data from Bay Area Rapid Transit, modified. Not endorsed by BART.**
- `philadelphia.json`: **Contains data from SEPTA, modified. Not endorsed by SEPTA.**
- `los-angeles.json`: **Contains data provided by LA Metro, modified. Not endorsed by Metro.**
- `atlanta.json`: **Contains data from MARTA, modified. Not endorsed by MARTA.**
- `miami.json`: **Contains data from Miami-Dade County, modified.**
- `baltimore.json`: **Contains data from the Maryland Transit Administration, modified.**

`extension/networks.js` holds the source and licence links for each operator, and the extension displays that attribution on its maps and settings page. The website serves the same geometry to draw its own map: it credits each city's publishers, with their licences, on the map and on the city's page, and prints the city's line above on that page. Keep these notices when redistributing the data. Packaged extensions also include the CC BY 4.0 text as `LICENSE-DATA.txt`; the other licences are linked rather than bundled, which is what they ask for.

`toulouse.json` and `rennes.json` are derived from ODbL databases, so they are themselves offered under the ODbL 1.0: redistributing them, adapted or not, carries that licence and its share-alike condition with them. The other geometry files carry the terms of the data they came from, as listed above.

These are bundled snapshots. The Montréal inputs' original download dates were not recorded; the Toronto feed was downloaded on 15 September 2026, the six French sources on 17 September 2026, and the ten American sources on 24 September 2026. They do not guarantee current service, routing, or station availability. No transit provider endorses this project.

## Dependencies and images

JavaScript and Python dependencies retain their own licences, available in their distributions. The extension itself has no third-party runtime library dependencies.

Screenshots illustrate the extension on third-party websites. The underlying map imagery, website interface, and third-party marks remain subject to their owners' rights and terms; the MIT licence does not grant rights to those elements. Facebook, Centris, Local Logic, STM, REM, TTC, Île-de-France Mobilités, RATP, TCL, SYTRAL, RTM, ilévia, Tisséo, STAR, MTA, PATH, WMATA, CTA, MBTA, BART, SEPTA, LA Metro, MARTA, Miami-Dade, and MDOT MTA names identify supported services or data sources and do not imply affiliation or endorsement.
