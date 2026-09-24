import { Link, createFileRoute } from '@tanstack/react-router'
import {
  CONTACT_EMAIL,
  MESSAGES,
  localeOf,
  localeParam,
  mailto,
  useLocale,
} from '../../i18n'

export const Route = createFileRoute('/{-$locale}/assistance')({
  component: Support,
  head: ({ params }) => {
    const locale = localeOf(params.locale)
    const messages = MESSAGES[locale]

    return {
      meta: [{ title: `${messages.support} — ${messages.shortName}` }],
    }
  },
})

const fr = {
  notShowing:
    'Si les lignes de transport ne s’affichent pas, actualisez la page Facebook Marketplace ou Centris et vérifiez que l’extension est activée dans Chrome.',
  reportTitle: 'Signaler un problème',
  reportText:
    'Décrivez le problème et indiquez le site concerné ainsi que votre version de Chrome.',
}

const en: typeof fr = {
  notShowing:
    'If the transit lines do not appear, reload the Facebook Marketplace or Centris page and check that the extension is turned on in Chrome.',
  reportTitle: 'Report a problem',
  reportText:
    'Describe the problem and tell us which site it happened on and your version of Chrome.',
}

const COPY = { fr, en }

function Support() {
  const locale = useLocale()
  const copy = COPY[locale]
  const messages = MESSAGES[locale]

  return (
    <main>
      <p>
        <Link to="/{-$locale}" params={{ locale: localeParam(locale) }}>
          {messages.back}
        </Link>
      </p>
      <h1>{messages.support}</h1>
      <p>{copy.notShowing}</p>

      <h2>{copy.reportTitle}</h2>
      <p>{copy.reportText}</p>
      <a className="big-link" href={mailto()}>
        {CONTACT_EMAIL}
      </a>
    </main>
  )
}
