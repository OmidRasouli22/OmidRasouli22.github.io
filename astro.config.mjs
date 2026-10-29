// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { unified, rehypeHeadingIds } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkMathFlag } from './src/plugins/remark-math-flag.mjs';
import { rehypeHeadingAnchors } from './src/plugins/rehype-heading-anchors.mjs';
import { rehypeTaskListLabels } from './src/plugins/rehype-task-list-labels.mjs';
import { rehypeCodeFrame } from './src/plugins/rehype-code-frame.mjs';
import { rehypeMathBlock } from './src/plugins/rehype-math-block.mjs';
import { transformerCodeTitle } from './src/plugins/shiki-code-title.mjs';
import { transformerMetaHighlight, transformerNotationDiff, transformerNotationHighlight } from '@shikijs/transformers';
import { SITE } from './src/config.ts';

export default defineConfig({
  site: SITE.url,
  trailingSlash: 'ignore',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  markdown: {
    // Astro 7 defaults to the native Sätteri processor; the unified pipeline
    // keeps remark/rehype plugins (KaTeX, heading anchors) working.
    processor: unified({
      remarkPlugins: [remarkMath, remarkMathFlag],
      rehypePlugins: [rehypeHeadingIds, rehypeHeadingAnchors, rehypeTaskListLabels, rehypeCodeFrame, rehypeKatex, rehypeMathBlock],
    }),
    shikiConfig: {
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
      defaultColor: false,
      wrap: false,
      // ```py title="train.py" {3-5}   → file name in the header, lines 3–5 highlighted
      // `// [!code ++]` / `// [!code --]` / `// [!code highlight]` comments mark diff and highlight lines
      transformers: [
        transformerCodeTitle(),
        transformerMetaHighlight(),
        transformerNotationHighlight({ matchAlgorithm: 'v3' }),
        transformerNotationDiff({ matchAlgorithm: 'v3' }),
      ],
    },
  },
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // transformers.js imports the WebGPU build of ONNX Runtime (28 MB of WASM). Semantic search
        // only needs the plain WASM build (14 MB), so swap it in.
        'onnxruntime-web/webgpu': 'onnxruntime-web/wasm',
      },
    },
    worker: {
      format: 'es',
    },
  },
});
