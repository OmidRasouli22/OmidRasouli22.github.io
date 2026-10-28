/**
 * Sets `hasMath` on the post's remark frontmatter when it contains math,
 * so the KaTeX stylesheet is only loaded on pages that need it.
 */
export function remarkMathFlag() {
  return (tree, file) => {
    const hasMath = (node) =>
      node.type === 'math' || node.type === 'inlineMath' || (node.children ?? []).some(hasMath);
    if (hasMath(tree)) {
      file.data.astro ??= {};
      file.data.astro.frontmatter ??= {};
      file.data.astro.frontmatter.hasMath = true;
    }
  };
}
