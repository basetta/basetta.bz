import astroSage, { type SageConfig } from 'astro-sage';
import type { AstroIntegration } from 'astro';

/** Use Sage's rendering and design system without replacing existing URLs. */
export default function sagePresentation(config: SageConfig): AstroIntegration {
  const integration = astroSage(config);
  const setup = integration.hooks['astro:config:setup'];
  if (!setup) throw new Error('AstroSage no longer exposes its setup hook; review the adapter.');

  return {
    ...integration,
    hooks: {
      ...integration.hooks,
      'astro:config:setup': options => setup({
        ...options,
        // Sage 0.1.x hard-codes /posts/ and its own content collections.
        // Our page files retain /blog/, projects, tags, Atom, and preview rules.
        injectRoute: () => {},
        updateConfig: update => options.updateConfig({
          ...update,
          // Keep the existing single /sitemap.xml and its exclusion rules.
          integrations: update.integrations?.filter(item => item && item.name !== '@astrojs/sitemap'),
        }),
      }),
    },
  };
}
