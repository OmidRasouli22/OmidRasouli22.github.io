// Segments per marching-squares case. Edges: 0 top, 1 right, 2 bottom, 3 left.
const CASES: number[][] = [
  [], [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0],
  [3, 0], [0, 2], [0, 1, 3, 2], [0, 1], [3, 1], [2, 1], [3, 2], [],
];

/**
 * Calls `segment` for every piece of the line where a gridded field crosses `level`.
 * `values` is row-major (`cols` × `rows`), grid points are `cell` px apart.
 */
export function traceContour(
  values: ArrayLike<number>,
  cols: number,
  rows: number,
  cell: number,
  level: number,
  segment: (x1: number, y1: number, x2: number, y2: number) => void,
) {
  const point = (edge: number, x0: number, y0: number, tl: number, tr: number, br: number, bl: number) => {
    if (edge === 0) return [x0 + cell * ((level - tl) / (tr - tl)), y0];
    if (edge === 1) return [x0 + cell, y0 + cell * ((level - tr) / (br - tr))];
    if (edge === 2) return [x0 + cell * ((level - bl) / (br - bl)), y0 + cell];
    return [x0, y0 + cell * ((level - tl) / (bl - tl))];
  };

  for (let j = 0; j < rows - 1; j++) {
    const y0 = j * cell;
    for (let i = 0; i < cols - 1; i++) {
      const tl = values[j * cols + i]!;
      const tr = values[j * cols + i + 1]!;
      const br = values[(j + 1) * cols + i + 1]!;
      const bl = values[(j + 1) * cols + i]!;
      const segs = CASES[(tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0)]!;
      const x0 = i * cell;
      for (let s = 0; s < segs.length; s += 2) {
        const [ax, ay] = point(segs[s]!, x0, y0, tl, tr, br, bl);
        const [bx, by] = point(segs[s + 1]!, x0, y0, tl, tr, br, bl);
        segment(ax!, ay!, bx!, by!);
      }
    }
  }
}
