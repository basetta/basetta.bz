import type { APIRoute } from 'astro';
import { isPreview, site } from '../site';
export const GET: APIRoute = () => new Response(isPreview
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`,
{ headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
