import { useParams } from '@tanstack/react-router'

import { LOCALES } from './locales'
import type { Locale } from './locales'

// The site picks its language the way the extension does: the one the reader
// chose, or else the first their browser prefers that the site is written in,
// or else English. Unlike the extension, each language also has its own URLs,
// so that a page can be linked to and indexed in either one: French at the
// unprefixed paths, which predate the English ones and are what the Chrome
// Web Store listing links to, and English under /en.

// The language at the unprefixed URLs.
export const DEFAULT_LOCALE: Locale = 'fr'

// What a browser that prefers neither language gets, as in the extension.
const FALLBACK_LOCALE: Locale = 'en'

// Each language named in its own words, so that someone who cannot read the
// page as it stands can still find theirs.
export const LANGUAGE_NAMES: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
}

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale)
}

// The language a route's {-$locale} segment asks for.
export function localeOf(param: string | undefined): Locale {
  return isLocale(param) ? param : DEFAULT_LOCALE
}

// The {-$locale} segment for a language: none at all for the default one.
export function localeParam(locale: Locale) {
  return locale === DEFAULT_LOCALE ? undefined : locale
}

export function useLocale(): Locale {
  return localeOf(useParams({ strict: false }).locale)
}

// The first of the browser's preferred languages the site is written in. A tag
// is tried whole and then shortened, so "fr-CA" is read as French — the same
// reading as stmBrowserLocale in the extension's i18n.js.
export function browserLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const parts = tag.toLowerCase().split('-')

    for (let length = parts.length; length > 0; length -= 1) {
      const code = parts.slice(0, length).join('-')

      if (isLocale(code)) return code
    }
  }

  return FALLBACK_LOCALE
}

const STORAGE_KEY = 'language'

// Storage can be missing or refuse access, in a private window say, and then
// the reader simply has made no choice that outlasts the page.
export function chosenLocale(): Locale | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    return isLocale(stored) ? stored : undefined
  } catch {
    return undefined
  }
}

export function chooseLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Nothing to keep it in; the switch itself still happens.
  }
}

export const CONTACT_EMAIL = 'olivier@odeschenes.com'

export const SOURCE_URL =
  'https://github.com/olivier-deschenes/browser-transit-overlay'

// A count as the language writes it: 2 123 in French, 2,123 in English.
export function number(locale: Locale, value: number) {
  return new Intl.NumberFormat(locale).format(value)
}

// French counts zero and one as singular, English only one.
function plural(locale: Locale, count: number, one: string, other: string) {
  return new Intl.PluralRules(locale).select(count) === 'one' ? one : other
}

export function mailto(subject?: string, body?: string) {
  const fields = [
    subject && `subject=${encodeURIComponent(subject)}`,
    body && `body=${encodeURIComponent(body)}`,
  ].filter(Boolean)

  return `mailto:${CONTACT_EMAIL}${fields.length ? `?${fields.join('&')}` : ''}`
}

// Words more than one page uses. Each page keeps its own under the same rule:
// one block per language, the others typed after the French one, so that a
// string missing from a language fails the typecheck.
const fr = {
  shortName: 'Transport en commun',
  chromeExtension: 'Extension Chrome',
  privacy: 'Politique de confidentialité',
  support: 'Assistance',
  language: 'Langue',
  source: 'Code source',
  allCities: 'Toutes les villes',
  cities: 'Villes',
  map: 'Carte du réseau',
  skip: 'Aller au contenu',
  loading: 'Chargement du réseau…',
  lines: (count: number) =>
    `${number('fr', count)} ${plural('fr', count, 'ligne', 'lignes')}`,
  stations: (count: number) =>
    `${number('fr', count)} ${plural('fr', count, 'station', 'stations')}`,
}

const en: typeof fr = {
  shortName: 'Public Transit',
  chromeExtension: 'Chrome extension',
  privacy: 'Privacy policy',
  support: 'Support',
  language: 'Language',
  source: 'Source code',
  allCities: 'All cities',
  cities: 'Cities',
  map: 'Transit map',
  skip: 'Skip to content',
  loading: 'Loading the network…',
  lines: (count: number) =>
    `${number('en', count)} ${plural('en', count, 'line', 'lines')}`,
  stations: (count: number) =>
    `${number('en', count)} ${plural('en', count, 'station', 'stations')}`,
}

export const MESSAGES: Record<Locale, typeof fr> = { fr, en }
