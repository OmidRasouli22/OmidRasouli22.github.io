import type { HTMLElement, Node } from 'node-html-parser';

/** A heading-delimited part of a page. `anchor` is the heading id ('' before the first heading). */
export interface Section {
  heading: string;
  anchor: string;
  blocks: string[];
}

export interface Chunk {
  heading: string;
  anchor: string;
  text: string;
}

const SKIP = new Set(['script', 'style', 'svg', 'pre', 'nav', 'button', 'header', 'form', 'template', 'img']);
const HEADINGS = new Set(['h2', 'h3', 'h4']);
// Elements whose text is read as one block (instead of descending further).
const LEAF_BLOCKS = new Set(['p', 'figcaption', 'dt', 'dd', 'h5', 'h6', 'tr', 'summary']);
const SKIP_CLASSES = ['heading-anchor', 'copy-button', 'data-footnote-backref'];

const ELEMENT = 1;
const TEXT = 3;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
// Blocks are joined into running text, so each one needs to end like a sentence.
const terminate = (s: string) => (/[.!?:;…)]$/.test(s) ? s : `${s}.`);
const wordCount = (s: string) => (s ? s.split(' ').length : 0);

function skipped(el: HTMLElement): boolean {
  if (SKIP.has(el.rawTagName?.toLowerCase())) return true;
  if (el.hasAttribute('data-pagefind-ignore') || el.hasAttribute('data-footnote-ref')) return true;
  if (el.getAttribute('aria-hidden') === 'true' && !el.classList.contains('katex-html')) return true;
  const cls = el.classList;
  return SKIP_CLASSES.some((c) => cls.contains(c));
}

function textOf(node: Node): string {
  if (node.nodeType === TEXT) return (node as unknown as { text: string }).text;
  if (node.nodeType !== ELEMENT) return '';
  const el = node as HTMLElement;
  // KaTeX renders math twice (MathML + HTML); keep the TeX source instead, it reads better in results.
  if (el.classList.contains('katex')) {
    const tex = el.querySelector('annotation')?.text.trim();
    return tex ? ` $${tex}$ ` : '';
  }
  if (skipped(el)) return '';
  // Table cells are separated so "a | b" doesn't become "ab".
  const sep = el.rawTagName?.toLowerCase() === 'td' || el.rawTagName?.toLowerCase() === 'th' ? ' · ' : '';
  return el.childNodes.map(textOf).join('') + sep;
}

/** Walks a rendered article and groups its text into sections by h2–h4. */
export function extractSections(article: HTMLElement): Section[] {
  const sections: Section[] = [{ heading: '', anchor: '', blocks: [] }];

  const walk = (node: Node) => {
    if (node.nodeType === TEXT) {
      // Loose text directly inside a container (rare in rendered Markdown).
      const text = clean((node as unknown as { text: string }).text);
      if (text) sections.at(-1)!.blocks.push(text);
      return;
    }
    if (node.nodeType !== ELEMENT) return;
    const el = node as HTMLElement;
    if (skipped(el)) return;
    const tag = el.rawTagName?.toLowerCase();

    if (HEADINGS.has(tag)) {
      sections.push({ heading: clean(textOf(el)), anchor: el.id ?? '', blocks: [] });
      return;
    }
    const isLeafList = tag === 'li' && !el.querySelector('p, ul, ol');
    const isMath = el.classList.contains('katex-display') || el.classList.contains('katex');
    if (LEAF_BLOCKS.has(tag) || isLeafList || isMath) {
      const text = clean(textOf(el)).replace(/\s*·$/, '');
      if (text) sections.at(-1)!.blocks.push(text);
      return;
    }
    el.childNodes.forEach(walk);
  };

  article.childNodes.forEach(walk);
  return sections.filter((s) => s.blocks.length > 0);
}

function sentences(text: string): string[] {
  return text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g)?.map(clean).filter(Boolean) ?? [text];
}

/**
 * Packs a section's blocks into passages of roughly `target` words (never more than `max`
 * unless a single sentence is longer). Each new passage repeats the previous one's last
 * sentence so an idea split across the boundary is still findable.
 */
export function chunkSection(section: Section, target = 80, max = 130): Chunk[] {
  const pieces = section.blocks
    .map(terminate)
    .flatMap((block) => (wordCount(block) > max ? sentences(block) : [block]));
  const chunks: Chunk[] = [];
  let current: string[] = [];
  let words = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push({ heading: section.heading, anchor: section.anchor, text: current.join(' ') });
    const last = sentences(current.at(-1)!).at(-1)!;
    current = wordCount(last) <= 30 ? [last] : [];
    words = wordCount(current[0] ?? '');
  };

  for (const piece of pieces) {
    const n = wordCount(piece);
    if (words + n > max && words >= target / 2) flush();
    current.push(piece);
    words += n;
    if (words >= target) flush();
  }
  // Only emit the tail if it adds more than the carried-over sentence.
  if (current.length > 1 || (current.length === 1 && !chunks.length)) flush();
  // Drop near-empty passages (placeholders, stray labels).
  return chunks.filter((c) => wordCount(c.text) >= 3);
}
