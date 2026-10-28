import { traceContour } from './marching-squares';

/**
 * Hero background: contour lines of a drifting "loss surface" (Gaussians on a slope, marching
 * squares) with a few momentum-SGD particles rolling downhill. The pointer acts as an extra minimum.
 */

interface Blob {
  x: number; // centre, as a fraction of width
  y: number; // centre, as a fraction of height
  ax: number; // drift amplitude (fraction)
  ay: number;
  fx: number; // drift frequency
  fy: number;
  phase: number;
  amp: number; // + hill / − well
  sigma: number; // fraction of the larger side
}

interface Optimizer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: number[]; // flat [x0, y0, x1, y1, …]
  idle: number;
}

const BLOBS: Blob[] = [
  { x: 0.72, y: 0.42, ax: 0.08, ay: 0.1, fx: 0.11, fy: 0.07, phase: 0, amp: -1.25, sigma: 0.16 },
  { x: 0.9, y: 0.75, ax: 0.05, ay: 0.08, fx: 0.07, fy: 0.13, phase: 1.7, amp: 0.95, sigma: 0.14 },
  { x: 0.55, y: 0.85, ax: 0.07, ay: 0.05, fx: 0.09, fy: 0.05, phase: 3.1, amp: -0.7, sigma: 0.12 },
  { x: 0.95, y: 0.2, ax: 0.04, ay: 0.06, fx: 0.06, fy: 0.1, phase: 4.4, amp: 0.8, sigma: 0.13 },
  { x: 0.4, y: 0.2, ax: 0.06, ay: 0.06, fx: 0.05, fy: 0.08, phase: 2.2, amp: 0.55, sigma: 0.15 },
];

const LEVEL_STEP = 0.11;
const FRAME_MS = 1000 / 30;

