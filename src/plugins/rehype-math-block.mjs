/**
 * Wraps KaTeX display equations so they can be numbered (CSS counter) and get a "Copy TeX"
 * button. The TeX comes from the annotation KaTeX already embeds. Runs after rehype-katex.
 */
const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });

function annotation(node) {
  if (node.type === 'element' && node.tagName === 'annotation') return node.children?.map((c) => c.value ?? '').join('') ?? '';
  for (const child of node.children ?? []) {
    const found = annotation(child);
    if (found) return found;
  }
  return '';
}

export function rehypeMathBlock() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        const classes = child.properties?.className ?? [];
        if (child.type === 'element' && classes.includes('katex-display')) {
          const tex = annotation(child).trim();
          return [
            el('div', { className: ['math-block'] }, [
              child,
              el('button', { type: 'button', className: ['copy-tex'], dataCopyText: tex, ariaLabel: 'Copy TeX source', dataPagefindIgnore: '' }, [{ type: 'text', value: 'TeX' }]),
            ]),
          ];
        }
        walk(child);
        return [child];
      });
    };
    walk(tree);
  };
}
