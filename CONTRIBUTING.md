# Contributing

Issues and pull requests in French or English are welcome. For bugs, include the extension version, Chrome version, operating system, affected site and map type, steps to reproduce, and what you expected. Remove account details, messages, private landmarks, and identifying listing information from screenshots and logs. Use [SECURITY.md](SECURITY.md) for private vulnerability reports.

## Working locally

Load `extension/` unpacked in Chrome as described in the [README](README.md). It runs directly from source. Reload it from `chrome://extensions` after changing JavaScript or the manifest, then reload the affected website tabs.

Run from the repository root:

```sh
npm test
python -m unittest discover -s tests -p "test_*.py"
python scripts/package_extension.py
```

For website changes, use Node.js 24:

```sh
cd web
npm ci
npm run lint
npm run typecheck
npm run check
npm run build
npm audit
```

`npm run format` in `web/` applies the project's formatting and lint fixes. Commit dependency lockfile changes with package changes. See [data/README.md](data/README.md) when updating network geometry, and regenerate `extension/networks/` with its source changes.

## Project conventions

- Use the appropriate TanStack libraries and their [official documentation](https://tanstack.com/) for functionality they cover.
- Use [Tailwind CSS](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/docs). Before adding a UI component, check the shadcn catalogue and install a suitable component through the shadcn CLI. Preserve its accessibility and behaviour when customising it.
- Follow the [Vercel design guidelines](https://vercel.com/design.md) for design work.
- Keep the extension's site permissions narrow. Describe any added permissions, storage, page-world access, or network requests in the pull request and update privacy documentation as needed.
- Use public transit data or synthetic fixtures in tests. Keep data attribution visible.
- Put interface text in [`extension/i18n.js`](extension/i18n.js), in every language, rather than in the code that shows it. See [Languages](README.md#languages).

## Manual extension checks

Automated tests cover parsing, site selection, resources, translations, and packaging. They cannot establish compatibility with the live websites. Before releasing, check:

1. Marketplace rental search maps, listing map previews, and expanded listing maps.
2. Centris search maps and the Local Logic map in a listing.
3. Panning, zooming, resizing, and navigating between listings without a full reload.
4. A map in each city the registry declares, and the swap when a search moves from one city to another.
5. Toolbar enable/disable and the site, line, station, and label switches.
6. Hiding the listings beside a Marketplace search: the map takes their width with tiles all the way across, a new search opens the same way, and the listings come back when the button or the extension is switched off.
7. Each language, and the browser's language, on the settings page, the map controls, and the toolbar button's tooltip, including switching languages while a map is open.
8. Adding, editing, and deleting a synthetic landmark; rejecting invalid coordinates and short links.
9. Reloading the browser and confirming preferences persist, while reset preserves landmarks.
10. Visible transit attribution and no errors in extension or page consoles.

Use a test browser profile and non-personal landmarks. Include the checks you actually performed in the pull request.
