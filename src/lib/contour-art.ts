import { traceContour } from './marching-squares';

export const ART_WIDTH = 640;
export const ART_HEIGHT = 240;
const CELL = 16;
const LEVEL_STEP = 0.14;

export interface ContourArt {
  lines: { d: string; depth: number; index: boolean }[];
  /** Dotted gradient-descent path, start to minimum. */
  descent: string;
  end: [number, number];
}

// Small seeded PRNG (FNV-1a hash into mulberry32) so each project always gets the same picture.
function random(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Joins marching-squares segments that share endpoints into polylines with relative
// coordinates. Keeps the inline SVG small.
function toPath(segments: number[][]): string {
  const key = (x: number, y: number) => `${x},${y}`;
  const byPoint = new Map<string, number[]>();
  segments.forEach(([x1, y1, x2, y2], i) => {
    for (const k of [key(x1!, y1!), key(x2!, y2!)]) byPoint.set(k, [...(byPoint.get(k) ?? []), i]);
  });
  const used = new Uint8Array(segments.length);

  const extend = (points: number[][]) => {
    for (;;) {
      const [x, y] = points[points.length - 1]!;
      const next = byPoint.get(key(x!, y!))?.find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = 1;
      const [x1, y1, x2, y2] = segments[next]!;
      points.push(x1 === x && y1 === y ? [x2!, y2!] : [x1!, y1!]);
    }
  };

  let d = '';
  segments.forEach(([x1, y1, x2, y2], i) => {
    if (used[i]) return;
    used[i] = 1;
    const points = [[x1!, y1!], [x2!, y2!]];
    extend(points);
    points.reverse();
    extend(points);
    d += `M${points[0]!.join(' ')}`;
    for (let p = 1; p < points.length; p++) {
      d += `l${points[p]![0]! - points[p - 1]![0]!} ${points[p]![1]! - points[p - 1]![1]!}`;
    }
  });
  return d;
}

export function contourArt(seed: string): ContourArt {
  const rand = random(seed);
  // One deep, central well so there is always somewhere to descend to. The other blobs keep
  // their distance from it, otherwise nearby hills can cancel it out.
  const well = {
    x: (0.35 + rand() * 0.45) * ART_WIDTH,
    y: (0.3 + rand() * 0.4) * ART_HEIGHT,
    amp: -(1.3 + rand() * 0.4),
    s: (0.12 + rand() * 0.06) * ART_WIDTH,
  };
  const blobs = [well];
  const count = 4 + Math.floor(rand() * 2);
  for (let tries = 0; blobs.length < count && tries < 50; tries++) {
    const x = (0.08 + rand() * 0.84) * ART_WIDTH;
    const y = (0.1 + rand() * 0.8) * ART_HEIGHT;
    if (Math.hypot(x - well.x, y - well.y) < ART_WIDTH * 0.26) continue;
    blobs.push({ x, y, amp: (rand() < 0.45 ? -1 : 1) * (0.7 + rand() * 0.6), s: (0.1 + rand() * 0.12) * ART_WIDTH });
  }
  const slope = { x: (rand() - 0.5) * 1.2, y: (rand() - 0.5) * 0.6 };

  const field = (x: number, y: number) => {
    let v = (x / ART_WIDTH) * slope.x + (y / ART_HEIGHT) * slope.y;
    for (const b of blobs) v += b.amp * Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (2 * b.s * b.s));
    return v;
  };

  const cols = Math.ceil(ART_WIDTH / CELL) + 1;
  const rows = Math.ceil(ART_HEIGHT / CELL) + 1;
  const values = new Float32Array(cols * rows);
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v = field(i * CELL, j * CELL);
      values[j * cols + i] = v;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }

  const lines: ContourArt['lines'] = [];
  for (let k = Math.ceil(min / LEVEL_STEP); k <= Math.floor(max / LEVEL_STEP); k++) {
    const level = k * LEVEL_STEP;
    const segments: number[][] = [];
    traceContour(values, cols, rows, CELL, level, (x1, y1, x2, y2) => {
      segments.push([Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2)]);
    });
    const d = toPath(segments);
    if (d) lines.push({ d, depth: (level - min) / (max - min || 1), index: k % 4 === 0 });
  }

  // Gradient descent with momentum. Try a few starts on the left and keep the run that settles
  // in the deepest basin without sliding off the edge.
  const descend = (x: number, y: number) => {
    let vx = 0;
    let vy = 0;
    const points: [number, number][] = [];
    for (let step = 0; step < 500; step++) {
      const gx = (field(x + 1, y) - field(x - 1, y)) / 2;
      const gy = (field(x, y + 1) - field(x, y - 1)) / 2;
      vx = vx * 0.85 - gx * 900;
      vy = vy * 0.85 - gy * 900;
      const speed = Math.hypot(vx, vy);
      if (speed > 3) {
        vx *= 3 / speed;
        vy *= 3 / speed;
      }
      x += vx;
      y += vy;
      if (x < 12 || y < 12 || x > ART_WIDTH - 12 || y > ART_HEIGHT - 12) return undefined;
      if (step % 2 === 0) points.push([Math.round(x), Math.round(y)]);
      if (speed < 0.05 && step > 20) break;
    }
    return { points, depth: field(x, y) };
  };

  let best: { points: [number, number][]; depth: number } | undefined;
  for (let attempt = 0; attempt < 30 && !(attempt >= 12 && best); attempt++) {
    // After 12 tries from the left, start anywhere.
    const left = attempt < 12;
    const run = descend(ART_WIDTH * (left ? 0.08 + rand() * 0.2 : 0.05 + rand() * 0.9), ART_HEIGHT * (0.15 + rand() * 0.7));
    if (run && run.points.length > 15 && (!best || run.depth < best.depth)) best = run;
  }
  const points = best?.points ?? [];
  const end = points[points.length - 1] ?? [0, 0];

  return { lines, descent: points.length ? `M${points.map((p) => p.join(' ')).join('L')}` : '', end };
}
