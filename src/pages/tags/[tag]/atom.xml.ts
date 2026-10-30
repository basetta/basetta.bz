import type { APIRoute } from 'astro';
import { taggedEntries, tagUrl, type Entry } from '../../../lib/content';
import { atomFeed } from '../../../lib/feed';
import { site } from '../../../site';

export async function getStaticPaths() {
  return (await taggedEntries()).map(({ tag, entries }) => ({ params: { tag }, props: { tag, entries } }));
}

export const GET: APIRoute = ({ props }) => {
  const { tag, entries } = props as { tag: string; entries: Entry[] };
  return atomFeed(entries, `${tagUrl(tag)}atom.xml`, `${site.title} · ${tag}`);
};
