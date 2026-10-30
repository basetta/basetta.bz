import type { APIRoute } from 'astro';
import { posts, projects, taggedEntries, entryUrl, tagUrl } from '../lib/content';
import { escapeXml } from '../lib/feed';
import { site, pageSize } from '../site';

export const GET: APIRoute = async () => {
  const blog = await posts();
  const entries = [...blog, ...await projects()];
  const pages = ['/', '/blog/', '/archive/', '/tags/', '/projects/', '/bookcase/',
    ...Array.from({ length: Math.max(0, Math.ceil(blog.length / pageSize) - 1) }, (_, i) => `/blog/page/${i + 2}/`),
    ...(await taggedEntries()).map(({ tag }) => tagUrl(tag)),
  ].map(url => ({ url, updated: undefined as Date | undefined }));
  pages.push(...entries.map(entry => ({ url: entryUrl(entry), updated: entry.data.updated ?? entry.data.date })));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ url, updated }) => `<url><loc>${escapeXml(new URL(url, site.url).href)}</loc>${updated ? `<lastmod>${updated.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
