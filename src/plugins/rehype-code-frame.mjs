/**
 * Wraps highlighted code blocks in <figure class="code-frame"> with a header bar holding the
 * file name (or language) and a copy button. Rendered at build time so nothing shifts on load.
 */
const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

const COPY_ICON = el('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ariaHidden: 'true' }, [
  el('rect', { width: 14, height: 14, x: 8, y: 8, rx: 2 }),
  el('path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }),
]);

export function rehypeCodeFrame() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        // Shiki's hast uses a `class` string; other plugins use a `className` array.
        const classes = [child.properties?.className ?? [], String(child.properties?.class ?? '').split(' ')].flat();
        if (child.type !== 'element' || child.tagName !== 'pre' || !classes.includes('astro-code')) {
          walk(child);
          return child;
        }
        const title = child.properties['data-title'] ?? child.properties.dataTitle;
        const language = child.properties['data-language'] ?? child.properties.dataLanguage;
        const label = title || (language && language !== 'plaintext' ? language : 'code');
        return el('figure', { className: ['code-frame'], dataLanguage: language }, [
          el('figcaption', { className: ['code-head'], dataPagefindIgnore: '' }, [
            el('span', { className: title ? ['code-title'] : ['code-lang'] }, [text(label)]),
            ...(title && language ? [el('span', { className: ['code-lang'] }, [text(language)])] : []),
            el('button', { type: 'button', className: ['copy-button'], dataCopyCode: '', ariaLabel: 'Copy code' }, [COPY_ICON, el('span', {}, [text('Copy')])]),
          ]),
          child,
        ]);
      });
    };
    walk(tree);
  };
}
