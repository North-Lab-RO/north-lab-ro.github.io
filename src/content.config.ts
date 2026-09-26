import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  // One folder per language (en/, ro/). Files starting with "_" (like _template.mdx) are never loaded.
  loader: glob({ base: './src/content/projects', pattern: '{en,ro}/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      category: z.string(),
      tagline: z.string(),
      summary: z.string(),
      order: z.number(),
      draft: z.boolean().default(false),
      accent: z.enum(['ice', 'aurora', 'ember', 'violet', 'indigo']).default('ice'),
      scene: z.enum(['none', 'globe', 'board', 'radar', 'ledger', 'graph']).default('none'),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      logo: image().optional(),
      metrics: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .default([]),
      features: z
        .array(z.object({ title: z.string(), body: z.string() }))
        .default([]),
      stack: z.array(z.string()).default([]),
      gallery: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
            caption: z.string().optional(),
          }),
        )
        .default([]),
      reports: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            // File name inside public/reports/. Leave empty for a placeholder slot.
            file: z.string().optional(),
            // Optional first-page preview image, also inside public/reports/.
            preview: z.string().optional(),
          }),
        )
        .default([]),
      repo: z
        .object({
          visibility: z.enum(['private', 'public']).default('private'),
          url: z.url().optional(),
        })
        .default({ visibility: 'private' }),
      credits: z.string().optional(),
      // ── Sales block (shown first on the project page) ──
      promise: z.string().optional(),
      audienceShort: z.array(z.string()).default([]),
      outcomes: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
      audiences: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
      tour: z.enum(['none', 'counselor', 'athena', 'cases', 'atc', 'banky']).default('none'),
      capabilities: z.array(z.object({ group: z.string(), items: z.array(z.string()) })).default([]),
      requirements: z.array(z.string()).default([]),
      tailoring: z.array(z.string()).default([]),
      /** Planned features, shown as "Coming soon"; never describe them as available. */
      roadmap: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
      note: z.string().optional(),
    }),
});

export const collections = { projects };
