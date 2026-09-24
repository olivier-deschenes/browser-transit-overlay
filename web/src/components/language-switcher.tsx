import { Link, useHydrated } from '@tanstack/react-router'

import {
  LANGUAGE_NAMES,
  MESSAGES,
  chooseLocale,
  localeParam,
  useLocale,
} from '../i18n'
import { LOCALES } from '../locales'
import { cn } from '@/lib/utils'

// The same page in each other language, named in that language. Following one
// is the reader choosing it, and is remembered the way the extension's
// language setting is. It keeps the line picked out, if there is one, once
// the page knows about it: a prerendered page never has one.
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const hydrated = useHydrated()

  return (
    <nav
      aria-label={MESSAGES[locale].language}
      className={cn('flex gap-4', className)}
    >
      {LOCALES.filter((other) => other !== locale).map((other) => (
        <Link
          key={other}
          to="."
          params={(previous) => ({ ...previous, locale: localeParam(other) })}
          hash={hydrated || undefined}
          hrefLang={other}
          lang={other}
          onClick={() => chooseLocale(other)}
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          {LANGUAGE_NAMES[other]}
        </Link>
      ))}
    </nav>
  )
}
