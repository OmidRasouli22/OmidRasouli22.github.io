import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  // Files starting with "_" are ignored, handy for templates.
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().max(120),
        description: z.string().max(220),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        tags: z.array(z.string()).default([]),
        /** Drafts are visible in `npm run dev` but never built for production. */
        draft: z.boolean().default(false),
        cover: image().optional(),
        coverAlt: z.string().optional(),
      })
      .refine((post) => !post.cover || post.coverAlt, {
        message: '`coverAlt` is required when `cover` is set',
        path: ['coverAlt'],
      })
      // `title: 'Notes on *TabPFN*'` sets that word in the serif on the post page. Everywhere else
      // (meta tags, RSS, search, lists) `title` is the plain text and `displayTitle` keeps the marks.
      .transform((post) => ({ ...post, displayTitle: post.title, title: post.title.replace(/\*/g, '') })),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(240),
      status: z.enum(['completed', 'in-progress', 'planned']),
      stack: z.array(z.string()).default([]),
      repo: z.url().optional(),
      demo: z.url().optional(),
      /** Shown on the home page. */
      featured: z.boolean().default(false),
      /** Lower numbers are listed first. */
      order: z.number().default(100),
      context: z.string().optional(),
      period: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
    }),
});

export const collections = { blog, projects };
