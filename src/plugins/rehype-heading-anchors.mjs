/**
 * Appends a "#" anchor link to every h2–h4 that has an id.
 * The icon is an SVG with no text node, so it doesn't leak into the TOC text.
 */
const ICON = {
  type: 'element',
  tagName: 'svg',
  properties: {
    viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ariaHidden: 'true',
  },
  children: [
    { type: 'element', tagName: 'path', properties: { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }, children: [] },
    { type: 'element', tagName: 'path', properties: { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }, children: [] },
  ],
};

export function rehypeHeadingAnchors() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'element' && /^h[2-4]$/.test(node.tagName) && node.properties?.id) {
        node.children.push({
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#${node.properties.id}`,
            className: ['heading-anchor'],
            ariaLabel: 'Link to this section',
          },
          children: [structuredClone(ICON)],
        });
        return;
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
