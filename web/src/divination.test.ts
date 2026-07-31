// @ts-nocheck -- executed directly by Node's type-stripping test runner.
import test from "node:test";
import assert from "node:assert/strict";
import { buildReadingGuide, resolveDivination, yarrowStalkCast, type LineValue } from "./divination.ts";

test("the TypeScript yarrow calculation matches deterministic Python strategies", () => {
  assert.equal(yarrowStalkCast((minimum) => minimum), 9);
  assert.equal(yarrowStalkCast((_minimum, maximum) => maximum), 6);
  assert.equal(yarrowStalkCast((minimum, maximum) => Math.floor((minimum + maximum) / 2)), 6);
  assert.equal(yarrowStalkCast((minimum, maximum) => minimum + Math.floor((maximum - minimum) / 4)), 8);
});

test("all-young lines resolve to the canonical Qian and Kun keys", () => {
  const qian = resolveDivination([7, 7, 7, 7, 7, 7]);
  const kun = resolveDivination([8, 8, 8, 8, 8, 8]);
  assert.equal(qian.primaryKey, "111111");
  assert.equal(qian.primary.name_cn, "乾");
  assert.equal(kun.primaryKey, "000000");
  assert.equal(kun.primary.name_cn, "坤");
});

test("changing lines produce the same secondary binary convention as the Python app", () => {
  const result = resolveDivination([9, 8, 7, 6, 8, 7]);
  assert.equal(result.primaryKey, "101001");
  assert.equal(result.secondaryKey, "001101");
  assert.deepEqual(result.changingIndices, [0, 3]);
});

test("reading guidance covers every changing-line count", () => {
  const fixtures: LineValue[][] = [
    [7, 7, 7, 7, 7, 7],
    [9, 7, 7, 7, 7, 7],
    [9, 6, 7, 7, 7, 7],
    [9, 6, 9, 7, 7, 7],
    [9, 6, 9, 6, 7, 7],
    [9, 6, 9, 6, 9, 7],
    [9, 9, 9, 9, 9, 9],
  ];

  fixtures.forEach((lines, count) => {
    const result = resolveDivination(lines);
    assert.equal(result.changingIndices.length, count);
    const guide = buildReadingGuide(result);
    assert.ok(guide.heading.length > 0);
    assert.ok(guide.passages.length > 0);
    assert.ok(guide.passages.every((passage) => passage.text.length > 0));
  });
  assert.match(buildReadingGuide(resolveDivination(fixtures[6])).heading, /用九/);
});
