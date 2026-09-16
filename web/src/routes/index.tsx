import { Link, createFileRoute } from '@tanstack/react-router'
import pluginIcon from '../../../extension/icons/icon-128.png'

export const Route = createFileRoute('/')({
  component: Home,
  head: () => ({
    meta: [
      {
        title:
          'Transport en commun pour Marketplace et Centris — Extension Chrome',
      },
    ],
  }),
})

function Home() {
  return (
    <main>
      <img
        className="plugin-icon"
        src={pluginIcon}
        alt="Icône de l’extension Transport en commun pour Marketplace et Centris"
      />
      <h1>Transport en commun pour Marketplace et Centris</h1>
      <p>
        Extension Chrome qui affiche les lignes et les stations du métro de
        Montréal, du REM et du réseau de la TTC à Toronto sur les cartes de
        logements de Facebook Marketplace.
      </p>

      <hr />

      <p>
        <Link to="/confidentialite">Politique de confidentialité</Link>
        {' · '}
        <Link to="/assistance">Assistance</Link>
      </p>
    </main>
  )
}
