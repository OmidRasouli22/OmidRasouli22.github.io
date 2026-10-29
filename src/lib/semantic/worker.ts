/// <reference lib="webworker" />
/**
 * Runs the embedding model off the main thread. Everything is loaded from this site
 * (no Hugging Face or CDN requests): see scripts/semantic-index.ts for where the files come from.
 */
import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import runtimeMjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import runtimeWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import { SEMANTIC, type SemanticIndex } from './config';
import { isConfident, queryStats, rankPages, scorePassages, zScore } from './rank';

export interface SemanticResult {
  url: string;
  title: string;
  type: 'Post' | 'Project';
  date?: string;
  score: number;
  z: number;
  passages: { heading: string; anchor: string; text: string }[];
}

export type WorkerRequest = { type: 'load' } | { type: 'search'; id: number; query: string };

export type WorkerResponse =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'results'; id: number; confident: boolean; ms: number; results: SemanticResult[] };

declare const self: DedicatedWorkerGlobalScope;
const post = (message: WorkerResponse) => self.postMessage(message);
const origin = self.location.origin;
const { model, paths } = SEMANTIC;
const runtime = { mjs: new URL(runtimeMjs, origin).href, wasm: new URL(runtimeWasm, origin).href };

env.allowRemoteModels = false;
env.allowLocalModels = true;
// Root-relative on purpose: transformers.js only checks local files for paths that aren't full URLs.
env.localModelPath = paths.models;
const wasm = env.backends.onnx.wasm!;
wasm.wasmPaths = runtime;
// Multi-threading needs cross-origin isolation headers, which GitHub Pages can't send.
wasm.numThreads = 1;

const MIN_TAIL_Z = 1;

let extractor: FeatureExtractionPipeline | undefined;
let index: SemanticIndex | undefined;
let vectors: Int8Array | undefined;
let scales: Float32Array | undefined;
let passagePage: Uint16Array | undefined;
let loading: Promise<void> | undefined;

/**
 * Downloads a file while reporting progress. The browser cache then serves the runtime's
 * own request for it, so the bar also covers the large WASM file ONNX Runtime fetches itself.
 */
async function prefetch(url: string, onBytes: (n: number) => void) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`);
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onBytes(value.byteLength);
  }
}

async function load() {
  const indexUrl = `${origin}${paths.index}`;
  const response = await fetch(indexUrl);
  if (!response.ok) throw new Error('No semantic index in this build');
  index = (await response.json()) as SemanticIndex;
  if (index.model.id !== model.id || index.model.revision !== model.revision) {
    throw new Error('Index was built with a different model');
  }

  const vectorResponse = await fetch(new URL(index.vectors, indexUrl));
  if (!vectorResponse.ok) throw new Error('Vector file missing');
  vectors = new Int8Array(await vectorResponse.arrayBuffer());
  scales = Float32Array.from(index.passages, (p) => p.scale);
  passagePage = Uint16Array.from(index.passages, (p) => p.page);

  const total = index.downloadBytes;
  let loaded = 0;
  const report = (n: number) => {
    loaded += n;
    post({ type: 'progress', loaded: Math.min(loaded, total), total });
  };
  const modelBase = `${origin}${paths.models}${model.id}/`;
  await Promise.all([
    ...model.files.map((file) => prefetch(modelBase + file, report)),
    prefetch(runtime.mjs, report),
    prefetch(runtime.wasm, report),
  ]);

  extractor = await pipeline('feature-extraction', model.id, { dtype: model.dtype, device: 'wasm' });
  // Warm-up run so the first real query isn't slower than the rest.
  await extractor('warm up', { pooling: model.pooling, normalize: true });
}

async function search(id: number, query: string) {
  const started = performance.now();
  const output = await extractor!(model.queryPrefix + query, { pooling: model.pooling, normalize: true });
  const scores = scorePassages(output.data as Float32Array, vectors!, scales!, model.dims);
  const stats = queryStats(scores);
  const hits = rankPages(scores, passagePage!, { limit: 6, perPage: 2 });
  const results: SemanticResult[] = hits.map((hit) => {
    const page = index!.pages[hit.page]!;
    return {
      ...page,
      score: hit.score,
      z: zScore(hit.score, stats),
      passages: hit.passages.map(({ passage }) => {
        const { heading, anchor, text } = index!.passages[passage]!;
        return { heading, anchor, text };
      }),
    };
  });
  const confident = hits.length > 0 && isConfident(hits[0]!.score, stats);
  post({
    type: 'results',
    id,
    confident,
    ms: Math.round(performance.now() - started),
    // With a real match, drop the tail that barely stands out (z < 1 was noise in the eval).
    // Without one, show only the few closest pages.
    results: confident ? results.filter((r, i) => i === 0 || r.z >= MIN_TAIL_Z) : results.slice(0, 3),
  });
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'load') {
      loading ??= load();
      await loading;
      post({ type: 'ready' });
    } else if (message.type === 'search') {
      await loading;
      await search(message.id, message.query);
    }
  } catch (error) {
    loading = undefined;
    post({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
  }
});
