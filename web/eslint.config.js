//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/routeTree.gen.ts',
      // Registry code from shadcn/ui and mapcn, kept close to what
      // `npx shadcn add` writes so that it can be updated in place: formatted
      // like the rest, but not held to the site's lint rules.
      'src/components/ui/**',
      '.tanstack/**',
      '.wrangler/**',
      '.output/**',
    ],
  },
]
