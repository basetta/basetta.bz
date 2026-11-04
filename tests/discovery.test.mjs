import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { parse } from 'yaml';

const dom = async route => parseHTML(await readFile(`dist${route}index.html`, 'utf8')).document;
const posts = [];
for (const file of await readdir('src/content/blog')) {
  if (!file.endsWith('.md')) continue;
  const data = parse((await readFile(`src/content/blog/${file}`, 'utf8')).split('---\n')[1]);
  if (!data.draft) posts.push(data);
}
const url = post => `/blog/${post.slug}/`;
const newestFirst = (a, b) => new Date(b.date) - new Date(a.date) || a.slug.localeCompare(b.slug);

test('homepage introduces the author and separates selected writing from recent posts', async () => {
  const document = await dom('/');
  assert.match(document.querySelector('h1').textContent, /Patrick.*Basetta/);
  assert.match(document.querySelector('meta[name="description"]').content, /developer tools/);
  const selected = document.querySelector('[aria-labelledby="selected-heading"]');
  const links = [...selected.querySelectorAll('.post-list h3 a')].map(link => link.getAttribute('href'));
  assert.equal(links.length, 3);
  assert.deepEqual(links, posts.filter(post => post.featured).sort(newestFirst).map(url));
  const latest = [...document.querySelectorAll('#latest-posts .post-list h3 a')].map(link => link.getAttribute('href'));
  assert.deepEqual(latest, posts.toSorted(newestFirst).slice(0, 5).map(url));
  assert.ok(document.querySelector('.intro a[href="/atom.xml"]'));
  assert.equal(document.querySelector('nav a[href="/projects/"]'), null);
});

test('related reading is relevant, bounded, and excluded from search content', async () => {
  for (const post of posts) {
    const document = await dom(url(post));
    const footer = document.querySelector('.post-footer');
    assert.ok(footer, post.slug);
    assert.ok(footer.hasAttribute('data-pagefind-ignore'));
    assert.ok(footer.querySelector('a[href="/atom.xml"]'));
    const links = [...footer.querySelectorAll('.post-list h3 a')].map(link => link.getAttribute('href'));
    assert.ok(links.length <= 2);
    assert.equal(new Set(links).size, links.length);
    assert.ok(!links.includes(url(post)));
    for (const href of links) {
      const related = posts.find(candidate => url(candidate) === href);
      assert.ok(related, `${href} must be a published post`);
      assert.ok(related.tags?.some(tag => post.tags?.includes(tag)), `${href} must share a tag with ${post.slug}`);
    }
    if (!post.tags?.length) assert.equal(links.length, 0);
  }
  const sessionizer = await dom('/blog/tmux-sessionizer/');
  assert.equal(sessionizer.querySelector('.post-footer .post-list a').getAttribute('href'), '/blog/tmux-not-a-terminal/');
});

test('the demo project remains accessible but is not promoted or indexed', async () => {
  const route = '/projects/cool-project/';
  const document = await dom(route);
  assert.match(document.querySelector('h1').textContent, /Hello World Project/);
  assert.match(document.querySelector('meta[name="robots"]').content, /noindex/);
  assert.ok(document.querySelector('article[data-pagefind-ignore]'));
  assert.equal(document.querySelector('[data-pagefind-body]'), null);
  for (const listing of ['/projects/', '/tags/meta/']) {
    assert.equal((await dom(listing)).querySelector(`.post-list a[href="${route}"]`), null);
  }
  assert.doesNotMatch(await readFile('dist/sitemap.xml', 'utf8'), /projects\/cool-project/);
  assert.doesNotMatch(await readFile('dist/tags/meta/atom.xml', 'utf8'), /projects\/cool-project/);
});
