import { SEMANTIC, type SemanticIndex } from './config';
import type { SemanticResult, WorkerRequest, WorkerResponse } from './worker';

export type { SemanticResult };
export type SemanticStatus = 'idle' | 'loading' | 'ready' | 'failed';
export interface SemanticResponse {
  confident: boolean;
  ms: number;
  results: SemanticResult[];
}

/** Lives for the whole visit (module scope), so the model stays loaded across page navigations. */
class SemanticSearch {
  status: SemanticStatus = 'idle';
  error = '';
  onProgress: (loaded: number, total: number) => void = () => {};

  private worker: Worker | undefined;
  private ready: Promise<void> | undefined;
  private nextId = 0;
  private pending = new Map<number, (response: SemanticResponse) => void>();
  private info: Promise<{ available: boolean; transferBytes: number }> | undefined;

  /** Cheap check (the small index file only): is semantic search in this build, and how big is it? */
  availability() {
    this.info ??= fetch(SEMANTIC.paths.index)
      .then(async (r) => (r.ok ? { available: true, transferBytes: ((await r.json()) as SemanticIndex).transferBytes } : null))
      .catch(() => null)
      .then((info) => info ?? { available: false, transferBytes: 0 });
    return this.info;
  }

  load(): Promise<void> {
    this.ready ??= new Promise<void>((resolve, reject) => {
      this.status = 'loading';
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.worker = worker;
      const fail = (message: string) => {
        console.warn('[semantic search]', message);
        this.status = 'failed';
        this.error = /HTTP|fetch|network/i.test(message)
          ? "The model couldn't be downloaded. Check your connection and try again."
          : "The model couldn't start in this browser.";
        worker.terminate();
        this.worker = undefined;
        this.ready = undefined; // allow a retry
        reject(new Error(message));
      };
      worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.type === 'progress') this.onProgress(message.loaded, message.total);
        else if (message.type === 'ready') {
          this.status = 'ready';
          resolve();
        } else if (message.type === 'failed') fail(message.message);
        else if (message.type === 'results') {
          this.pending.get(message.id)?.({ confident: message.confident, ms: message.ms, results: message.results });
          this.pending.delete(message.id);
        }
      });
      worker.addEventListener('error', (event) => fail(event.message || 'The search worker crashed'));
      this.send({ type: 'load' });
    });
    return this.ready;
  }

  /** Resolves with results, or with null if a newer search was started in the meantime. */
  async search(query: string): Promise<SemanticResponse | null> {
    await this.load();
    const id = ++this.nextId;
    const response = await new Promise<SemanticResponse>((resolve) => {
      this.pending.set(id, resolve);
      this.send({ type: 'search', id, query });
    });
    return id === this.nextId ? response : null;
  }

  private send(message: WorkerRequest) {
    this.worker?.postMessage(message);
  }
}

export const semantic = new SemanticSearch();

const STOPWORDS = new Set(
  'the and for are but not you all any can had her was one our out has have how what when where which who why with from that this these those into about your does did doing been being they them their there then than its it’s use using get make'.split(
    ' ',
  ),
);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Escapes `text` and wraps words that share a stem with the query in <mark>.
 * Semantic matches often share no words at all; then nothing is marked, which is fine.
 */
export function highlight(text: string, query: string): string {
  const stems = [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOPWORDS.has(w)))]
    .map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w))
    .filter((w) => w.length >= 3);
  if (!stems.length) return escapeHtml(text);
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${stems.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[\\p{L}\\p{N}]*`, 'giu');
  let html = '';
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    html += `${escapeHtml(text.slice(last, match.index))}<mark>${escapeHtml(match[0])}</mark>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(last));
}

export const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;
