import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export type Project = CollectionEntry<'projects'>;

/** Published posts, newest first. Drafts are only included in dev. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getProjects(): Promise<Project[]> {
  const projects = await getCollection('projects');
  return projects.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

export const postUrl = (post: Post) => `/blog/${post.id}/`;
export const projectUrl = (project: Project) => `/projects/${project.id}/`;
export const tagUrl = (tag: string) => `/tags/${slugify(tag)}/`;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Estimated reading time in minutes, ignoring MDX imports and JSX tags. */
export function readingTime(body = ''): number {
  const text = body
    .replace(/^(import|export) .*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>[\]()$|-]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function formatDate(date: Date, style: 'short' | 'long' = 'short'): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export interface TagInfo {
  name: string;
  slug: string;
  count: number;
}

/** All tags with post counts, most used first. */
export function getTags(posts: Post[]): TagInfo[] {
  const tags = new Map<string, TagInfo>();
  for (const post of posts) {
    for (const name of post.data.tags) {
      const slug = slugify(name);
      const tag = tags.get(slug) ?? { name, slug, count: 0 };
      tag.count += 1;
      tags.set(slug, tag);
    }
  }
  return [...tags.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Posts sharing the most tags with `post`, newest first on ties. */
export function getRelatedPosts(post: Post, posts: Post[], limit = 3): Post[] {
  const tags = new Set(post.data.tags.map(slugify));
  return posts
    .filter((other) => other.id !== post.id)
    .map((other) => ({ other, score: other.data.tags.filter((t) => tags.has(slugify(t))).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.other.data.pubDate.valueOf() - a.other.data.pubDate.valueOf())
    .slice(0, limit)
    .map(({ other }) => other);
}
