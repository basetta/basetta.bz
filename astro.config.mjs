import { defineConfig } from 'astro/config';
import sagePresentation from './src/integrations/sage.ts';
import sageConfig from './sage.config.ts';

export default defineConfig({
  site: 'https://basetta.bz',
  output: 'static',
  trailingSlash: 'always',
  // `public/` is the retained Zola build output, not an Astro input.
  publicDir: './static',
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' https: data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'frame-src https://player.vimeo.com https://www.youtube-nocookie.com',
      ],
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] },
      // Expressive Code and the search UI use inline style attributes.
      styleDirective: { resources: [
        { resource: "'self'", kind: 'element' },
        { resource: "'unsafe-inline'", kind: 'attribute' },
      ] },
    },
  },
  markdown: { syntaxHighlight: false }, // Expressive Code handles highlighting.
  integrations: [sagePresentation(sageConfig)],
  redirects: {
    '/blog/page/1/': '/blog/',
  },
});
