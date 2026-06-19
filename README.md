# Reorder Checklist

An [Obsidian](https://obsidian.md) plugin that keeps checklists tidy: when you toggle a checkbox and run the command, the item moves within its list so that **unchecked items stay on top and checked items sink to the bottom** — while respecting indentation.

## Behavior

Run the **Reorder checklist item** command (bind a hotkey to it) with your cursor on a checklist line. The item — together with any lines indented beneath it (sub-items / wrapped continuation), as a single block — moves within its **sibling group** (items at the same indent under the same parent):

- **Checked** → moves to the **top of the checked items** (just below the last unchecked sibling).
- **Unchecked** → moves to the **top of the group**.

So each group ends up ordered: unchecked items (original order), then checked items (most‑recently‑checked first).

### Details

- **Indentation aware.** A nested item carries its sub-items with it and only reorders within its own sub-list. Run the command on a sub-item to reorder that sub-list.
- **Blank line ends a list.** Two checklists separated by a blank line are independent.
- **Marker preserved.** Works with `-`, `*`, `+`, and ordered (`1.`) markers. Only `[ ]` counts as unchecked; any other state (`[x]`, `[X]`, `[/]`, …) counts as checked.
- **Cannot create notes.** The command only ever edits the currently open editor.

## Example

Cursor on "Buy milk", check it, run the command:

```markdown
- [ ] Buy milk
- [ ] Walk dog
  - [ ] Get leash
  - [ ] Grab bags
- [ ] Pay bills
```

"Buy milk" (and any sub-items) drops below the unchecked siblings. Checking "Get leash" only reorders within the "Walk dog" sub-list.

## Install (manual)

1. Build (see below) or download `main.js` and `manifest.json` from a release.
2. Copy `main.js` and `manifest.json` into your vault at
   `.obsidian/plugins/reorder-checklist/`.
3. Reload Obsidian, then enable **Reorder Checklist** in
   Settings → Community plugins.
4. Assign a hotkey: Settings → Hotkeys → search "Reorder checklist item".

## Develop

```bash
npm install
npm run dev     # watch build -> main.js
npm run build   # type-check + production build
```

## License

[MIT](LICENSE)
