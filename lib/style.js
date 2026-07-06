// Faithful CSS-string -> React style-object converter.
//
// The Claude Design source uses verbatim inline `style="..."` strings. To
// replicate the mockup pixel-for-pixel without hand-transcribing every
// declaration into a JS object (error-prone), we keep the original CSS strings
// and convert them at render time with `s()`. This mirrors the `cssToObj`
// helper in the design runtime (support.js), so behaviour matches exactly.

function kebabToCamel(prop) {
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert a CSS declaration string into a React style object.
 * Custom properties (`--foo`) are preserved as-is.
 *
 * @param {string} css e.g. "position: absolute; inset: 0; z-index: 2"
 * @returns {Object} React style object
 */
export function s(css) {
  const out = {};
  if (!css) return out;
  for (const decl of String(css).split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    if (!prop) continue;
    const value = decl.slice(i + 1).trim();
    out[prop.startsWith("--") ? prop : kebabToCamel(prop)] = value;
  }
  return out;
}

/**
 * Merge several CSS strings and/or style objects into one style object.
 * Later arguments win. Accepts strings (parsed via `s`) or plain objects.
 */
export function sx(...parts) {
  return parts.reduce((acc, part) => {
    if (!part) return acc;
    return Object.assign(acc, typeof part === "string" ? s(part) : part);
  }, {});
}
