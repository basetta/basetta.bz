# basetta.bz

Patrick Martini's personal blog, built as a static site with **Astro 7** and deployed on Netlify.

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

For images, place files in `static/blog/my-post/` and reference their public path:

```markdown
![Description of the image](/blog/my-post/screenshot.png)
```

Use regular Markdown, not Zola/Tera shortcodes. Existing tags are in `src/content/blog/`; agree on new tags before expanding the taxonomy.

## Checks

```sh
npm run verify
npx playwright install chromium
npm run test:browser
```

`verify` runs Astro's type checks, the production build, search indexing, and output regression tests. Browser tests cover search under CSP, image loading, theme persistence, mobile overflow, and navigation without JavaScript.

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
| `src/styles/global.css` | Responsive light/dark design |
| `src/site.ts` | Site metadata and pagination size |
| `static/` | Public files copied unchanged to `dist/` |
| `tests/` | Migration regression and browser tests |
| `dist/` | Generated Astro output (ignored) |

## Zola migration status

This is the first Astro migration pass, not a pixel-for-pixel port of tabi. See [the migration notes](docs/astro-migration.md) for preserved behavior and remaining review items.

`content/`, `config.toml`, and `themes/tabi/` are retained **only as the legacy Zola reference**. Edit `src/content/` for all new work. Astro does not read the old content or the generated Zola `public/` directory.