export function createContourField(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let cell = 14;
  let cols = 0;
  let rows = 0;
  let values = new Float32Array(0);
  let colors = { a: '#22d3ee', b: '#8b5cf6', fg: '#ffffff' };
  let time = Math.random() * 100;
  let raf = 0;
  let last = 0;
  let visible = true;

  // Pointer well (eased toward the real pointer).
  const pointer = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, strength: 0, target: 0 };

  const blobPositions = BLOBS.map(() => ({ x: 0, y: 0, s: 0 }));

  function readColors() {
    const probe = document.createElement('span');
    probe.style.display = 'none';
    document.body.append(probe);
    const resolve = (v: string) => {
      probe.style.color = `var(${v})`;
      return getComputedStyle(probe).color;
    };
    colors = { a: resolve('--accent'), b: resolve('--accent-2'), fg: resolve('--fg') };
    probe.remove();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = width < 640 ? 18 : 14;
    cols = Math.ceil(width / cell) + 1;
    rows = Math.ceil(height / cell) + 1;
    values = new Float32Array(cols * rows);
  }

  function updateBlobs() {
    const scale = Math.max(width, height);
    // On narrow screens spread the landscape across the whole width.
    const narrow = width < 768;
    BLOBS.forEach((b, i) => {
      const bx = narrow ? 0.15 + (b.x - 0.4) * 1.3 : b.x;
      blobPositions[i] = {
        x: (bx + b.ax * Math.sin(time * b.fx + b.phase)) * width,
        y: (b.y + b.ay * Math.cos(time * b.fy + b.phase * 0.7)) * height,
        s: b.sigma * scale,
      };
    });
  }

  function field(x: number, y: number): number {
    // Gentle slope so contours flow across the whole canvas.
    let v = (x / width) * 0.9 - (y / height) * 0.25;
    for (let i = 0; i < BLOBS.length; i++) {
      const p = blobPositions[i]!;
      const dx = x - p.x;
      const dy = y - p.y;
      v += BLOBS[i]!.amp * Math.exp(-(dx * dx + dy * dy) / (2 * p.s * p.s));
    }
    if (pointer.strength > 0.001) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const s = Math.max(width, height) * 0.09;
      v -= 1.1 * pointer.strength * Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
    }
    return v;
  }

  const optimizers: Optimizer[] = Array.from({ length: 3 }, () => spawn());

  function spawn(): Optimizer {
    // Start somewhere high-ish on the right two thirds of the canvas.
    let best = { x: width * 0.7, y: height * 0.5, v: -Infinity };
    for (let i = 0; i < 6; i++) {
      const x = width * (width < 768 ? 0.1 + Math.random() * 0.8 : 0.4 + Math.random() * 0.55);
      const y = height * (0.1 + Math.random() * 0.8);
      const v = width ? field(x, y) : 0;
      if (v > best.v) best = { x, y, v };
    }
    return { x: best.x, y: best.y, vx: 0, vy: 0, trail: [], idle: 0 };
  }

  function stepOptimizers() {
    const h = 2;
    const lr = Math.max(width, height) * 2.2;
    for (let i = 0; i < optimizers.length; i++) {
      const o = optimizers[i]!;
      const gx = (field(o.x + h, o.y) - field(o.x - h, o.y)) / (2 * h);
      const gy = (field(o.x, o.y + h) - field(o.x, o.y - h)) / (2 * h);
      o.vx = o.vx * 0.86 - lr * gx * 0.02;
      o.vy = o.vy * 0.86 - lr * gy * 0.02;
      const speed = Math.hypot(o.vx, o.vy);
      if (speed > 2.4) {
        o.vx *= 2.4 / speed;
        o.vy *= 2.4 / speed;
      }
      o.x += o.vx;
      o.y += o.vy;
      o.trail.push(o.x, o.y);
      if (o.trail.length > 240) o.trail.splice(0, 2);
      o.idle = speed < 0.08 ? o.idle + 1 : 0;
      const out = o.x < -20 || o.y < -20 || o.x > width + 20 || o.y > height + 20;
      if (o.idle > 70 || out) optimizers[i] = spawn();
    }
  }

  function drawContours() {
    let min = Infinity;
    let max = -Infinity;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v = field(i * cell, j * cell);
        values[j * cols + i] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }

    ctx!.lineWidth = 1;
    const first = Math.ceil(min / LEVEL_STEP);
    const lastLevel = Math.floor(max / LEVEL_STEP);
    for (let k = first; k <= lastLevel; k++) {
      const level = k * LEVEL_STEP;
      // Deeper basins glow in the primary accent, peaks fade toward the secondary.
      const depth = (level - min) / (max - min || 1);
      const index = k % 5 === 0;
      ctx!.strokeStyle = depth < 0.5 ? colors.a : colors.b;
      ctx!.lineWidth = index ? 1.25 : 1;
      ctx!.globalAlpha = (0.14 + 0.34 * Math.abs(depth - 0.5)) * (index ? 1.8 : 1);
      ctx!.beginPath();
      traceContour(values, cols, rows, cell, level, (x1, y1, x2, y2) => {
        ctx!.moveTo(x1, y1);
        ctx!.lineTo(x2, y2);
      });
      ctx!.stroke();
    }
    ctx!.globalAlpha = 1;
  }

  function drawOptimizers() {
    for (const o of optimizers) {
      const n = o.trail.length / 2;
      ctx!.fillStyle = colors.fg;
      for (let p = 0; p < n; p += 4) {
        ctx!.globalAlpha = 0.5 * (p / n) ** 1.5;
        ctx!.beginPath();
        ctx!.arc(o.trail[p * 2]!, o.trail[p * 2 + 1]!, 1, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 0.9;
      ctx!.beginPath();
      ctx!.arc(o.x, o.y, 2.5, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.globalAlpha = 0.35;
      ctx!.strokeStyle = colors.a;
      ctx!.beginPath();
      ctx!.arc(o.x, o.y, 7, 0, Math.PI * 2);
      ctx!.stroke();
    }
    ctx!.globalAlpha = 1;
  }

  function render() {
    ctx!.clearRect(0, 0, width, height);
    updateBlobs();
    drawContours();
    drawOptimizers();
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME_MS) return;
    last = now;
    time += 0.05;
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;
    pointer.strength += (pointer.target - pointer.strength) * 0.06;
    stepOptimizers();
    render();
  }

  function start() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  readColors();
  updateBlobs();
  optimizers.forEach((_, i) => (optimizers[i] = spawn()));

  if (reducedMotion) {
    // One still frame, with optimizer paths pre-simulated so the idea still reads.
    for (let i = 0; i < 160; i++) stepOptimizers();
    render();
  } else {
    render();
    start();
  }
  canvas.dataset.ready = '';

  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    pointer.target = inside ? 1 : 0;
    if (inside) {
      if (pointer.strength < 0.01) {
        pointer.x = x;
        pointer.y = y;
      }
      pointer.tx = x;
      pointer.ty = y;
    }
  };
  const onPointerLeave = () => (pointer.target = 0);
  const onVisibility = () => (document.hidden ? stop() : start());
  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (reducedMotion) render();
  });
  const io = new IntersectionObserver(([entry]) => {
    visible = entry!.isIntersecting;
    if (visible && !reducedMotion) start();
    else stop();
  });
  const themeObserver = new MutationObserver(() => {
    readColors();
    if (reducedMotion) render();
  });

  if (!reducedMotion) {
    addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
  }
  document.addEventListener('visibilitychange', onVisibility);
  resizeObserver.observe(canvas);
  io.observe(canvas);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return () => {
    stop();
    removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    resizeObserver.disconnect();
    io.disconnect();
    themeObserver.disconnect();
  };
}
