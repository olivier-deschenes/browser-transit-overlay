import { Link } from '@tanstack/react-router'

import { LanguageSwitcher } from './language-switcher'
import { MESSAGES, SOURCE_URL, localeParam, useLocale } from '../i18n'
import { cn } from '@/lib/utils'

// The links every page ends on.
export function SiteFooter({ className }: { className?: string }) {
  const locale = useLocale()
  const messages = MESSAGES[locale]
  const params = { locale: localeParam(locale) }
  const link = 'hover:text-foreground underline-offset-4 hover:underline'

  return (
    <footer
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm',
        className,
      )}
    >
      <Link to="/{-$locale}/assistance" params={params} className={link}>
        {messages.support}
      </Link>
      <Link to="/{-$locale}/confidentialite" params={params} className={link}>
        {messages.privacy}
      </Link>
      <a href={SOURCE_URL} className={link}>
        {messages.source}
      </a>
      <LanguageSwitcher className="ml-auto" />
    </footer>
  )
}
