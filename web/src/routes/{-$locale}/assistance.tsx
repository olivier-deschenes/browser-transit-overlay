import { createFileRoute } from '@tanstack/react-router'

import { TextPage } from '@/components/text-page'
import { Button } from '@/components/ui/button'
import { CONTACT_EMAIL, MESSAGES, localeOf, mailto, useLocale } from '@/i18n'

export const Route = createFileRoute('/{-$locale}/assistance')({
  component: Support,
  head: ({ params }) => {
    const locale = localeOf(params.locale)
    const messages = MESSAGES[locale]

    return {
      meta: [{ title: `${messages.support} · ${messages.shortName}` }],
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
    <TextPage title={messages.support}>
      <p>{copy.notShowing}</p>

      <h2>{copy.reportTitle}</h2>
      <p>{copy.reportText}</p>
      <Button asChild variant="outline" className="not-prose">
        <a href={mailto()}>{CONTACT_EMAIL}</a>
      </Button>
    </TextPage>
  )
}
