import { Editor, Plugin } from "obsidian";
import { sortLines } from "./sort";

/*
 * Reorder Checklist
 *
 * Command "Sort checklists on page" sorts every checklist in the active note.
 * Each list (bounded by blank lines, headings, and other non-list lines) is
 * sorted independently: unchecked items rise to the top, checked items sink to
 * the bottom, sub-lists are sorted within their parent, and ordered lists are
 * renumbered. Uses editorCallback, so it can only ever edit the open note.
 */

function getTabSize(app: Plugin["app"]): number {
  try {
    const v = (app.vault as unknown as {
      getConfig?: (k: string) => unknown;
    }).getConfig?.("tabSize");
    if (typeof v === "number" && v > 0) return v;
  } catch (_) {
    /* fall through */
  }
  return 4;
}

function sortPage(editor: Editor, app: Plugin["app"]): void {
  const tabSize = getTabSize(app);

  const n = editor.lineCount();
  const lines: string[] = [];
  for (let i = 0; i < n; i++) lines.push(editor.getLine(i));

  const sorted = sortLines(lines, tabSize);

  let changed = sorted.length !== lines.length;
  if (!changed) {
    for (let i = 0; i < lines.length; i++) {
      if (sorted[i] !== lines[i]) {
        changed = true;
        break;
      }
    }
  }
  if (!changed) return;

  const cur = editor.getCursor();
  const last = n - 1;
  editor.replaceRange(
    sorted.join("\n"),
    { line: 0, ch: 0 },
    { line: last, ch: editor.getLine(last).length }
  );

  // Line count is unchanged by a sort, so the cursor line stays valid; clamp
  // defensively and keep the column.
  const cl = Math.min(cur.line, editor.lineCount() - 1);
  editor.setCursor({ line: cl, ch: Math.min(cur.ch, editor.getLine(cl).length) });
}

export default class ReorderChecklistPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: "reorder-checklist-item",
      name: "Sort checklists on page",
      editorCallback: (editor: Editor) => sortPage(editor, this.app),
    });
  }
}
