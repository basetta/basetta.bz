---
title: "Same Blog, New Engine: Switching to Astro"
slug: switching-to-astro
date: 2026-10-30
description: Why basetta.bz moved from Zola to Astro, what the migration involved, and why the blog is still a static site on Netlify.
draft: false
tags:
  - tech
  - blogging
---

Basetta.bz now runs on [Astro](https://astro.build/).

The posts are still Markdown. The site is still hosted on Netlify. The old links should still take you to the same articles. But behind the pages, Zola and the tabi theme have given way to Astro and a small custom layout.

This wasn't a case of the blog outgrowing its static site generator. It started with a broken build—and turned into an opportunity to try a different way of building the site.

## A build error started the conversation

A tabi update introduced templates that the configured Zola version couldn't parse. Fixing that meant bringing the generator and theme into agreement, updating the syntax-highlighting configuration, and dealing with some old content syntax along the way.

That last part was a reminder of how long this blog has been around. There were still Octopress tags sitting in archived posts.

We got the Zola build working again. That's worth saying explicitly: **switching to Astro wasn't necessary to fix the deployment**. Zola remains a good option for a Markdown blog, especially if you appreciate having a single binary instead of a JavaScript dependency tree.

But the troubleshooting led to a broader question: what would the site look like with a different foundation?

## Different templates, still a static site

Astro's component model is the main change. Layouts are now HTML-like `.astro` components rather than Tera templates, and the design is a small implementation of its own rather than a port of tabi.

That gives me a different starting point for changing the site: ordinary HTML, CSS, and components I can work on directly. If a future post needs an interactive example, Astro also provides a way to add one without making the whole page a client-side application.

For now, the setup is deliberately straightforward:

- Markdown for articles.
- Astro components for pages and layouts.
- Static HTML served by Netlify.
- A little browser JavaScript for search, theme switching, and copying code.

There is no React application, database, or Node.js server running behind each request. Node is part of the build process; visitors receive the generated site.

## Keep the links, not just the words

Moving the article text was only part of the migration. Keeping the existing addresses mattered just as much.

The first import brought across **61 blog posts and one project page**. The front matter changed from TOML to YAML, and each article received an explicit slug. Dates that had previously come from filenames became explicit metadata too.

The compatibility checks covered **113 existing routes**, including article pages, pagination, tags, feeds, the sitemap, and robots.txt. Images stored alongside posts kept their public URLs.

The [Atom feed](/atom.xml) is still at the same address, with full article content and the same article IDs. Tag feeds are still available too. If you already subscribe, there shouldn't be anything to change.

This wasn't an attempt to repair the entire archive. Some old articles reference missing images or external sites that may no longer exist. Changing generators doesn't magically recover those files, and I didn't want to confuse migration work with rewriting the past.

## Search stays local

Search now uses [Pagefind](https://pagefind.app/). After Astro builds the pages, Pagefind reads the rendered articles and generates a static search index.

Searching doesn't send the query to an external search service. The browser loads the index from this site.

That does introduce one small difference when working locally: the development server doesn't have the finished search index. To check the complete site, I build it and run the preview:

```sh
npm run build
npm run preview
```

There is also a mise configuration that pins the Node version and wraps the common commands. `mise run preview` builds the site before opening the preview server.

## The trade-off is real

Astro is not a free upgrade in every direction. Zola's single-binary setup is simpler to install and has fewer dependencies to maintain. This version of the site has npm packages, a lockfile, and a build pipeline to keep current.

In return, it has a component-based foundation and a layout that can evolve independently of a Zola theme.

I haven't benchmarked the two versions, so this isn't a claim that the blog is now dramatically faster. The checks were more practical: do the old routes still exist, do the feeds contain the posts, does search work, do images load, and can someone still navigate the site without JavaScript?

Those checks now have automated coverage, including browser tests for the interactive pieces and narrow screen layouts.

## Back to the posts

When I wrote about [returning to blogging](/blog/back-to-blogging-keeping-basetta-up-to-date/), the point was to keep sharing technical experiments and things learned along the way.

The generator is supporting machinery for that. This time, changing it became one of the experiments worth documenting.

Same domain. Same archive. A different engine underneath.
