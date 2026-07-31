// @ts-nocheck -- executed directly by Node's type-stripping test runner.
import test from "node:test";
import assert from "node:assert/strict";
import { buildReadingGuide, resolveDivination, yarrowStalkCast, type LineValue } from "./divination.ts";

const KING_WEN_HEXAGRAMS: Array<[string, string]> = [
  ["111111", "乾"], ["000000", "坤"], ["100010", "屯"], ["010001", "蒙"],
  ["111010", "需"], ["010111", "訟"], ["010000", "師"], ["000010", "比"],
  ["111011", "小畜"], ["110111", "履"], ["111000", "泰"], ["000111", "否"],
  ["101111", "同人"], ["111101", "大有"], ["001000", "謙"], ["000100", "豫"],
  ["100110", "隨"], ["011001", "蠱"], ["110000", "臨"], ["000011", "觀"],
  ["100101", "噬嗑"], ["101001", "賁"], ["000001", "剝"], ["100000", "復"],
  ["100111", "无妄"], ["111001", "大畜"], ["100001", "頤"], ["011110", "大過"],
  ["010010", "坎"], ["101101", "離"], ["001110", "咸"], ["011100", "恆"],
  ["001111", "遯"], ["111100", "大壯"], ["000101", "晉"], ["101000", "明夷"],
  ["101011", "家人"], ["110101", "睽"], ["001010", "蹇"], ["010100", "解"],
  ["110001", "損"], ["100011", "益"], ["111110", "夬"], ["011111", "姤"],
  ["000110", "萃"], ["011000", "升"], ["010110", "困"], ["011010", "井"],
  ["101110", "革"], ["011101", "鼎"], ["100100", "震"], ["001001", "艮"],
  ["001011", "漸"], ["110100", "歸妹"], ["101100", "豐"], ["001101", "旅"],
  ["011011", "巽"], ["110110", "兌"], ["010011", "渙"], ["110010", "節"],
  ["110011", "中孚"], ["001100", "小過"], ["101010", "既濟"], ["010101", "未濟"],
];

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

test("all 64 hexagram keys use the least-significant bit as the lower line", () => {
  KING_WEN_HEXAGRAMS.forEach(([lowerToUpper, name], index) => {
    const key = lowerToUpper.split("").reverse().join("");
    const lines = lowerToUpper.split("").map((bit) => (bit === "1" ? 7 : 8)) as LineValue[];
    const result = resolveDivination(lines);
    assert.equal(result.primaryKey, key);
    assert.equal(result.primary.id, index + 1, `卦序 ${index + 1} 的二进制键错误`);
    assert.equal(result.primary.name_cn, name, `${name}卦的二进制键错误`);
  });
});

test("changing lines preserve the least-significant-bit lower-line convention", () => {
  const result = resolveDivination([9, 8, 7, 6, 8, 7]);
  assert.equal(result.primaryKey, "100101");
  assert.equal(result.secondaryKey, "101100");
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
