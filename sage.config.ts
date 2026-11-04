import { defineSageConfig } from 'astro-sage';
import { site, pageSize } from './src/site.ts';

export default defineSageConfig({
  site: { ...site, lang: 'en', timezone: 'UTC', ogImage: 'img/profile.webp' },
  typography: { serif: 'newsreader' },
  posts: { perPage: pageSize, perIndex: pageSize },
  features: { dynamicOgImage: false },
  comments: { provider: false },
  citation: { enabled: false },
});
