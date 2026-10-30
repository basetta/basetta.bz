import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const fields = {
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().default(false),
  tags: z.array(z.string().min(1)).default([]),
  updated: z.coerce.date().optional(),
};

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
    schema: z.object({ ...fields, date: z.coerce.date() }),
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
    schema: z.object({ ...fields, date: z.coerce.date().optional(), weight: z.number().default(0) }),
  }),
};
