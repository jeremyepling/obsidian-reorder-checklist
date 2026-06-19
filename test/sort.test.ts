import { test } from "node:test";
import assert from "node:assert/strict";
import { sortText } from "../sort";

const lines = (...l: string[]) => l.join("\n");

test("checked sink, unchecked rise, stable within each group", () => {
  const input = lines("- [ ] a", "- [x] b", "- [ ] c", "- [x] d");
  const expected = lines("- [ ] a", "- [ ] c", "- [x] b", "- [x] d");
  assert.equal(sortText(input), expected);
});

test("a heading bounds the list (the reported bug)", () => {
  const input = lines(
    "- [ ] Tape windows",
    "- [ ] Spray black",
    "",
    "## General todo",
    "- [x] Replace outlets",
    "- [ ] Caulk black",
    "",
    "## Wall panels"
  );
  const expected = lines(
    "- [ ] Tape windows",
    "- [ ] Spray black",
    "",
    "## General todo",
    "- [ ] Caulk black",
    "- [x] Replace outlets",
    "",
    "## Wall panels"
  );
  assert.equal(sortText(input), expected);
});

test("a blank line separates independent lists", () => {
  const input = lines("- [x] a", "- [ ] b", "", "- [x] c", "- [ ] d");
  const expected = lines("- [ ] b", "- [x] a", "", "- [ ] d", "- [x] c");
  assert.equal(sortText(input), expected);
});

test("nested: parent moves as a block and its sub-list is sorted", () => {
  const input = lines(
    "- [ ] A",
    "\t- [x] A1",
    "\t- [ ] A2",
    "- [x] B"
  );
  const expected = lines(
    "- [ ] A",
    "\t- [ ] A2",
    "\t- [x] A1",
    "- [x] B"
  );
  assert.equal(sortText(input), expected);
});

test("checked parent sinks carrying its (sorted) children", () => {
  const input = lines(
    "- [x] Done parent",
    "\t- [ ] leftover",
    "- [ ] Open parent"
  );
  const expected = lines(
    "- [ ] Open parent",
    "- [x] Done parent",
    "\t- [ ] leftover"
  );
  assert.equal(sortText(input), expected);
});

test("ordered list is renumbered after sorting, keeping start number", () => {
  const input = lines("1. [ ] a", "2. [x] b", "3. [ ] c");
  const expected = lines("1. [ ] a", "2. [ ] c", "3. [x] b");
  assert.equal(sortText(input), expected);
});

test("ordered list preserves a non-1 starting number", () => {
  const input = lines("3. [x] a", "4. [ ] b");
  const expected = lines("3. [ ] b", "4. [x] a");
  assert.equal(sortText(input), expected);
});

test("indented continuation line stays with its item", () => {
  const input = lines(
    "- [x] task one",
    "  more detail",
    "- [ ] task two"
  );
  const expected = lines(
    "- [ ] task two",
    "- [x] task one",
    "  more detail"
  );
  assert.equal(sortText(input), expected);
});

test("non-checklist lines pass through untouched", () => {
  const input = lines("# Title", "", "Some prose.", "", "- [x] x", "- [ ] y");
  const expected = lines("# Title", "", "Some prose.", "", "- [ ] y", "- [x] x");
  assert.equal(sortText(input), expected);
});

test("already-sorted input is unchanged (idempotent)", () => {
  const sorted = lines("- [ ] a", "- [ ] c", "- [x] b", "- [x] d");
  assert.equal(sortText(sorted), sorted);
});

test("sorting is idempotent on arbitrary input", () => {
  const input = lines(
    "- [x] a",
    "\t- [x] a1",
    "\t- [ ] a2",
    "- [ ] b",
    "",
    "1. [x] one",
    "2. [ ] two"
  );
  const once = sortText(input);
  assert.equal(sortText(once), once);
});

test("trailing newline is preserved", () => {
  assert.equal(sortText("- [x] a\n- [ ] b\n"), "- [ ] b\n- [x] a\n");
});

test("empty and prose-only documents are untouched", () => {
  assert.equal(sortText(""), "");
  assert.equal(sortText("just text\nmore text"), "just text\nmore text");
});
