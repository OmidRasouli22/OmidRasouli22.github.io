/**
 * Shiki transformer: reads `title="file.py"` from a code fence's meta string and puts it on the
 * <pre> as data-title, for rehype-code-frame to show in the header.
 */
export function transformerCodeTitle() {
  return {
    name: 'code-title',
    pre(node) {
      const title = this.options.meta?.__raw?.match(/title=(?:"([^"]+)"|'([^']+)')/);
      if (title) node.properties['data-title'] = title[1] ?? title[2];
    },
  };
}
