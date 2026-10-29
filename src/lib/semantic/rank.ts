export interface PassageHit {
  passage: number;
  score: number;
}

export interface PageHit {
  page: number;
  score: number;
  passages: PassageHit[];
}

/**
 * When is the best hit a real match? Calibrated for snowflake-arctic-embed-xs with
 * scripts/semantic-eval.ts. Raw cosine scores from this model sit in a narrow band (off-topic
 * queries still reach ~0.58), so a hit also counts if it stands out from the rest of the corpus
 * for the same query (z-score). Re-run the eval after changing the model or adding lots of content.
 */
export const CONFIDENCE = { score: 0.6, z: 2.1 };

export interface QueryStats {
  mean: number;
  std: number;
}

export function queryStats(scores: ArrayLike<number>): QueryStats {
  let sum = 0;
  for (let i = 0; i < scores.length; i++) sum += scores[i]!;
  const mean = sum / (scores.length || 1);
  let variance = 0;
  for (let i = 0; i < scores.length; i++) variance += (scores[i]! - mean) ** 2;
  return { mean, std: Math.sqrt(variance / (scores.length || 1)) || 1 };
}

export const zScore = (score: number, stats: QueryStats) => (score - stats.mean) / stats.std;

export const isConfident = (score: number, stats: QueryStats) =>
  score >= CONFIDENCE.score || zScore(score, stats) >= CONFIDENCE.z;

/** Dot product of a normalised query with every int8 passage vector (value ≈ int8 × scale). */
export function scorePassages(
  query: ArrayLike<number>,
  vectors: Int8Array,
  scales: ArrayLike<number>,
  dims: number,
): Float32Array {
  const count = scales.length;
  const scores = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let dot = 0;
    const offset = i * dims;
    for (let k = 0; k < dims; k++) dot += query[k]! * vectors[offset + k]!;
    scores[i] = dot * scales[i]!;
  }
  return scores;
}

/** Groups passage scores by page. A page ranks by its best passage and keeps up to `perPage` of them. */
export function rankPages(
  scores: ArrayLike<number>,
  passagePage: ArrayLike<number>,
  { limit = 8, perPage = 2 }: { limit?: number; perPage?: number } = {},
): PageHit[] {
  const byPage = new Map<number, PassageHit[]>();
  for (let i = 0; i < scores.length; i++) {
    const page = passagePage[i]!;
    const hits = byPage.get(page) ?? [];
    hits.push({ passage: i, score: scores[i]! });
    byPage.set(page, hits);
  }
  return [...byPage.entries()]
    .map(([page, hits]) => {
      hits.sort((a, b) => b.score - a.score);
      return { page, score: hits[0]!.score, passages: hits.slice(0, perPage) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Symmetric int8 quantisation of a unit vector. Returns the bytes and the scale to undo it. */
export function quantize(vector: ArrayLike<number>): { bytes: Int8Array; scale: number } {
  let max = 0;
  for (let k = 0; k < vector.length; k++) max = Math.max(max, Math.abs(vector[k]!));
  const scale = max / 127 || 1;
  const bytes = new Int8Array(vector.length);
  for (let k = 0; k < vector.length; k++) bytes[k] = Math.round(vector[k]! / scale);
  return { bytes, scale };
}
