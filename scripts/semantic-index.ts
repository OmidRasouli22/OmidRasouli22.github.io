/**
 * Builds the semantic search index from the rendered site (runs after `astro build`).
 *
 *  1. Reads every page in dist/ that has a [data-search-type] content element.
 *  2. Splits it into heading-aware passages and embeds them with the model in SEMANTIC.
 *  3. Writes int8 vectors + metadata to dist/search/ and copies the model into dist/, so the
 *     browser never has to fetch anything from a third party. (The ONNX runtime files are
 *     bundled by Vite through the worker's imports.)
 *
 * If anything fails (e.g. the model can't be downloaded) it warns and exits cleanly:
 * the site still deploys and the search UI falls back to keyword search.
 */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { env, pipeline } from '@huggingface/transformers';
import { SEMANTIC, type SemanticIndex, type SemanticPage, type SemanticPassage } from '../src/lib/semantic/config.ts';
import { chunkSection, extractSections } from '../src/lib/semantic/chunk.ts';
import { quantize } from '../src/lib/semantic/rank.ts';

const DIST = 'dist';
const CACHE = '.cache/models';
const BATCH = 16;
const { model } = SEMANTIC;

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [])),
  );
  return nested.flat();
}

function urlFor(file: string): string {
  const path = relative(DIST, file).replace(/\\/g, '/');
  return `/${path.replace(/index\.html$/, '').replace(/\.html$/, '/')}`;
}

async function collect() {
  const pages: SemanticPage[] = [];
  const passages: Omit<SemanticPassage, 'scale'>[] = [];
  const inputs: string[] = [];

  for (const file of (await htmlFiles(DIST)).sort()) {
    const root = parse(await readFile(file, 'utf8'));
    const content = root.querySelector('[data-search-type]');
    if (!content) continue;

    const title = content.getAttribute('data-search-title') ?? '';
    const description = content.getAttribute('data-search-description') ?? '';
    const date = content.getAttribute('data-search-date') || undefined;
    const type = content.getAttribute('data-search-type') === 'Project' ? 'Project' : 'Post';
    const page = pages.push({ url: urlFor(file), title, type, ...(date && { date }) }) - 1;

    // The title and description act as a summary passage, so title-like queries match too.
    passages.push({ page, heading: '', anchor: '', text: description });
    inputs.push(`${title}. ${description}`);

    for (const section of extractSections(content)) {
      for (const chunk of chunkSection(section)) {
        passages.push({ page, heading: chunk.heading, anchor: chunk.anchor, text: chunk.text });
        // Prefixing title and heading gives short passages the context they lack on their own.
        inputs.push([title, chunk.heading, chunk.text].filter(Boolean).join('. '));
      }
    }
  }
  return { pages, passages, inputs };
}

async function embedAll(inputs: string[]) {
  env.cacheDir = CACHE;
  const extractor = await pipeline('feature-extraction', model.id, { revision: model.revision, dtype: model.dtype });
  const vectors = new Int8Array(inputs.length * model.dims);
  const scales: number[] = [];
  for (let i = 0; i < inputs.length; i += BATCH) {
    const batch = inputs.slice(i, i + BATCH);
    const output = await extractor(batch, { pooling: model.pooling, normalize: true });
    (output.tolist() as number[][]).forEach((vector, j) => {
      const { bytes, scale } = quantize(vector);
      vectors.set(bytes, (i + j) * model.dims);
      scales.push(scale);
    });
  }
  await extractor.dispose();
  return { vectors, scales };
}

/** Copies the model into dist/ and returns what the browser downloads on first use, in bytes. */
async function copyModel(): Promise<number> {
  let bytes = 0;
  for (const file of model.files) {
    const to = join(DIST, SEMANTIC.paths.models, model.id, file);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(join(CACHE, model.id, model.revision, file), to);
    bytes += (await stat(to)).size;
  }
  for (const file of SEMANTIC.runtime) {
    bytes += (await stat(fileURLToPath(import.meta.resolve(`onnxruntime-web/${file}`)))).size;
  }
  return bytes;
}

async function main() {
  const started = performance.now();
  const { pages, passages, inputs } = await collect();
  const { vectors, scales } = await embedAll(inputs);
  const downloadBytes = await copyModel();

  const bytes = new Uint8Array(vectors.buffer);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const vectorFile = `semantic.${hash}.bin`;
  const index: SemanticIndex = {
    version: 1,
    model: { id: model.id, revision: model.revision, dims: model.dims },
    vectors: vectorFile,
    downloadBytes,
    pages,
    passages: passages.map((p, i) => ({ ...p, scale: Number(scales[i]!.toPrecision(6)) })),
  };

  const indexPath = join(DIST, SEMANTIC.paths.index);
  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(join(dirname(indexPath), vectorFile), bytes);
  await writeFile(indexPath, JSON.stringify(index));

  const indexKb = ((await stat(indexPath)).size / 1024).toFixed(1);
  console.log(
    `[semantic] ${pages.length} pages, ${passages.length} passages · index ${indexKb} kB + vectors ${(bytes.length / 1024).toFixed(1)} kB · ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
}

main().catch(async (error) => {
  // Remove partial output so the UI sees "no index" rather than a broken one.
  await rm(join(DIST, SEMANTIC.paths.index), { force: true });
  const message = `Semantic search index was not built: ${error instanceof Error ? error.message : error}`;
  console.warn(`[semantic] ${message}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Semantic search::${message}`);
});
