import { Link, createFileRoute } from '@tanstack/react-router'
import { MESSAGES, localeOf, localeParam, useLocale } from '../../i18n'
import type { Locale } from '../../locales'

export const Route = createFileRoute('/{-$locale}/confidentialite')({
  component: Privacy,
  head: ({ params }) => {
    const messages = MESSAGES[localeOf(params.locale)]

    return {
      meta: [{ title: `${messages.privacy} — ${messages.shortName}` }],
    }
  },
})

// One date for both languages, so a revision cannot leave one of them behind
// saying it is current.
const UPDATED = '2026-09-10'

const LAST_UPDATED: Record<Locale, string> = {
  fr: 'Dernière mise à jour :',
  en: 'Last updated:',
}

// The policy is translated as a whole rather than sentence by sentence: it is
// read as one document, and each language should read as if written in it.
const POLICY: Record<Locale, () => React.ReactNode> = {
  fr: PolicyFr,
  en: PolicyEn,
}

function Privacy() {
  const locale = useLocale()
  const messages = MESSAGES[locale]
  const Policy = POLICY[locale]
  const updated = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(UPDATED))

  return (
    <main>
      <p>
        <Link to="/{-$locale}" params={{ locale: localeParam(locale) }}>
          {messages.back}
        </Link>
      </p>
      <h1>{messages.privacy}</h1>
      <Policy />

      <hr />
      <small>
        {LAST_UPDATED[locale]} {updated}
      </small>
    </main>
  )
}

function PolicyFr() {
  return (
    <>
      <p>
        L’extension Transport en commun pour Marketplace et Centris affiche le
        réseau de transport sur les cartes de logements et permet d’y ajouter
        vos points de repère. Elle enregistre vos réglages et vos points
        localement dans votre navigateur.
      </p>

      <h2>Données enregistrées localement</h2>
      <ul className="mb-5 list-disc space-y-2 pl-6">
        <li>L’état activé ou désactivé de l’extension.</li>
        <li>
          Vos préférences : sites activés, lignes de transport, stations,
          étiquettes, cartes et boutons affichés.
        </li>
        <li>
          Les points que vous ajoutez : nom, couleur, coordonnées géographiques
          et identifiant généré pour gérer chaque point. Ces informations
          peuvent désigner un lieu personnel, comme votre domicile ou votre
          travail.
        </li>
        <li>
          La dernière ville dont une carte a montré le réseau, pour que la page
          suivante charge le bon réseau plutôt que d’en essayer un autre
          d’abord. C’est le nom d’une des villes prises en charge par
          l’extension, jamais une position.
        </li>
        <li>
          Si vous avez masqué les annonces à côté de la carte d’une recherche
          Marketplace, pour que la recherche suivante s’ouvre de la même façon.
          C’est un simple oui ou non, jamais le contenu d’une annonce.
        </li>
      </ul>
      <p>
        Les liens Google Maps que vous collez sont lus localement pour en
        extraire les coordonnées. Le lien lui-même n’est pas enregistré et cette
        opération n’envoie aucune requête à Google Maps.
      </p>

      <h2>Utilisation des données</h2>
      <p>
        L’extension lit les éléments des cartes de Facebook Marketplace et de
        Centris, y compris la carte Local Logic intégrée aux fiches Centris,
        pour positionner le réseau de transport et vos points. Ce traitement se
        fait dans votre navigateur. Elle n’enregistre pas votre historique de
        navigation, vos messages ou les annonces consultées.
      </p>
      <p>
        Vos points sont ajoutés aux cartes dans la page consultée. Les scripts
        de cette page peuvent donc lire les noms et les emplacements affichés.
      </p>

      <h2>Transmission et services tiers</h2>
      <p>
        L’extension n’envoie pas vos réglages et vos points à un serveur du
        développeur et ne les synchronise pas entre vos appareils. Elle
        n’intègre aucun service d’analyse, outil publicitaire ou témoin de
        suivi. Le développeur ne reçoit ni ne vend ces données.
      </p>
      <p>
        Les données sont utilisées uniquement pour les fonctions décrites ici,
        conformément aux exigences d’utilisation limitée du Chrome Web Store.
        Les sites consultés et les liens externes que vous ouvrez appliquent
        leurs propres politiques de confidentialité.
      </p>

      <h2>Conservation et suppression</h2>
      <p>
        Les données restent dans le stockage local de l’extension entre vos
        sessions. Vous pouvez modifier vos réglages et consulter, modifier ou
        supprimer vos points depuis les réglages de l’extension. Un point
        supprimé est retiré de ce stockage.
      </p>
      <p>
        Désactiver l’extension ou réinitialiser ses réglages ne supprime pas vos
        points. Ils restent enregistrés jusqu’à leur suppression ou à la
        désinstallation de l’extension, qui efface aussi les réglages.
      </p>
    </>
  )
}

function PolicyEn() {
  return (
    <>
      <p>
        The Public Transit for Marketplace and Centris extension shows the
        transit network on housing maps and lets you add your own landmarks to
        them. It saves your settings and your landmarks locally, in your
        browser.
      </p>

      <h2>Data saved locally</h2>
      <ul className="mb-5 list-disc space-y-2 pl-6">
        <li>Whether the extension is turned on or off.</li>
        <li>
          Your preferences: the sites, transit lines, stations, labels, maps and
          buttons shown.
        </li>
        <li>
          The landmarks you add: their name, colour, geographic coordinates and
          an identifier generated to manage each one. This information can point
          to a personal place, such as your home or your workplace.
        </li>
        <li>
          The last city whose network a map showed, so that the next page loads
          the right network rather than trying another one first. This is the
          name of one of the cities the extension supports, never a location.
        </li>
        <li>
          Whether you hid the listings beside the map of a Marketplace search,
          so that the next search opens the same way. This is a simple yes or
          no, never the content of a listing.
        </li>
      </ul>
      <p>
        Google Maps links you paste are read locally to extract their
        coordinates. The link itself is not saved, and doing this sends no
        request to Google Maps.
      </p>

      <h2>How the data is used</h2>
      <p>
        The extension reads the map elements of Facebook Marketplace and
        Centris, including the Local Logic map built into Centris listings, to
        position the transit network and your landmarks. This happens in your
        browser. It does not save your browsing history, your messages or the
        listings you view.
      </p>
      <p>
        Your landmarks are added to the maps on the page you are viewing, so
        that page’s scripts can read the names and locations shown.
      </p>

      <h2>Sharing and third-party services</h2>
      <p>
        The extension does not send your settings or your landmarks to any
        server of the developer’s and does not sync them between your devices.
        It includes no analytics service, advertising tool or tracking cookie.
        The developer neither receives nor sells this data.
      </p>
      <p>
        The data is used only for the features described here, in line with the
        Chrome Web Store’s limited use requirements. The sites you visit and the
        external links you open apply their own privacy policies.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        The data stays in the extension’s local storage between sessions. You
        can change your settings, and view, edit or delete your landmarks, from
        the extension’s settings. A deleted landmark is removed from that
        storage.
      </p>
      <p>
        Turning the extension off or resetting its settings does not delete your
        landmarks. They stay saved until you delete them or uninstall the
        extension, which also erases the settings.
      </p>
    </>
  )
}
