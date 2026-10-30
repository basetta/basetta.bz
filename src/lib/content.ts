import { getCollection, type CollectionEntry } from 'astro:content';

export type Entry = CollectionEntry<'blog'> | CollectionEntry<'projects'>;

export async function posts() {
  return (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.slug.localeCompare(b.data.slug));
}

export async function projects() {
  return (await getCollection('projects', ({ data }) => !data.draft))
    .sort((a, b) => a.data.weight - b.data.weight || a.data.slug.localeCompare(b.data.slug));
}

export function entryUrl(entry: Entry) {
  return `/${entry.collection}/${entry.data.slug}/`;
}

export function tagUrl(tag: string) {
  return `/tags/${encodeURIComponent(tag)}/`;
}

export async function taggedEntries() {
  const entries: Entry[] = [...await posts(), ...await projects()];
  const tags = [...new Set(entries.flatMap(entry => entry.data.tags))].sort();
  return tags.map(tag => ({ tag, entries: entries.filter(entry => entry.data.tags.includes(tag)) }));
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function description(entry: Entry) {
  if (entry.data.description) return entry.data.description;
  const text = (entry.body ?? '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 180 ? text.slice(0, 177).trimEnd() + '…' : text || entry.data.title;
}
