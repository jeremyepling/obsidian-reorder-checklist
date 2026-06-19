/*
 * Pure, Obsidian-free checklist sorting.
 *
 * sortLines() sorts every list on the page. Each list — a contiguous run of
 * list items and their indented children — is bounded by blank lines, headings,
 * and any other non-list line at the sibling indent, so lists under different
 * headers stay separate. Within every list (and sub-list), items are stably
 * partitioned: unchecked first (original order), then checked (original order).
 * Ordered lists are renumbered afterwards, keeping their original start number.
 */

export const ITEM_RE = /^([ \t]*)(?:[-*+]|\d+[.)])\s+\[(.)\]/;
export const LIST_RE = /^[ \t]*(?:[-*+]|\d+[.)])\s+/;
const ORDERED_RE = /^(\s*)(\d+)([.)])(\s.*)$/;

function leadingWS(line: string): string {
  const m = line.match(/^[ \t]*/);
  return m ? m[0] : "";
}

export function makeIndentWidth(tabSize: number): (ws: string) => number {
  return (ws: string): number => {
    let w = 0;
    for (const ch of ws) w += ch === "\t" ? tabSize - (w % tabSize) : 1;
    return w;
  };
}

function isListLine(line: string): boolean {
  return LIST_RE.test(line);
}

function isChecked(line: string): boolean {
  const m = ITEM_RE.exec(line);
  return !!m && m[2] !== " ";
}

interface Rendered {
  checked: boolean;
  lines: string[];
}

export function sortLines(lines: string[], tabSize = 4): string[] {
  const indentWidth = makeIndentWidth(tabSize);
  const indent = (line: string): number => indentWidth(leadingWS(line));

  // Walk `input`, sorting each list region and passing everything else through.
  function sortRegions(input: string[]): string[] {
    const out: string[] = [];
    let i = 0;
    const n = input.length;
    while (i < n) {
      if (!isListLine(input[i])) {
        out.push(input[i]);
        i++;
        continue;
      }
      const base = indent(input[i]);
      let j = i + 1;
      while (j < n) {
        if (input[j].trim() === "") break; // blank ends the list
        const ind = indent(input[j]);
        if (ind < base) break; // outdent past the list
        if (ind === base && !isListLine(input[j])) break; // heading/paragraph
        j++; // deeper line, or a sibling list line — stays in
      }
      out.push(...sortList(input.slice(i, j)));
      i = j;
    }
    return out;
  }

  // `region[0]` is a list line at base indent; lines at that indent are
  // siblings, deeper lines are children/continuation of the preceding sibling.
  function sortList(region: string[]): string[] {
    const base = indent(region[0]);

    const blocks: { lines: string[] }[] = [];
    for (const line of region) {
      if (indent(line) === base && isListLine(line)) {
        blocks.push({ lines: [line] });
      } else {
        blocks[blocks.length - 1].lines.push(line);
      }
    }

    // Recurse into each block's children (sub-lists / continuations).
    const rendered: Rendered[] = blocks.map((blk) => {
      const head = blk.lines[0];
      const children = blk.lines.slice(1);
      return {
        checked: isChecked(head),
        lines: [head, ...(children.length ? sortRegions(children) : children)],
      };
    });

    // Stable partition: unchecked (original order), then checked (original).
    const ordered: Rendered[] = [
      ...rendered.filter((r) => !r.checked),
      ...rendered.filter((r) => r.checked),
    ];

    // Renumber an ordered list, preserving its original starting number.
    if (ORDERED_RE.test(region[0])) {
      const startMatch = blocks[0].lines[0].match(ORDERED_RE);
      let num = startMatch ? parseInt(startMatch[2], 10) : 1;
      for (const r of ordered) {
        const m = r.lines[0].match(ORDERED_RE);
        if (m) {
          r.lines[0] = `${m[1]}${num}${m[3]}${m[4]}`;
          num++;
        }
      }
    }

    const result: string[] = [];
    for (const r of ordered) for (const l of r.lines) result.push(l);
    return result;
  }

  return sortRegions(lines);
}

export function sortText(text: string, tabSize = 4): string {
  const hadTrailing = text.endsWith("\n");
  const body = hadTrailing ? text.slice(0, -1) : text;
  const sorted = sortLines(body.split("\n"), tabSize).join("\n");
  return hadTrailing ? sorted + "\n" : sorted;
}
