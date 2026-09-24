// The languages the site is written in: the extension's own two. The build
// reads the extension's names for its cities and lines in each of them, so a
// language added here has to exist in extension/i18n.js as well.
export const LOCALES = ['fr', 'en'] as const

export type Locale = (typeof LOCALES)[number]
