import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parse as parseYaml } from 'yaml';

const baseline = JSON.parse(await readFile('tests/fixtures/zola-baseline.json', 'utf8'));
const output = route => path.join('dist', route.endsWith('/') ? `${route}index.html` : route);
const read = route => readFile(output(route), 'utf8');
const dom = async route => parseHTML(await read(route)).document;
const isPreview = ['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT ?? '');
const currentPosts = [];
for (const file of await readdir('src/content/blog')) {
  if (!file.endsWith('.md')) continue;
  const metadata = parseYaml((await readFile(`src/content/blog/${file}`, 'utf8')).split('---\n')[1]);
  if (!metadata.draft) currentPosts.push(`/blog/${metadata.slug}/`);
}

async function xml(route) {
  const text = await read(route);
  assert.equal(XMLValidator.validate(text), true, `${route} must be valid XML`);
  return new XMLParser({ ignoreAttributes: false }).parse(text);
}

test('all existing page, feed, sitemap and robots URLs still exist', async () => {
  for (const route of baseline.routes) await assert.doesNotReject(access(output(route)), route);
});

test('every imported page retains its title, date, approved tags and canonical URL', async () => {
  for (const entry of baseline.imported) {
    const document = await dom(entry.url);
    const markdown = await readFile(entry.target, 'utf8');
    const metadata = parseYaml(markdown.split('---\n')[1]);
    assert.equal(document.querySelector('h1').textContent, metadata.title);
    assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'), `https://basetta.bz${entry.url}`);
    if (entry.date) assert.ok(document.querySelector('time').getAttribute('datetime').startsWith(entry.date), entry.url);
    for (const tag of entry.tags) {
      const tagPath = `/tags/${encodeURIComponent(tag)}/`;
      assert.ok(document.querySelector(`a[href="${tagPath}"]`), `${entry.url} must retain ${tag}`);
      const tagPage = await dom(tagPath);
      assert.ok(tagPage.querySelector(`a[href="${entry.url}"]`), `${tagPath} must list ${entry.url}`);
    }
    assert.doesNotMatch(document.querySelector('.prose').textContent, /\{\{<|\{%|\[taxonomies\]/);
  }
});

test('pagination covers every blog post once', async () => {
  const links = [];
  for (let page = 1; page <= Math.ceil(currentPosts.length / 5); page++) {
    const document = await dom(page === 1 ? '/blog/' : `/blog/page/${page}/`);
    links.push(...[...document.querySelectorAll('.post-list h2 a')].map(a => a.getAttribute('href')));
  }
  assert.equal(new Set(links).size, links.length);
  assert.deepEqual(links.sort(), currentPosts.toSorted());
});

test('root and tag Atom feeds remain valid and contain full posts', async () => {
  for (const route of baseline.routes.filter(route => route.endsWith('atom.xml'))) {
    const { feed } = await xml(route);
    assert.ok(feed.title);
    assert.ok(feed.updated);
  }
  const { feed } = await xml('/atom.xml');
  assert.equal(feed.entry.length, currentPosts.length);
  const sessionizer = feed.entry.find(entry => entry.id === 'https://basetta.bz/blog/tmux-sessionizer/');
  assert.ok(sessionizer);
  const content = parseHTML(`<html><body>${sessionizer.content['#text']}</body></html>`).document;
  assert.ok(content.body.textContent.includes('canonical_path()'));
  assert.ok(sessionizer.content['#text'].includes('workspace-picker.png'));
});

test('sitemap keeps production URLs, excludes redirects and search', async () => {
  const { urlset } = await xml('/sitemap.xml');
  const urls = urlset.url.map(entry => entry.loc);
  for (const entry of baseline.imported) assert.ok(urls.includes(`https://basetta.bz${entry.url}`));
  assert.ok(urls.every(url => url.startsWith('https://basetta.bz/')));
  assert.ok(!urls.includes('https://basetta.bz/search/'));
  assert.ok(!urls.includes('https://basetta.bz/blog/page/1/'));
});

test('first-page redirect and preview indexing safeguards', async () => {
  assert.ok((await read('/blog/page/1/')).includes('/blog/'));
  const robots = await read('/robots.txt');
  if (isPreview) assert.match(robots, /Disallow: \/\n/);
  else assert.match(robots, /Sitemap: https:\/\/basetta.bz\/sitemap.xml/);
  for (const route of ['/', '/blog/', '/blog/tmux-sessionizer/']) {
    const document = await dom(route);
    const noindex = document.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex') ?? false;
    assert.equal(noindex, isPreview, route);
  }
});

test('colocated images stay at their original URLs with unchanged bytes', async () => {
  const assets = [
    ['content/blog/2026-10-30_tmux-sessionizer/workspace-picker.png', '/blog/tmux-sessionizer/workspace-picker.png'],
    ['content/blog/2025-09-12_back_to_blogging_keeping_basetta_up_to_date/retro_nvim_c_coding.png', '/blog/back-to-blogging-keeping-basetta-up-to-date/retro_nvim_c_coding.png'],
    ['content/blog/2006-08-26_pearl-jam-vienna/jacopo.jpg', '/blog/pearl-jam-vienna/jacopo.jpg'],
  ];
  for (const [source, route] of assets) assert.deepEqual(await readFile(output(route)), await readFile(source));
  const document = await dom('/blog/tmux-sessionizer/');
  assert.ok(document.querySelector('img[src="/blog/tmux-sessionizer/workspace-picker.png"]'));
});

test('code highlighting, CSP and generated search assets are present', async () => {
  const document = await dom('/blog/tmux-sessionizer/');
  assert.ok(document.querySelector('.prose pre code'));
  assert.ok(document.querySelector('meta[http-equiv="Content-Security-Policy" i]'));
  const text = [...document.querySelectorAll('pre code')].map(code => code.textContent).join('\n');
  assert.ok(text.includes('set -euo pipefail'));
  assert.ok(text.includes('tmux switch-client -c "$client" -t "$target"'));
  await access('dist/pagefind/pagefind.js');
  await access('dist/pagefind/pagefind-ui.js');
});
