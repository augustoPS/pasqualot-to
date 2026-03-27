import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const albums = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/albums' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    location: z.string().optional(),
    description: z.string().optional(),
    cover: z.string(),
    photos: z.array(
      z.object({
        file: z.string(),
        alt: z.string(),
      })
    ),
    password: z.string().optional(),
    previewCount: z.number().default(5),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().optional(),
    year: z.number(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { albums, blog, notes, projects };
