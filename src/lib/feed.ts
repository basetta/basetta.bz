import { site } from '../site';
import { description, entryUrl, type Entry } from './content';

export function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
}

export function atomFeed(entries: Entry[], feedPath = '/atom.xml', title = site.title) {
  const dated = entries.filter(entry => entry.data.date);
  const updated = new Date(Math.max(0, ...dated.map(entry => (entry.data.updated ?? entry.data.date!).getTime()))).toISOString();
  const feedUrl = new URL(feedPath, site.url).href;
  return new Response(`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
<title>${escapeXml(title)}</title>
<id>${escapeXml(feedUrl)}</id>
<link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml"/>
<link href="${site.url}/"/>
<updated>${updated}</updated>
<author><name>${escapeXml(site.author)}</name></author>
${dated.map(entry => {
    const url = new URL(entryUrl(entry), site.url).href;
    return `<entry>
<title>${escapeXml(entry.data.title)}</title>
<id>${escapeXml(url)}</id>
<link href="${escapeXml(url)}"/>
<published>${entry.data.date!.toISOString()}</published>
<updated>${(entry.data.updated ?? entry.data.date!).toISOString()}</updated>
<summary>${escapeXml(description(entry))}</summary>
<content type="html" xml:base="${escapeXml(url)}">${escapeXml(entry.rendered?.html ?? '')}</content>
${entry.data.tags.map(tag => `<category term="${escapeXml(tag)}"/>`).join('\n')}
</entry>`;
  }).join('\n')}
</feed>`, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
}
