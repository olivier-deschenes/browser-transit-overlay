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
        Extension Chrome qui affiche les lignes et les stations du transport en
        commun rapide sur les cartes de logements de Facebook Marketplace et de
        Centris : le métro de Montréal et le REM, le métro et le train léger de
        la TTC à Toronto, ainsi que les six métros français (Paris et son RER,
        Lyon, Marseille, Lille, Toulouse et Rennes).
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
