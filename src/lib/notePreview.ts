/**
 * Shared helpers for rendering plain-text previews of note content.
 *
 * Note `content` in the DB can be pure HTML (saved by the Tiptap editor), pure
 * Markdown, or HYBRID (an HTML head with raw Markdown appended by the MCP
 * `append_to_note` tool). Card/list previews want clean plain text, so we strip
 * BOTH HTML tags and leftover Markdown syntax — otherwise raw `**`/`###`/`` ` ``
 * leaks into preview text.
 */

/** Remove HTML tags, returning the rendered text content. */
export function stripHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/** Strip common inline/leading Markdown syntax left over after stripHtml. */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    // links: [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // bold / italic / strikethrough markers
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    // inline code / code fences
    .replace(/`+/g, '')
    .split('\n')
    .map((line) =>
      line
        // leading heading hashes: "### Title" -> "Title"
        .replace(/^\s*#{1,6}\s+/, '')
        // leading blockquote markers: "> quote" -> "quote"
        .replace(/^\s*>+\s?/, '')
        // leading list markers: "- ", "* ", "+ ", "1. " -> ""
        .replace(/^\s*([-*+]|\d+\.)\s+/, '')
    )
    .join('\n');
}

/**
 * Produce a single-line plain-text preview from note content of any format
 * (HTML / Markdown / hybrid). Returns the first non-empty line.
 */
export function getPreviewText(content: string, fallback = 'No preview...'): string {
  const text = stripMarkdown(stripHtml(content));
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)[0];
  return firstLine || fallback;
}
