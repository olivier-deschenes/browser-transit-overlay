import { Link, createFileRoute } from '@tanstack/react-router'
import pluginIcon from '../../../extension/icons/icon-128.png'

export const Route = createFileRoute('/')({
  component: Home,
  head: () => ({
    meta: [
      {
        title: 'Métro STM et REM pour Marketplace — Extension Chrome',
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
        alt="Icône de l’extension Métro STM et REM pour Marketplace"
      />
      <h1>Métro STM et REM pour Marketplace</h1>
      <p>
        Extension Chrome qui affiche les lignes et les stations du métro de
        Montréal et du REM sur les cartes de logements de Facebook Marketplace.
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
