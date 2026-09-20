import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/confidentialite')({
  component: Privacy,
  head: () => ({
    meta: [
      {
        title: 'Politique de confidentialité — Transport en commun',
      },
    ],
  }),
})

function Privacy() {
  return (
    <main>
      <p>
        <Link to="/">← Retour</Link>
      </p>
      <h1>Politique de confidentialité</h1>
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

      <hr />
      <small>Dernière mise à jour : 10 septembre 2026</small>
    </main>
  )
}
