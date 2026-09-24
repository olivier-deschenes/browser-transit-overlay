import { Link } from '@tanstack/react-router'

import {
  LANGUAGE_NAMES,
  MESSAGES,
  chooseLocale,
  localeParam,
  useLocale,
} from '../i18n'
import { LOCALES } from '../locales'

// The same page in each other language, named in that language. Following one
// is the reader choosing it, and is remembered the way the extension's
// language setting is.
export function LanguageSwitcher() {
  const locale = useLocale()

  return (
    <nav
      aria-label={MESSAGES[locale].language}
      className="mx-auto mb-6 flex max-w-[680px] justify-end gap-4"
    >
      {LOCALES.filter((other) => other !== locale).map((other) => (
        <Link
          key={other}
          to="."
          params={(previous) => ({ ...previous, locale: localeParam(other) })}
          hrefLang={other}
          lang={other}
          onClick={() => chooseLocale(other)}
        >
          {LANGUAGE_NAMES[other]}
        </Link>
      ))}
    </nav>
  )
}
