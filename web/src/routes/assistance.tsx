import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/assistance')({
  component: Support,
  head: () => ({
    meta: [
      {
        title: 'Assistance — Métro sur Marketplace et Centris',
      },
    ],
  }),
})

function Support() {
  return (
    <main>
      <p>
        <Link to="/">← Retour</Link>
      </p>
      <h1>Assistance</h1>
      <p>
        Si les lignes de transport ne s’affichent pas, actualisez la page
        Facebook Marketplace ou Centris et vérifiez que l’extension est activée
        dans Chrome.
      </p>

      <h2>Signaler un problème</h2>
      <p>
        Décrivez le problème et indiquez le site concerné ainsi que votre
        version de Chrome.
      </p>
      <a className="big-link" href="mailto:olivier@odeschenes.com">
        olivier@odeschenes.com
      </a>
    </main>
  )
}
