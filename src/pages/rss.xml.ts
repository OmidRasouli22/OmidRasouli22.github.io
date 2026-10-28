import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '@/config';
import { getPosts, postUrl } from '@/lib/posts';

export const GET: APIRoute = async (context) => {
  const posts = await getPosts();
  return rss({
    title: `${SITE.title} — Blog`,
    description: SITE.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postUrl(post),
      categories: post.data.tags,
    })),
    customData: `<language>en</language>`,
  });
};
