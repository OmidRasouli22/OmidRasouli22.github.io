/**
 * Sanity check for semantic search. Run after a build: `npm run search:eval`.
 *
 * Embeds the queries in scripts/semantic-eval.json with the same model and ranking code
 * the browser uses, then reports where the expected page lands and how off-topic queries
 * score. Use it to re-calibrate CONFIDENCE in src/lib/semantic/rank.ts after changing the model.
 * Queries whose expected page no longer exists are skipped.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
import { SEMANTIC, type SemanticIndex } from '../src/lib/semantic/config.ts';
import { CONFIDENCE, isConfident, queryStats, rankPages, scorePassages, zScore } from '../src/lib/semantic/rank.ts';

interface EvalSet {
  relevant: { query: string; expect: string }[];
  offTopic: string[];
}

const dist = 'dist/search';
const index: SemanticIndex = JSON.parse(await readFile(join('dist', SEMANTIC.paths.index), 'utf8'));
const vectors = new Int8Array((await readFile(join(dist, index.vectors))).buffer);
const scales = index.passages.map((p) => p.scale);
const passagePage = index.passages.map((p) => p.page);
const cases: EvalSet = JSON.parse(await readFile('scripts/semantic-eval.json', 'utf8'));

env.cacheDir = '.cache/models';
const { model } = SEMANTIC;
const extractor = await pipeline('feature-extraction', model.id, { revision: model.revision, dtype: model.dtype });

async function search(query: string) {
  const output = await extractor(model.queryPrefix + query, { pooling: model.pooling, normalize: true });
  const scores = scorePassages(output.data as Float32Array, vectors, scales, model.dims);
  const stats = queryStats(scores);
  const hits = rankPages(scores, passagePage);
  return { hits, stats, confident: isConfident(hits[0]!.score, stats) };
}

const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n));
let found = 0;
let top1 = 0;
let reciprocal = 0;
let relevantConfident = 0;
let offConfident = 0;

console.log('\nRelevant queries (rank of the expected page, best cosine score, z-score)\n');
for (const { query, expect } of cases.relevant) {
  const target = index.pages.findIndex((p) => p.url === expect);
  if (target === -1) continue;
  found++;
  const { hits, stats, confident } = await search(query);
  const rank = hits.findIndex((h) => h.page === target) + 1;
  if (rank === 1) top1++;
  if (rank) reciprocal += 1 / rank;
  if (confident) relevantConfident++;
  const top = hits[0]!;
  console.log(
    `${rank === 1 ? '✓' : '✗'} ${pad(query, 46)} rank ${rank || '-'}  cos ${top.score.toFixed(3)}  z ${zScore(top.score, stats).toFixed(2)}  ${confident ? 'match' : 'NO MATCH'}  ${rank === 1 ? '' : `→ got ${index.pages[top.page]!.url}`}`,
  );
}

console.log('\nOff-topic queries (should come out as NO MATCH)\n');
for (const query of cases.offTopic) {
  const { hits, stats, confident } = await search(query);
  if (confident) offConfident++;
  const top = hits[0]!;
  console.log(`${confident ? '✗' : '✓'} ${pad(query, 46)}         cos ${top.score.toFixed(3)}  z ${zScore(top.score, stats).toFixed(2)}  ${confident ? 'match' : 'NO MATCH'}`);
}

console.log(`
Top-1 accuracy        ${top1}/${found} (${((100 * top1) / found).toFixed(0)}%)
MRR                   ${(reciprocal / found).toFixed(3)}
Relevant → match      ${relevantConfident}/${found}
Off-topic → no match  ${cases.offTopic.length - offConfident}/${cases.offTopic.length}
Rule                  cos ≥ ${CONFIDENCE.score} or z ≥ ${CONFIDENCE.z}
`);
await extractor.dispose();
