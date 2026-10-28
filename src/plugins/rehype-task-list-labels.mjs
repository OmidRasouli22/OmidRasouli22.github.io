/**
 * GFM task-list checkboxes have no label, which fails accessibility audits.
 * Gives each one an aria-label describing its state.
 */
export function rehypeTaskListLabels() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'element' && node.tagName === 'input' && node.properties?.type === 'checkbox') {
        node.properties.ariaLabel = node.properties.checked ? 'Completed task' : 'Open task';
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
