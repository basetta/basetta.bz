# basetta.bz

Patrick Martini's personal blog, built as a static site with **Astro 7**, styled with **[AstroSage](https://github.com/chintak/astro-sage)**, and deployed on Netlify.

## Local development

Use Node.js **24.13.0** (pinned in `mise.toml` and `.nvmrc`), matching Netlify and CI.

With [mise](https://mise.jdx.dev/):

```sh
mise trust
mise install
mise run setup
mise run dev
```

Use `mise run preview` to build and preview the full site, including search.
`mise run verify` runs the type checks, build, and regression tests.

Alternatively, with Node already installed:

```sh
npm ci
npm run dev
```

Open the URL printed by Astro, normally <http://localhost:4321>.

To build and preview the production site, including search:

```sh
npm run build
npm run preview
```

Pagefind generates the search index after the Astro build. Search is not available in the development server.

## Add a post

Create `src/content/blog/my-post.md` with YAML front matter:

```markdown
---
title: My new post
slug: my-post
date: 2026-10-30
description: A short description for listings and search engines.
draft: false
tags:
  - tech
---

Write the article here.
```

The URL is `/blog/my-post/`. Keep `slug` unchanged after publication to preserve links. Dates are interpreted and displayed in UTC. Set `draft: true` to exclude a post from the site, feeds, sitemap, and search.

Posts are listed newest first. Include a time in `date` (for example, `2026-10-30T11:00:00Z`) to control the order of posts published on the same day. Identical timestamps are sorted by slug.

For images, place files in `static/blog/my-post/` and reference their public path:

```markdown
![Description of the image](/blog/my-post/screenshot.png)
```

Use regular Markdown, not Zola/Tera shortcodes. Existing tags are in `src/content/blog/`; agree on new tags before expanding the taxonomy.

## Theme

AstroSage **0.1.5** supplies the Newsreader reading font, JetBrains Mono UI font, warm light/dark palette, prose styles, Expressive Code blocks, and responsive table of contents. Fonts are self-hosted; no browser request to a font service is needed.

This uses the npm integration, **not the demo starter**. `src/integrations/sage.ts` keeps its rendering setup but suppresses its injected routes and sitemap integration. Our existing page files retain `/blog/`, `/archive/`, projects, approved tags, Atom feeds, and preview indexing rules. Keep writing with this repository's `date`/`slug` front matter in `src/content/blog/`; do not switch to the upstream demo's `posts` collection or `pubDatetime` schema.

- Change the serif font in `sage.config.ts` (`newsreader`, `source-serif-4`, or `literata`).
- Change site chrome and listing styles in `src/styles/global.css`. Article typography and code colours come from the package.
- The upstream starter's series, comments, citations, generated social cards, and cross-post wiki-links are not wired into these retained routes. Enabling a config flag alone does not add them; use ordinary Markdown links.
- Atom feeds strip theme scripts and controls, and retain code as plain preformatted text.

When upgrading AstroSage, review the small integration adapter and run both regression and browser tests. The route-suppression adapter depends on the package's setup hook, rather than a public route-prefix option.

### Dependency advisories

At installation, `npm audit` reports five affected packages stemming from two advisories: [KaTeX prototype-pollution trust bypass](https://github.com/advisories/GHSA-238p-pmpm-9mq7) in the Mermaid dependency chain and [Satori SVG escaping](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp). The theme pins ranges that currently retain the affected dependencies. Generated social-card routes are not enabled, and current posts contain no Mermaid/Excalidraw diagrams. This limits their use here but does not make the advisories resolved. Recheck upstream before enabling those features; no forced dependency overrides are applied.

## Checks

```sh
npm run verify
npx playwright install chromium
npm run test:browser
```

`verify` runs Astro's type checks, the production build, search indexing, and output regression tests. Browser tests cover search under CSP, image loading, theme persistence, code copying, the mobile/desktop table of contents, mobile overflow, and navigation without JavaScript.

To check Netlify deploy-preview indexing rules locally:

```sh
CONTEXT=deploy-preview npm run build
CONTEXT=deploy-preview npm test
npm run build # Restore the normal production output.
```

## Deployment

Netlify configuration is in `netlify.toml`:

- Build: `npm run build`
- Publish: `dist`
- Runtime: Node.js 24.13.0
- No server-side rendering or Netlify adapter required.

Production canonical URLs and feeds use `https://basetta.bz`. Internal navigation uses relative-to-site paths, so previews remain on their own host. Deploy previews and branch deployments receive `noindex` metadata and a disallow-all `robots.txt`.

The existing `/atom.xml`, tag feeds, `/sitemap.xml`, and blog pagination URLs are preserved. `/blog/page/1/` redirects to `/blog/`.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/content/blog/` | Active Markdown posts |
| `src/content/projects/` | Active project pages |
| `src/content.config.ts` | Validated content schemas |
| `src/pages/` | Static routes, feeds, robots, and sitemap |
| `src/layouts/`, `src/components/` | Astro templates |
| `src/styles/global.css` | Site chrome and listing styles over AstroSage's design tokens |
| `sage.config.ts` | Theme typography and integration configuration |
| `src/integrations/sage.ts` | Theme adapter retaining the site's routes and sitemap |
| `src/site.ts` | Site metadata and pagination size |
| `static/` | Public files copied unchanged to `dist/` |
| `tests/` | Migration regression and browser tests |
| `dist/` | Generated Astro output (ignored) |

## Zola migration status

This is the first Astro migration pass, not a pixel-for-pixel port of tabi. See [the migration notes](docs/astro-migration.md) for preserved behavior and remaining review items.

`content/`, `config.toml`, and `themes/tabi/` are retained **only as the legacy Zola reference**. Edit `src/content/` for all new work. Astro does not read the old content or the generated Zola `public/` directory.
