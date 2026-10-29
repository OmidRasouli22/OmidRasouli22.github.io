# omidrasouli22.github.io

Personal website and technical blog of **Omid Rasouli**, built with [Astro](https://astro.build), Tailwind CSS and MDX, deployed to GitHub Pages.

**Live:** https://omidrasouli22.github.io

## Quick start

Requires Node.js 22.12+ (CI uses Node 24).

```bash
npm install
npm run dev        # http://localhost:4321 (drafts are visible here)
npm run build      # type-check, build to dist/, build both search indexes
npm run preview    # serve dist/ locally (use this to try search)
npm run search:eval  # after a build: check how well search-by-meaning ranks
```

> Both search modes index the **built** site, so in `npm run dev` the search dialog tells you to build first.
> Use `npm run build && npm run preview` to test search. The first build downloads the embedding model
> (~23 MB) into `.cache/models`.

In Astro 7, `astro dev` runs in the background. Stop it with `npx astro dev stop`.

## Writing a post

1. Copy `src/content/blog/_template.mdx` to `src/content/blog/my-post-slug.mdx`.
   The file name becomes the URL: `/blog/my-post-slug/`.
2. Fill in the frontmatter:

   | Field         | Required | Notes                                                                  |
   | ------------- | -------- | ---------------------------------------------------------------------- |
   | `title`       | yes      | ≤ 120 chars. Wrap one word in `*asterisks*` to set it in the serif     |
   | `description` | yes      | ≤ 220 chars; used on cards, in search, RSS and social previews         |
   | `pubDate`     | yes      | `2026-01-31`                                                           |
   | `updatedDate` | no       | Shown as "Updated …"                                                   |
   | `tags`        | no       | `[machine-learning, python]`; each tag gets a page at `/tags/<tag>/`   |
   | `draft`       | no       | `true` = visible in dev only, never built for production               |
   | `cover`       | no       | Relative path to an image, e.g. `../../assets/blog/my-post-slug/cover.png`. Without one, a contour banner is generated from the file name |
   | `coverAlt`    | if cover | Alt text for the cover                                                 |

3. Put images in `src/assets/blog/my-post-slug/` and reference them with relative paths. They are resized and
   converted to WebP automatically.
4. Remove `draft: true` (or set it to `false`) to publish.

`src/content/blog/example-post-features.mdx` demonstrates everything available. Delete it (or set `draft: true`)
once you have real posts.

### What you can use in a post

- **Code blocks** are highlighted at build time and get a header with a copy button:
  - ` ```python title="train.py" ` shows a file name instead of the language
  - ` ```python {3-5} ` highlights lines 3 to 5
  - a `// [!code ++]` or `// [!code --]` comment at the end of a line (`# [!code ++]` in Python) marks it as
    added or removed; the copy button leaves removed lines out
- **Math**: `$inline$` and `$$display$$` (KaTeX). Display equations are numbered and get a "copy TeX" button.
  The KaTeX CSS only loads on posts that use math.
- **Footnotes** (`text[^1]` … `[^1]: note`) appear as sidenotes in the right margin on wide screens and as a
  list at the end on smaller ones.
- **Figures**: `import { Image } from 'astro:assets'` and wrap it in a `<figure>` with a `<figcaption>`. Captions
  are numbered ("Fig. 1"), figures use the margin on wide screens, and every image can be clicked to enlarge.
- **Callouts** (no import needed):
  ```mdx
  <Callout type="tip" title="Optional title">Text with **markdown**.</Callout>
  ```
  `type` is `note` (default), `tip`, `warning` or `danger`.
- Tables, task lists and strikethrough (GitHub-flavoured Markdown).

Generated for every post: reading time and word count, the table of contents with progress, heading links (click
to copy), an author card, share buttons, a citation (plain text and BibTeX), previous/next cards, related posts
(by shared tags), the RSS and sitemap entries, both search indexes and the Open Graph image.

## Adding a project

Create `src/content/projects/my-project.mdx` (URL: `/projects/my-project/`):

```mdx
---
title: My Project
description: One or two sentences.
status: in-progress        # completed | in-progress | planned
stack: [Python, Databricks]
repo: https://github.com/OmidRasouli22/my-project   # optional
demo: https://example.com                           # optional
featured: true             # show on the home page (max 4 shown)
order: 1                   # lower = listed first
context: Data engineering  # optional label on the card
period: 2025 – 2026        # optional
---

## Overview

Write the case study here. Everything that works in blog posts works here too.
```

## Search

Press <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> or use the search box on the blog. There are two modes:

- **Keyword** ([Pagefind](https://pagefind.app)): exact words, instant, nothing extra to download.
- **Meaning**: finds posts and projects by what they are about, even when they share no words with the
  query ("why are trains late in Germany" finds the Deutsche Bahn project). Visitors opt in once; the model then
  loads from their browser cache.

How search by meaning works:

1. **Build** (`scripts/semantic-index.ts`, runs after `astro build`): every rendered post and project is split into
   passages along its headings (`src/lib/semantic/chunk.ts`). Code blocks are skipped and math is kept as TeX.
   Each passage is embedded with [snowflake-arctic-embed-xs](https://huggingface.co/Snowflake/snowflake-arctic-embed-xs)
   (Apache-2.0, pinned revision) and stored as int8 in `dist/search/`. The model is copied into `dist/models/`.
2. **Browser** (`src/lib/semantic/worker.ts`): a Web Worker runs the same model with ONNX Runtime (WASM),
   embeds the query and ranks passages by cosine similarity (`src/lib/semantic/rank.ts`). Results link to the
   matching section. A query takes ~10–20 ms.
3. **Privacy:** model, runtime and index are served from this site. The browser makes no requests to
   Hugging Face or any CDN, and queries never leave the device.

Which pages are indexed is controlled by the `data-search-*` attributes on the content element in
`src/layouts/PostLayout.astro` and `src/pages/projects/[slug].astro`.

**Tuning.** `scripts/semantic-eval.json` holds test queries with the page each should find, plus off-topic
queries. `npm run search:eval` reports top-1 accuracy, MRR, and whether the "match / no close match" rule in
`CONFIDENCE` (`src/lib/semantic/rank.ts`) classifies them correctly. Add queries for your real posts as you
write them, and re-run it if you change the model.

**If the model can't be downloaded during a build**, the build still succeeds with a warning and the site ships
with keyword search only; the Meaning button shows as unavailable.

## About page

Everything on `/about/` comes from `ABOUT` in `src/config.ts`:

- `bio`: the intro paragraphs.
- `card`: the "model card" (base model, fine-tuning, what you're looking for, where). Languages and the
  first skills of each area are added to it automatically. `workPermit` appears as an extra row once filled in.
- `stats`: the big numbers. Only use numbers you can back up.
- `experience`: the "training log", newest first. Each entry has `period`, `title`, `org`, `kind`,
  `highlights` (with an optional `href` to a project page) and `stack`. An entry with `todo: true` is only shown
  in `npm run dev`, with a TODO badge, and never in the production build. Use that for entries you haven't
  written yet.
- `education`: drawn as the descending path, oldest first.
- `skills`: shown as the skill map on large screens and as grouped lists on small ones.
- `now`: the "Currently" list at the bottom; items can link somewhere with `href`.

**Photo:** put an image at `src/assets/about/photo.jpg` (or `.png` / `.webp`). It replaces the "OR" monogram in
the post bylines and author cards, resized and optimised.

**"Now" line on the home page:** `SITE.now` in `src/config.ts`. Set `text: ''` to hide it.

## Project visuals

Every project card and project page has a picture at the top. If the project has a `cover` image in its
frontmatter, that is used. Otherwise a contour landscape is generated from the project's slug at build time
(`src/lib/contour-art.ts`), with a small gradient-descent path ending in its lowest basin. The same slug always
gives the same picture, and renaming the file gives a new one.

For real projects a screenshot, architecture diagram or result chart usually works better than the generated art:

```yaml
cover: ../../assets/projects/my-project/cover.png
coverAlt: Architecture of the ingestion pipeline
```

## Changing your info, colours and fonts

Everything personal lives in **`src/config.ts`**:

- `SITE`: name, headline (words in `*asterisks*` get the italic serif), intro, email, CV path, posts per page
- `SOCIALS`: links in the footer and on the About page
- `NAV`: header links
- `ABOUT`: bio paragraphs, education, skills
- `THEME`: **accent colour**

### Accent colour

The whole palette (both themes, gradients, focus rings, OG images) derives from two OKLCH hue numbers:

```ts
export const THEME = {
  accentHue: 200,  // primary (links, focus, gradient start)
  accentHue2: 290, // gradient end
};
```

Presets are listed in the comment above `THEME`: Signal 200/290, Ember 65/15, Acid 130/175, Ocean 240/275,
Rose 350/300. Any hue 0–360 works. Lightness and chroma are tuned per theme in `src/styles/global.css`, so
contrast stays readable whichever hue you pick.

### Other design tokens

All colours, radii and easing curves are CSS variables at the top of `src/styles/global.css` (`:root` = light,
`[data-theme='dark']` = dark), exposed to Tailwind as `bg-surface`, `text-fg-muted`, `border-border`, `text-accent`,
and so on. Fonts are Bricolage Grotesque (headings), Geist (text), Geist Mono and Instrument Serif (italic, for
emphasis), all self-hosted via Fontsource. To use Geist for headings too, set `--font-display: var(--font-sans)`
in `global.css`. The fonts are imported in `src/layouts/BaseLayout.astro`. The code highlighting themes are set in
`astro.config.mjs` → `markdown.shikiConfig`.

The favicon is `public/favicon.svg`. Its gradient colours are hard-coded, so update them if you change the accent.

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. `withastro/action` installs dependencies and runs `npm run build` (type check → Astro build → Pagefind index →
   semantic index). The embedding model is cached between runs (`actions/cache`).
2. `actions/deploy-pages` publishes `dist/` to GitHub Pages.

**One-time setup:** in the GitHub repo go to **Settings → Pages → Build and deployment → Source** and choose
**GitHub Actions**. The repository must be named `OmidRasouli22.github.io`, so no `base` path is needed. If you ever
deploy under a different repo name, set `base: '/repo-name'` in `astro.config.mjs`.

You can also re-run a deployment manually from the **Actions** tab (`workflow_dispatch`).

## Project structure

```
src/
  config.ts                 ← your info, nav, socials, accent colour
  content.config.ts         ← Zod schemas for blog posts and projects
  content/blog/             ← posts (.mdx); files starting with "_" are ignored
  content/projects/         ← project case studies
  assets/                   ← images used by posts/projects (optimised at build)
  components/               ← UI components (cards, search, TOC, callout, …)
  layouts/                  ← BaseLayout (SEO, theme, transitions), PostLayout
  lib/posts.ts              ← draft filtering, reading time, tags, related posts
  lib/og.ts                 ← Open Graph image renderer (Satori)
  lib/semantic/             ← search by meaning: shared config, chunking, ranking, browser worker
  pages/                    ← routes: /, /blog, /blog/[slug], /projects, /about, /tags, rss.xml, robots.txt, og/*.png
  plugins/                  ← small remark/rehype plugins (math flag, heading anchors, task-list labels)
  styles/global.css         ← design tokens, base styles, article typography
public/                     ← copied as-is (favicon, cv.pdf)
scripts/                    ← semantic search indexer and its evaluation
```

## Design notes

- **Hero background** (`src/lib/contour-field.ts`): contour lines of a slowly moving "loss surface" with a few
  particles doing gradient descent on it. The mouse adds a minimum, so lines bend toward it. It runs at 30 fps,
  stops when it's off-screen, and shows a still frame for people who prefer reduced motion. `BLOBS` controls the
  shape of the landscape and `LEVEL_STEP` the line density.
- **Headings:** in `SectionHeader`, `BlogHeader` and the footer, `*word*` sets that word in the italic serif. One per
  heading is plenty.
- **Small labels** with `data-decode` scramble into place the first time they scroll into view.
- **Post page** (`src/layouts/PostLayout.astro`, behaviour in `src/lib/post-reading.ts`): from 64rem the table of
  contents moves into a left rail; from 80rem a right margin column holds sidenotes and wide figures. Code frames
  and equation wrappers are added at build time by the plugins in `src/plugins/`.
- **Blog index**: the newest post is a featured card, the rest are grouped by year (`PostArchive`).
- **About**: education is drawn as a descending path (`EducationPath`), oldest first.
- **Page transitions** use Astro's `ClientRouter`. Post titles in the list morph into the post header.
- Everything respects `prefers-reduced-motion`.

## Notes on the setup

- **Markdown pipeline:** Astro 7 defaults to its native Sätteri Markdown processor, which doesn't run
  remark/rehype plugins. This site switches to the `unified()` pipeline (`@astrojs/markdown-remark`) so KaTeX and
  the heading anchors work.
- **Theme:** a small inline script in `<head>` applies the saved or system theme before the first paint, so there's
  no flash.
