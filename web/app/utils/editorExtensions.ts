import { Mark, Node, mergeAttributes } from "@tiptap/core"

// Tiptap extensions for the lesson styles in main.css, so teachers format with buttons
// and the saved HTML is exactly what lesson pages already render.

/** Blue keyword emphasis: <em class="g">. Parsed before italic's plain <em>. */
export const Keyword = Mark.create({
  name: "keyword",
  parseHTML: () => [{ tag: "em.g", priority: 60 }],
  renderHTML: ({ HTMLAttributes }) => ["em", mergeAttributes(HTMLAttributes, { class: "g" }), 0],
})

/** Example box (<div class="box">) or warning box (<div class="warn">). */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ kind: { default: "box" } }),
  parseHTML: () => [
    { tag: "div.box", attrs: { kind: "box" } },
    { tag: "div.warn", attrs: { kind: "warn" } },
  ],
  renderHTML: ({ node }) => ["div", { class: node.attrs.kind === "warn" ? "warn" : "box" }, 0],
})

/** A document of exactly one paragraph, for one-line fields (questions, hints, explanations). */
export const SingleLineDoc = Node.create({
  name: "doc",
  topNode: true,
  content: "paragraph",
})

/** Editor HTML → stored HTML: empty documents become "", one-line fields lose their <p> wrapper. */
export function cleanHtml(html: string, inline: boolean) {
  const trimmed = html.trim()
  if (trimmed === "<p></p>" || trimmed === "") return ""
  if (inline) return trimmed.replace(/^<p>/, "").replace(/<\/p>$/, "")
  return trimmed
}
