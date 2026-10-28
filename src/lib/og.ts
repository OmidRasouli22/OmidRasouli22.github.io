import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE, THEME } from '@/config';

// Satori can't read WOFF2, so the static WOFF build of Geist is used here.
const fontDir = join(process.cwd(), 'node_modules/@fontsource/geist/files');
const fonts = [400, 600].map((weight) => ({
  name: 'Geist',
  data: readFileSync(join(fontDir, `geist-latin-${weight}-normal.woff`)),
  weight: weight as 400 | 600,
  style: 'normal' as const,
}));

/** OKLCH → sRGB hex, so the OG image follows the accent hues in config.ts. */
function oklchToHex(l: number, c: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return `#${linear
    .map((v) => {
      const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, srgb)) * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

const accent = oklchToHex(0.82, 0.13, THEME.accentHue);
const accent2 = oklchToHex(0.7, 0.19, THEME.accentHue2);

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

// Satori's lineClamp reserves space for every line, so long text is truncated up front.
const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;

export interface OgOptions {
  title: string;
  kicker?: string;
  subtitle?: string;
}

export async function renderOgImage({ title, kicker, subtitle }: OgOptions): Promise<Uint8Array<ArrayBuffer>> {
  const tree = h(
    'div',
    {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      backgroundColor: '#0b0c10',
      backgroundImage: `radial-gradient(circle at 85% 0%, ${accent}40, transparent 45%), radial-gradient(circle at 100% 100%, ${accent2}38, transparent 50%)`,
      color: '#eef1f6',
      fontFamily: 'Geist',
    },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: 18 }, [
        h(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 14,
            backgroundImage: `linear-gradient(135deg, ${accent}, ${accent2})`,
            color: '#0b0c10',
            fontSize: 22,
            fontWeight: 600,
          },
          'OR',
        ),
        h('div', { fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }, SITE.name),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }, [
        kicker ? h('div', { fontSize: 24, color: accent, letterSpacing: '0.04em' }, kicker) : null,
        h(
          'div',
          {
            fontSize: title.length > 60 ? 58 : 70,
            fontWeight: 600,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            maxWidth: 1040,
          },
          truncate(title, 90),
        ),
        subtitle
          ? h('div', { fontSize: 28, lineHeight: 1.4, color: '#a1a7b5', maxWidth: 1000 }, truncate(subtitle, 140))
          : null,
      ]),
      h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: 22, color: '#80879a' }, [
        h('div', {}, new URL(SITE.url).host),
        h('div', { width: 160, height: 4, borderRadius: 4, backgroundImage: `linear-gradient(90deg, ${accent}, ${accent2})` }),
      ]),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  return new Uint8Array(new Resvg(svg).render().asPng());
}
