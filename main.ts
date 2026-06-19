import { Editor, Notice, Plugin } from "obsidian";

/*
 * Reorder Checklist
 *
 * Command "Reorder checklist item" acts on the checklist item under the cursor.
 * The item — together with any lines indented beneath it (sub-items /
 * continuation), as a single block — is moved within its sibling group (items
 * sharing the same indent and parent):
 *
 *   - Checked   -> moved to the TOP of the checked items (just below the last
 *                  unchecked sibling).
 *   - Unchecked -> moved to the TOP of the whole group.
 *
 * Net order of every group: unchecked (original order), then checked
 * (most-recently-checked first). A blank line ends a list. Sub-items only
 * reorder within their own sub-list (run the command on the sub-item).
 *
 * Uses editorCallback, so it can only ever edit the active editor — it can
 * never create a file.
 */

const ITEM_RE = /^([ \t]*)(?:[-*+]|\d+[.)])\s+\[(.)\]/;
// Any list line (bullet or ordered, with or without a checkbox).
const LIST_RE = /^[ \t]*(?:[-*+]|\d+[.)])\s+/;

interface Block {
  start: number;
  end: number;
  lines: string[];
  checked: boolean;
}

function leadingWS(line: string): string {
  const m = line.match(/^[ \t]*/);
  return m ? m[0] : "";
}

function makeIndentWidth(tabSize: number): (ws: string) => number {
  return (ws: string): number => {
    let w = 0;
    for (const ch of ws) w += ch === "\t" ? tabSize - (w % tabSize) : 1;
    return w;
  };
}

export function reorderChecklist(editor: Editor, tabSize: number): void {
  const notify = (msg: string) => {
    try {
      new Notice(msg);
    } catch (_) {
      /* no-op */
    }
  };

  const indentWidth = makeIndentWidth(tabSize);

  const lineCount = editor.lineCount();
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) lines.push(editor.getLine(i));

  const cur = editor.getCursor().line;
  const m = lines[cur].match(ITEM_RE);
  if (!m) {
    notify("Reorder checklist: cursor is not on a checklist item");
    return;
  }
  const baseInd = indentWidth(m[1]);

  // Group = contiguous run of lines belonging to this list. It is bounded by a
  // blank line, an outdent (indent < baseInd), or a non-list line at the
  // sibling indent (e.g. a heading or paragraph). Deeper lines (indent >
  // baseInd) always stay in — they are sub-items / continuation of an item.
  const isBoundary = (line: string): boolean => {
    if (line.trim() === "") return true;
    const ind = indentWidth(leadingWS(line));
    if (ind < baseInd) return true;
    if (ind === baseInd && !LIST_RE.test(line)) return true;
    return false;
  };
  let groupTop = cur;
  for (let i = cur - 1; i >= 0; i--) {
    if (isBoundary(lines[i])) break;
    groupTop = i;
  }
  let groupBot = cur;
  for (let i = cur + 1; i < lineCount; i++) {
    if (isBoundary(lines[i])) break;
    groupBot = i;
  }

  // Split the group into sibling blocks: a new block begins at every line whose
  // indent equals baseInd; deeper lines attach to the preceding block.
  const blocks: Block[] = [];
  for (let i = groupTop; i <= groupBot; i++) {
    const ind = indentWidth(leadingWS(lines[i]));
    if (ind === baseInd || blocks.length === 0) {
      blocks.push({ start: i, end: i, lines: [lines[i]], checked: false });
    } else {
      const b = blocks[blocks.length - 1];
      b.end = i;
      b.lines.push(lines[i]);
    }
  }

  // A block is "checked" when its first line's checkbox char is not a space.
  // Non-checklist lines count as unchecked so they stay in the top region.
  for (const b of blocks) {
    const mm = b.lines[0].match(ITEM_RE);
    b.checked = !!mm && mm[2] !== " ";
  }

  const ci = blocks.findIndex((b) => cur >= b.start && cur <= b.end);
  if (ci === -1) return;
  const curBlock = blocks[ci];

  blocks.splice(ci, 1);
  let insertAt: number;
  if (curBlock.checked) {
    insertAt = blocks.findIndex((b) => b.checked);
    if (insertAt === -1) insertAt = blocks.length; // no other checked -> bottom
  } else {
    insertAt = 0; // top of the group
  }
  blocks.splice(insertAt, 0, curBlock);

  const newLines: string[] = [];
  for (const b of blocks) for (const l of b.lines) newLines.push(l);

  // No-op guard: don't write if nothing actually moved.
  let changed = false;
  for (let i = 0; i < newLines.length; i++) {
    if (newLines[i] !== lines[groupTop + i]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;

  editor.replaceRange(
    newLines.join("\n"),
    { line: groupTop, ch: 0 },
    { line: groupBot, ch: lines[groupBot].length }
  );

  // Keep the cursor on the moved item.
  let pos = groupTop;
  for (const b of blocks) {
    if (b === curBlock) break;
    pos += b.lines.length;
  }
  editor.setCursor({ line: pos, ch: editor.getLine(pos).length });
}

export default class ReorderChecklistPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: "reorder-checklist-item",
      name: "Reorder checklist item",
      editorCallback: (editor: Editor) => {
        // Obsidian stores the editor tab size in vault config; default to 4.
        let tabSize = 4;
        try {
          const v = (this.app.vault as unknown as {
            getConfig?: (k: string) => unknown;
          }).getConfig?.("tabSize");
          if (typeof v === "number" && v > 0) tabSize = v;
        } catch (_) {
          /* use default */
        }
        reorderChecklist(editor, tabSize);
      },
    });
  }
}
