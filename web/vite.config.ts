import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

import { extensionCatalog } from './plugins/extension-catalog'
import { LOCALES } from './src/locales'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // MapLibre starts its worker as a module, so the bundled worker is one.
  worker: { format: 'es' },
  plugins: [
    devtools(),
    extensionCatalog({
      extension: fileURLToPath(new URL('../extension/', import.meta.url)),
      locales: LOCALES,
    }),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        // A city's page with a line picked out is the same page as without:
        // the line is only picked out once it runs in the browser.
        filter: ({ path }) => !/[?#]/.test(path),
      },
    }),
    viteReact(),
  ],
})

export default config
