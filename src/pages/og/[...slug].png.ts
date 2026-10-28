import type { APIRoute, GetStaticPaths } from 'astro';
import { SITE } from '@/config';
import { renderOgImage, type OgOptions } from '@/lib/og';
import { formatDate, getPosts, getProjects } from '@/lib/posts';

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  const projects = await getProjects();
  return [
    {
      params: { slug: 'default' },
      props: { title: SITE.tagline, kicker: SITE.eyebrow.toUpperCase() } satisfies OgOptions,
    },
    ...posts.map((post) => ({
      params: { slug: `blog/${post.id}` },
      props: {
        title: post.data.title,
        kicker: [formatDate(post.data.pubDate), ...post.data.tags.slice(0, 2).map((t) => `#${t}`)].join('  ·  '),
        subtitle: post.data.description,
      } satisfies OgOptions,
    })),
    ...projects.map((project) => ({
      params: { slug: `projects/${project.id}` },
      props: { title: project.data.title, kicker: 'PROJECT', subtitle: project.data.description } satisfies OgOptions,
    })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(await renderOgImage(props as OgOptions), {
    headers: { 'Content-Type': 'image/png' },
  });
