import { defineConfig } from 'astro/config';

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
      // Shiki and the search UI use inline style attributes, not inline scripts.
      styleDirective: { resources: [
        { resource: "'self'", kind: 'element' },
        { resource: "'unsafe-inline'", kind: 'attribute' },
      ] },
    },
  },
  markdown: {
    shikiConfig: {
      theme: 'catppuccin-frappe',
      wrap: false,
    },
  },
  redirects: {
    '/blog/page/1/': '/blog/',
  },
});
