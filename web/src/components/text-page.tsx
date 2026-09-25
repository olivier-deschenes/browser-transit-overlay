import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { SiteFooter } from './site-footer'
import { Button } from '@/components/ui/button'
import { MESSAGES, localeParam, useLocale } from '@/i18n'

// A page of reading rather than of map: support, privacy.
export function TextPage({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const locale = useLocale()
  const messages = MESSAGES[locale]

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-5 py-6 sm:py-10">
      <header>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2.5"
        >
          <Link
            to="/{-$locale}"
            params={{ locale: localeParam(locale) }}
            activeOptions={{ exact: true }}
          >
            <ArrowLeft />
            {messages.shortName}
          </Link>
        </Button>
      </header>

      <main
        id="main"
        className="prose prose-neutral dark:prose-invert prose-h1:text-3xl prose-h1:font-semibold prose-h1:tracking-tight prose-h2:text-lg prose-h2:font-semibold"
      >
        <h1>{title}</h1>
        {children}
      </main>

      <SiteFooter className="mt-auto" />
    </div>
  )
}
