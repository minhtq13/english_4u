<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3"
import StarterKit from "@tiptap/starter-kit"
import { TableKit } from "@tiptap/extension-table"
import { Placeholder } from "@tiptap/extensions"

// The live Tiptap editor behind RichEditor. `inline` = one paragraph with text formatting only.
const props = defineProps<{ modelValue: string; inline?: boolean; placeholder?: string; autofocus?: boolean }>()
const { t } = useI18n()
const emit = defineEmits<{ "update:modelValue": [html: string]; blur: [] }>()

const editor = useEditor({
  content: props.modelValue,
  autofocus: props.autofocus ? "end" : false,
  extensions: [
    StarterKit.configure(props.inline
      ? { document: false, heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false,
          codeBlock: false, code: false, horizontalRule: false, link: false, trailingNode: false }
      : { heading: { levels: [3] }, codeBlock: false, code: false, blockquote: false, horizontalRule: false, link: false }),
    Keyword,
    Placeholder.configure({ placeholder: props.placeholder ?? "" }),
    ...(props.inline ? [SingleLineDoc] : [Callout, TableKit.configure({ table: { resizable: false } })]),
  ],
  onUpdate: ({ editor }) => emit("update:modelValue", cleanHtml(editor.getHTML(), !!props.inline)),
  onBlur: () => emit("blur"),
})

// Content replaced from outside (e.g. a template applied) is loaded without echoing an update.
watch(() => props.modelValue, (html) => {
  const ed = editor.value
  if (ed && html !== cleanHtml(ed.getHTML(), !!props.inline)) ed.commands.setContent(html, { emitUpdate: false })
})
onBeforeUnmount(() => editor.value?.destroy())

// label / title are i18n keys under editor.* (resolved when rendered, so they follow the language).
type Btn = { label: string; title: string; run: () => void; active?: () => boolean; show?: () => boolean }
const chain = () => editor.value!.chain().focus()
const is = (name: string, attrs?: Record<string, unknown>) => !!editor.value?.isActive(name, attrs)
const inTable = () => is("table")

const textButtons: Btn[] = [
  { label: "bold", title: "boldTitle", run: () => chain().toggleBold().run(), active: () => is("bold") },
  { label: "italic", title: "italicTitle", run: () => chain().toggleItalic().run(), active: () => is("italic") },
  { label: "keyword", title: "keywordTitle", run: () => chain().toggleMark("keyword").run(), active: () => is("keyword") },
  { label: "strike", title: "strikeTitle", run: () => chain().toggleStrike().run(), active: () => is("strike") },
]
const blockButtons: Btn[] = [
  { label: "heading", title: "headingTitle", run: () => chain().toggleHeading({ level: 3 }).run(), active: () => is("heading") },
  { label: "bullets", title: "bulletsTitle", run: () => chain().toggleBulletList().run(), active: () => is("bulletList") },
  { label: "numbers", title: "numbersTitle", run: () => chain().toggleOrderedList().run(), active: () => is("orderedList") },
  { label: "box", title: "boxTitle", run: () => chain().toggleWrap("callout", { kind: "box" }).run(), active: () => is("callout", { kind: "box" }) },
  { label: "warn", title: "warnTitle", run: () => chain().toggleWrap("callout", { kind: "warn" }).run(), active: () => is("callout", { kind: "warn" }) },
  { label: "table", title: "tableTitle", run: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), show: () => !inTable() },
  { label: "addRow", title: "addRowTitle", run: () => chain().addRowAfter().run(), show: inTable },
  { label: "addCol", title: "addColTitle", run: () => chain().addColumnAfter().run(), show: inTable },
  { label: "delRow", title: "delRowTitle", run: () => chain().deleteRow().run(), show: inTable },
  { label: "delCol", title: "delColTitle", run: () => chain().deleteColumn().run(), show: inTable },
  { label: "delTable", title: "delTableTitle", run: () => chain().deleteTable().run(), show: inTable },
]
const historyButtons: Btn[] = [
  { label: "undo", title: "undoTitle", run: () => chain().undo().run() },
  { label: "redo", title: "redoTitle", run: () => chain().redo().run() },
]
const groups = computed(() => (props.inline ? [textButtons] : [textButtons, blockButtons, historyButtons]))
</script>

<template>
  <div class="rich" :class="{ inline }">
    <div v-if="editor" class="toolbar" role="toolbar" :aria-label="t('editor.toolbar')">
      <template v-for="(g, gi) in groups" :key="gi">
        <span v-if="gi" class="sep" />
        <template v-for="b in g" :key="b.label">
          <button
            v-if="!b.show || b.show()"
            type="button"
            class="tb"
            :class="{ on: b.active?.(), bold: b.label === 'bold', italic: b.label === 'italic' }"
            :title="t(`editor.${b.title}`)"
            @mousedown.prevent
            @click="b.run()"
          >{{ t(`editor.${b.label}`) }}</button>
        </template>
      </template>
    </div>
    <EditorContent :editor="editor" class="explain rich-content" />
  </div>
</template>

<style scoped>
.rich { border: 1px solid var(--line); border-radius: 8px; background: var(--card); }
.rich:focus-within { border-color: var(--accent); }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 6px; border-bottom: 1px solid var(--line);
  background: var(--bg); border-radius: 8px 8px 0 0; position: sticky; top: 0; z-index: 1; }
.inline .toolbar { padding: 4px; }
.tb { border: 1px solid transparent; background: none; color: var(--text); border-radius: 6px; padding: 2px 8px;
  font-size: .82rem; cursor: pointer; line-height: 1.6; }
.tb:hover { border-color: var(--line); background: var(--card); }
.tb.on { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
.tb.bold { font-weight: 700; }
.tb.italic { font-style: italic; }
.sep { width: 1px; height: 18px; background: var(--line); margin: 0 4px; }
.rich-content { padding: 8px 12px; font-weight: 400; }
.inline .rich-content { padding: 6px 10px; }
.rich-content :deep(.ProseMirror) { outline: none; min-height: 1.6em; }
.rich:not(.inline) .rich-content :deep(.ProseMirror) { min-height: 180px; }
.rich-content :deep(p) { margin: 0 0 8px; }
.inline .rich-content :deep(p) { margin: 0; }
.rich-content :deep(p.is-editor-empty:first-child::before) { content: attr(data-placeholder); color: var(--muted); float: left; height: 0; pointer-events: none; }
.rich-content :deep(table) { display: table; table-layout: fixed; }
.rich-content :deep(td), .rich-content :deep(th) { border: 1px solid var(--line); position: relative; }
.rich-content :deep(.selectedCell)::after { content: ""; position: absolute; inset: 0; background: var(--accent-soft); opacity: .6; pointer-events: none; }
.rich-content :deep(.tableWrapper) { overflow-x: auto; }
</style>
