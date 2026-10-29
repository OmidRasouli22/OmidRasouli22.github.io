/**
 * Shared by the build-time indexer (scripts/semantic-index.ts) and the browser worker,
 * so both always embed text the same way.
 */
export const SEMANTIC = {
  model: {
    id: 'Snowflake/snowflake-arctic-embed-xs',
    // Pinned so a model update upstream can't silently change the vectors.
    revision: 'd8c86521100d3556476a063fc2342036d45c106f',
    dtype: 'q8',
    dims: 384,
    pooling: 'cls',
    // Arctic embed expects this prefix on queries only, not on passages.
    queryPrefix: 'Represent this sentence for searching relevant passages: ',
    /** Files the browser needs, relative to the model folder. */
    files: ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx'],
  },
  /** Plain WASM build of ONNX Runtime (no WebGPU). The worker imports these via Vite. */
  runtime: ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'],
  paths: {
    index: '/search/semantic.json',
    models: '/models/',
  },
} as const;

export interface SemanticPage {
  url: string;
  title: string;
  type: 'Post' | 'Project';
  date?: string;
}

export interface SemanticPassage {
  /** Index into `pages`. */
  page: number;
  heading: string;
  /** Heading id for deep links, '' for the top of the page. */
  anchor: string;
  text: string;
  /** Scale for the int8 vector: value ≈ int8 * scale. */
  scale: number;
}

export interface SemanticIndex {
  version: 1;
  model: { id: string; revision: string; dims: number };
  /** Vector file, relative to the index file. */
  vectors: string;
  /** Bytes the browser downloads on first use (model + runtime), shown before asking. */
  downloadBytes: number;
  pages: SemanticPage[];
  passages: SemanticPassage[];
}
