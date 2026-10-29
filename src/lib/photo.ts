import type { ImageMetadata } from 'astro';

/** Optional portrait: drop it at src/assets/about/photo.(jpg|png|webp) and it is used everywhere. */
export const photo = Object.values(
  import.meta.glob<{ default: ImageMetadata }>('/src/assets/about/photo.{jpg,jpeg,png,webp,avif}', { eager: true }),
)[0]?.default;
