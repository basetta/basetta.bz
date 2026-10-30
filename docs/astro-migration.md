# Astro migration

## Scope

The migration keeps the site static and stays on Netlify. No React, server-side adapter, database, or external search service is needed.

The first pass uses a small custom Astro layout rather than translating tabi's Tera templates. It retains the profile, primary navigation, five-post home/blog lists, archive, tags, projects, code highlighting, reading time, theme switcher, copy buttons, and full-text search. Long articles also have a collapsible table of contents.

## Content and URL compatibility

- Imported 61 blog posts and one project from TOML front matter to validated YAML.
- Derived missing dates from the original date-prefixed filenames.
- Stored explicit slugs to preserve every article URL regardless of future filename changes.
- Retained approved taxonomy tags. Older tags under `[extra]` were not promoted without approval.
- Converted the project page's active Tera admonition to a Markdown blockquote.
- Copied colocated images to `static/blog/<slug>/`, retaining the public asset URLs.
- Kept the standalone `generated-image.png` asset at `/blog/generated-image.png`.
- Preserved all 113 captured page/feed/robots/sitemap routes, including pagination and tag Atom feeds.
- Preserved `/bookcase/`, which was an empty section in the legacy site.

`tests/fixtures/zola-baseline.json` was captured from a successful Zola 0.23.6 build before the migration. Regression tests check the routes, imported page metadata, tags, canonical URLs, pagination, feeds, and image bytes against that reference.

The one-time `scripts/import-zola.mjs` importer documents the conversion. It requires an existing Zola build in `public/` and refuses to overwrite `src/content/`. It is not part of the Astro build and should not be rerun over edited posts.

## Search, feeds, and indexing

Pagefind indexes the rendered article bodies locally after the Astro build. It ships a static index and client-side search UI; it does not call an external search provider. The search page links to the archive for visitors with JavaScript disabled.

Full-content Atom remains at `/atom.xml`, with tag feeds under `/tags/<tag>/atom.xml`. Article IDs retain their canonical URLs. `/sitemap.xml` remains a single sitemap rather than changing to a sitemap index.

Canonical metadata always points to `https://basetta.bz`. Netlify previews are deliberately excluded from indexing through page metadata and robots rules. Production crawling remains allowed; this does not itself guarantee search-engine indexing.

## Security and dependencies

- Astro generates CSP hashes for its scripts and styles.
- Scripts are limited to same-origin sources plus generated hashes. WebAssembly is enabled for Pagefind; arbitrary JavaScript eval is not.
- Inline **style attributes** are allowed for Shiki syntax highlighting and the search UI; inline scripts are not broadly allowed.
- Netlify sends `nosniff`, a strict-origin referrer policy, and `X-Frame-Options: DENY`.
- Dependency versions and transitive dependencies are recorded in `package-lock.json`; CI uses `npm ci`.
- The legacy automatic tabi update schedule is disabled. The old workflow remains available manually while Zola is retained for comparison.

## Before merging

1. Review the appearance on desktop and mobile. This is a new layout, not tabi design parity.
2. Review a real Netlify deploy preview, including its headers, image links, search, and `/blog/page/1/` redirect. Local tests do not run Netlify's edge infrastructure.
3. Check old content separately: several archived posts already reference missing `/images/posts/` and `/site_media/` files or external HTTP image hosts. Those references were preserved, not reconstructed. They can still be broken or blocked by mixed-content/CSP rules.
4. The sample project still describes tabi's demo features; decide whether to replace or remove it.
5. The sessionizer screenshot still contains the local username and work repository names. Decide whether to redact those before publishing it further.
6. After accepting the migration, remove the retained Zola source/config/theme and legacy workflow in a separate change. Until then, only `src/content/` is the active writing location.

The migration does not add unapproved tags, restore missing historical media, or claim compatibility with every unused tabi feature. It does not verify old inbound heading-fragment URLs or external links.
