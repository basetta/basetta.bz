// One-time importer. Run `zola build` first. Never run over edited Astro posts.
import { readdir, readFile, mkdir, writeFile, cp, access } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'smol-toml';
import { stringify } from 'yaml';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const location = path.join(directory, entry.name);
    return entry.isDirectory() ? files(location) : [location];
  }));
  return nested.flat().sort();
}

function slugify(value) {
  return value.toLowerCase().replaceAll('_', '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

async function mustNotExist(location) {
  try {
    await access(location);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`Refusing to overwrite ${location}`);
}

await mustNotExist('src/content');
const baselineFiles = await files('public');
const routes = baselineFiles.filter(file => /(?:index\.html|atom\.xml|sitemap\.xml|robots\.txt|404\.html)$/.test(file))
  .map(file => file.slice('public'.length).replace(/index\.html$/, ''));
const imported = [];

for (const collection of ['blog', 'projects']) {
  const allFiles = await files(`content/${collection}`);
  for (const source of allFiles.filter(file => file.endsWith('.md') && !file.endsWith('/_index.md'))) {
    const original = await readFile(source, 'utf8');
    const match = original.match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n([\s\S]*)$/);
    if (!match) throw new Error(`Missing TOML front matter: ${source}`);
    const data = parse(match[1]);
    const basename = path.basename(source) === 'index.md' ? path.basename(path.dirname(source)) : path.basename(source, '.md');
    const datePrefix = basename.match(/^(\d{4}-\d{2}-\d{2})_/);
    const slug = data.slug ?? slugify(basename.replace(/^\d{4}-\d{2}-\d{2}_/, ''));
    const url = `/${collection}/${slug}/`;
    if (!routes.includes(url)) throw new Error(`URL differs from Zola: ${source} => ${url}`);
    const date = data.date ? new Date(data.date).toISOString().slice(0, 10) : datePrefix?.[1];
    if (collection === 'blog' && !date) throw new Error(`Missing post date: ${source}`);
    const metadata = {
      title: data.title.trim(),
      slug,
      ...(date && { date }),
      ...(data.updated && { updated: new Date(data.updated).toISOString().slice(0, 10) }),
      ...(data.description && { description: data.description }),
      draft: data.draft ?? false,
      tags: data.taxonomies?.tags ?? [],
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.extra?.local_image && { image: `/${data.extra.local_image}` }),
    };
    let body = match[2];
    // Convert the sole active Tera component to portable Markdown.
    body = body.replace(/\{\{< admonition type="tip" text="([^"]*)" \/>\}\}/g, '> **Tip:** $1');
    body = body.replace(/\{\.centered-text\}/g, '');
    if (/\{\{|\{%/.test(body)) throw new Error(`Unconverted template syntax in ${source}`);
    if (path.basename(source) === 'index.md') {
      const directory = path.dirname(source);
      for (const asset of await files(directory)) {
        if (asset.endsWith('.md')) continue;
        const relative = path.relative(directory, asset);
        const destination = `static${url}${relative}`;
        await mkdir(path.dirname(destination), { recursive: true });
        await cp(asset, destination);
        body = body.replaceAll(`](${relative})`, `](${url}${relative})`)
          .replaceAll(`](./${relative})`, `](${url}${relative})`);
      }
    }
    // Site-root URLs preserve the existing asset address and work in Atom too.
    const target = `src/content/${collection}/${slug}.md`;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `---\n${stringify(metadata)}---\n${body}`);
    imported.push({ source, target, url, date, tags: metadata.tags });
  }
}
await mkdir('static/blog', { recursive: true });
await cp('content/blog/generated-image.png', 'static/blog/generated-image.png');
await mkdir('tests/fixtures', { recursive: true });
await writeFile('tests/fixtures/zola-baseline.json', JSON.stringify({ routes, imported }, null, 2) + '\n');
console.log(`Imported ${imported.length} pages; captured ${routes.length} existing routes.`);
