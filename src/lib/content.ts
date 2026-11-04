import { getCollection, type CollectionEntry } from 'astro:content';

export type Entry = CollectionEntry<'blog'> | CollectionEntry<'projects'>;

export async function posts() {
  return (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.slug.localeCompare(b.data.slug));
}

export async function projects({ includeUnlisted = false } = {}) {
  return (await getCollection('projects', ({ data }) => !data.draft && (includeUnlisted || !data.unlisted)))
    .sort((a, b) => a.data.weight - b.data.weight || a.data.slug.localeCompare(b.data.slug));
}

// Prefer specific shared topics over broad tags, then newer posts. Never
// suggest drafts or the current article, and don't pad with unrelated posts.
export function relatedPosts(entry: Entry, candidates: CollectionEntry<'blog'>[], limit = 2) {
  const frequency = new Map<string, number>();
  for (const candidate of candidates) {
    for (const tag of new Set(candidate.data.tags)) frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
  }
  return candidates
    .filter(candidate => !candidate.data.draft && !(entry.collection === 'blog' && candidate.id === entry.id))
    .map(candidate => ({
      entry: candidate,
      score: [...new Set(candidate.data.tags)]
        .filter(tag => entry.data.tags.includes(tag))
        .reduce((score, tag) => score + 1 / frequency.get(tag)!, 0),
    }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.data.date.getTime() - a.entry.data.date.getTime() || a.entry.data.slug.localeCompare(b.entry.data.slug))
    .slice(0, Math.max(0, limit))
    .map(candidate => candidate.entry);
}

export function entryUrl(entry: Entry) {
  return `/${entry.collection}/${entry.data.slug}/`;
}

export function tagUrl(tag: string) {
  return `/tags/${encodeURIComponent(tag)}/`;
}

export async function taggedEntries() {
  // Keep historical tag pages and feeds even when their last project is unlisted.
  const entries: Entry[] = [...await posts(), ...await projects({ includeUnlisted: true })];
  const tags = [...new Set(entries.flatMap(entry => entry.data.tags))].sort();
  const listed = entries.filter(entry => entry.collection !== 'projects' || !entry.data.unlisted);
  return tags.map(tag => ({ tag, entries: listed.filter(entry => entry.data.tags.includes(tag)) }));
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
