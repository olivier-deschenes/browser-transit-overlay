import { Link, createFileRoute } from '@tanstack/react-router'
import catalogs from 'virtual:extension-catalog'
import pluginIcon from '../../../../extension/icons/icon-128.png'
import { NetworkList } from '../../components/network-list'
import {
  CONTACT_EMAIL,
  MESSAGES,
  localeOf,
  localeParam,
  mailto,
  useLocale,
} from '../../i18n'

export const Route = createFileRoute('/{-$locale}/')({
  component: Home,
  head: ({ params }) => {
    const locale = localeOf(params.locale)

    return {
      meta: [
        {
          title: `${catalogs[locale].name} — ${MESSAGES[locale].chromeExtension}`,
        },
      ],
    }
  },
})

const fr = {
  icon: (name: string) => `Icône de l’extension ${name}`,
  intro:
    'Extension Chrome qui affiche les lignes et les stations du transport en commun rapide sur les cartes de logements de Facebook Marketplace et de Centris.',
  requestTitle: 'Demander une ville',
  requestText:
    'Votre ville n’est pas dans la liste ? Écrivez-nous en indiquant la ville et les lignes que vous aimeriez voir sur la carte.',
  requestSubject: 'Demande de ville',
  requestBody: 'Ville :\nLignes souhaitées :\n',
}

const en: typeof fr = {
  icon: (name: string) => `${name} extension icon`,
  intro:
    'Chrome extension that shows rapid transit lines and stations on Facebook Marketplace and Centris housing maps.',
  requestTitle: 'Request a city',
  requestText:
    'Is your city missing? Email us with the city and the lines you would like to see on the map.',
  requestSubject: 'City request',
  requestBody: 'City:\nLines:\n',
}

const COPY = { fr, en }

function Home() {
  const locale = useLocale()
  const { name } = catalogs[locale]
  const copy = COPY[locale]
  const messages = MESSAGES[locale]
  const params = { locale: localeParam(locale) }

  return (
    <main>
      <img className="plugin-icon" src={pluginIcon} alt={copy.icon(name)} />
      <h1>{name}</h1>
      <p>{copy.intro}</p>

      <NetworkList />

      <section aria-labelledby="request-city">
        <h2 id="request-city">{copy.requestTitle}</h2>
        <p>{copy.requestText}</p>
        <a
          className="big-link"
          href={mailto(copy.requestSubject, copy.requestBody)}
        >
          {CONTACT_EMAIL}
        </a>
      </section>

      <hr />

      <p>
        <Link to="/{-$locale}/confidentialite" params={params}>
          {messages.privacy}
        </Link>
        {' · '}
        <Link to="/{-$locale}/assistance" params={params}>
          {messages.support}
        </Link>
      </p>
    </main>
  )
}
