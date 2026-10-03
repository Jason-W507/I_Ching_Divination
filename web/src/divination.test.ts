// @ts-nocheck -- executed directly by Node's type-stripping test runner.
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReadingGuide,
  resolveDivination,
  yarrowStalkCast,
  type LineValue,
  throwCoins,
  coinLine,
  castMeihua,
  timeContext,
  parseBeijingInput,
  parseCastingNumber,
  meihuaReading,
  elementRelation,
  loadHistory,
  saveReading,
  lastMethod,
  deleteReading,
  createShareUrl,
  readSharedResult,
} from "./divination.ts";

const KING_WEN_HEXAGRAMS: Array<[string, string]> = [
  ["111111", "乾"],
  ["000000", "坤"],
  ["100010", "屯"],
  ["010001", "蒙"],
  ["111010", "需"],
  ["010111", "訟"],
  ["010000", "師"],
  ["000010", "比"],
  ["111011", "小畜"],
  ["110111", "履"],
  ["111000", "泰"],
  ["000111", "否"],
  ["101111", "同人"],
  ["111101", "大有"],
  ["001000", "謙"],
  ["000100", "豫"],
  ["100110", "隨"],
  ["011001", "蠱"],
  ["110000", "臨"],
  ["000011", "觀"],
  ["100101", "噬嗑"],
  ["101001", "賁"],
  ["000001", "剝"],
  ["100000", "復"],
  ["100111", "无妄"],
  ["111001", "大畜"],
  ["100001", "頤"],
  ["011110", "大過"],
  ["010010", "坎"],
  ["101101", "離"],
  ["001110", "咸"],
  ["011100", "恆"],
  ["001111", "遯"],
  ["111100", "大壯"],
  ["000101", "晉"],
  ["101000", "明夷"],
  ["101011", "家人"],
  ["110101", "睽"],
  ["001010", "蹇"],
  ["010100", "解"],
  ["110001", "損"],
  ["100011", "益"],
  ["111110", "夬"],
  ["011111", "姤"],
  ["000110", "萃"],
  ["011000", "升"],
  ["010110", "困"],
  ["011010", "井"],
  ["101110", "革"],
  ["011101", "鼎"],
  ["100100", "震"],
  ["001001", "艮"],
  ["001011", "漸"],
  ["110100", "歸妹"],
  ["101100", "豐"],
  ["001101", "旅"],
  ["011011", "巽"],
  ["110110", "兌"],
  ["010011", "渙"],
  ["110010", "節"],
  ["110011", "中孚"],
  ["001100", "小過"],
  ["101010", "既濟"],
  ["010101", "未濟"],
];

test("the TypeScript yarrow calculation matches deterministic Python strategies", () => {
  assert.equal(
    yarrowStalkCast((minimum) => minimum),
    9,
  );
  assert.equal(
    yarrowStalkCast((_minimum, maximum) => maximum),
    6,
  );
  assert.equal(
    yarrowStalkCast((minimum, maximum) => Math.floor((minimum + maximum) / 2)),
    6,
  );
  assert.equal(
    yarrowStalkCast(
      (minimum, maximum) => minimum + Math.floor((maximum - minimum) / 4),
    ),
    8,
  );
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
    const lines = lowerToUpper
      .split("")
      .map((bit) => (bit === "1" ? 7 : 8)) as LineValue[];
    const result = resolveDivination(lines);
    assert.equal(result.primaryKey, key);
    assert.equal(
      result.primary.id,
      index + 1,
      `卦序 ${index + 1} 的二进制键错误`,
    );
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
  assert.match(
    buildReadingGuide(resolveDivination(fixtures[6])).heading,
    /用九/,
  );
});

test("three independent coins cover 6/7/8/9 with 1:3:3:1 outcomes", () => {
  const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
  for (const a of [2, 3])
    for (const b of [2, 3])
      for (const c of [2, 3]) counts[coinLine([a, b, c])]++;
  assert.deepEqual(counts, { 6: 1, 7: 3, 8: 3, 9: 1 });
  const faces = [2, 3, 2];
  assert.deepEqual(
    throwCoins((minimum, maximum) => {
      assert.equal(minimum, 2);
      assert.equal(maximum, 3);
      return faces.shift();
    }),
    [2, 3, 2],
  );
});

test("Meihua time reproduces the classic plum observation example", () => {
  // 2025-01-16 = lunar 辰年十二月十七; 申时. 卷一观梅占: 34/43, 革→咸, 初爻动.
  const cast = castMeihua("time", parseBeijingInput("2025-01-16T16:00"));
  assert.deepEqual(
    [
      cast.time.yearBranch,
      cast.time.month,
      cast.time.day,
      cast.time.hourBranch,
    ],
    [5, 12, 17, 9],
  );
  assert.deepEqual([cast.upper, cast.lower, cast.moving], [2, 3, 1]);
  const result = resolveDivination(cast.lines);
  assert.equal(result.primary.name_cn, "革");
  assert.equal(result.secondary.name_cn, "咸");
  const reading = meihuaReading(cast.lines);
  assert.equal(reading.body.name, "兑");
  assert.equal(reading.use.name, "离");
  assert.equal(reading.relation.name, "用克体");
  assert.equal(reading.mutualUpper.name, "乾");
  assert.equal(reading.mutualLower.name, "巽");
});

test("reported number uses its remainder for upper, hour for lower, sum for moving", () => {
  const cast = castMeihua(
    "number",
    parseBeijingInput("2026-10-03T14:32"),
    "27",
  );
  assert.deepEqual([cast.upper, cast.lower, cast.moving], [3, 8, 5]);
  assert.deepEqual(cast.lines, [8, 8, 8, 7, 6, 7]);
  const zero = castMeihua(
    "number",
    parseBeijingInput("2026-10-03T14:32"),
    "16",
  );
  assert.deepEqual([zero.upper, zero.lower, zero.moving], [8, 8, 6]);
  assert.throws(() => meihuaReading([7, 7, 7, 7, 7, 7]));
});

test("number validation accepts safe positive integers only", () => {
  for (const bad of [
    "",
    "0",
    "-2",
    "1.2",
    "1e3",
    " 2",
    "02",
    "9999999999999",
    "NaN",
  ])
    assert.throws(() => parseCastingNumber(bad));
  assert.equal(parseCastingNumber("999999999999"), 999999999999);
});

test("Beijing calendar changes year at Spring Festival, not LiChun", () => {
  const before = timeContext(parseBeijingInput("2024-02-09T23:30"));
  const after = timeContext(parseBeijingInput("2024-02-10T00:00"));
  assert.deepEqual(
    [before.yearBranch, before.month, before.day, before.hourBranch],
    [4, 12, 30, 1],
  );
  assert.deepEqual(
    [after.yearBranch, after.month, after.day, after.hourBranch],
    [5, 1, 1, 1],
  );
  assert.equal(
    timeContext(parseBeijingInput("2024-02-05T12:00")).yearBranch,
    4,
  );
  assert.equal(
    timeContext(new Date("2024-02-09T16:00:00Z")).input,
    "2024-02-10T00:00",
  );
});

test("leap months use their ordinary month number and date changes at midnight", () => {
  const leap = timeContext(parseBeijingInput("2023-03-22T12:00"));
  assert.deepEqual([leap.month, leap.day, leap.leap], [2, 1, true]);
  const beforeZi = timeContext(parseBeijingInput("2023-03-22T22:59"));
  const zi = timeContext(parseBeijingInput("2023-03-22T23:00"));
  const midnight = timeContext(parseBeijingInput("2023-03-23T00:00"));
  assert.deepEqual(
    [beforeZi.hourBranch, zi.hourBranch, midnight.hourBranch],
    [12, 1, 1],
  );
  assert.deepEqual([beforeZi.day, zi.day, midnight.day], [1, 1, 2]);
  assert.equal(
    timeContext(parseBeijingInput("2023-03-23T01:00")).hourBranch,
    2,
  );
});

test("calendar input rejects invalid or unsupported dates", () => {
  for (const date of [
    "",
    "2025-02-29T12:00",
    "2024-13-01T12:00",
    "2024-01-01T24:01",
    "1900-12-31T23:59",
    "2100-01-01T00:00",
  ])
    assert.throws(() => parseBeijingInput(date));
  assert.ok(parseBeijingInput("2024-02-29T12:00"));
  assert.ok(timeContext(parseBeijingInput("1901-01-01T00:00")));
  assert.ok(timeContext(parseBeijingInput("2099-12-31T23:59")));
});

test("the five body/use relationships are directional", () => {
  assert.equal(elementRelation("金", "金").name, "体用比和");
  assert.equal(elementRelation("金", "土").name, "用生体");
  assert.equal(elementRelation("金", "水").name, "体生用");
  assert.equal(elementRelation("金", "火").name, "用克体");
  assert.equal(elementRelation("金", "木").name, "体克用");
});

// Public persistence/share boundaries, isolated from the user's browser storage.
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
globalThis.window = {
  location: { origin: "https://example.test", pathname: "/", hash: "" },
};
const legacyLines = [7, 7, 7, 7, 7, 7];
const encodedLink = (payload) =>
  "#r=" + Buffer.from(JSON.stringify(payload)).toString("base64url");
const openLink = (url) => {
  window.location.hash = new URL(url).hash;
  return readSharedResult();
};

test("old histories become yarrow without fabricating provenance; malformed entries are ignored", () => {
  storage.clear();
  const old = {
    id: "old",
    createdAt: "2025-01-01T00:00:00Z",
    lines: legacyLines,
    subject: "旧问题",
  };
  storage.set(
    "dayan:readings:v1",
    JSON.stringify([
      old,
      null,
      { ...old, lines: [1, 2, 3, 4, 5, 6] },
      { ...old, createdAt: "bad" },
    ]),
  );
  assert.equal(loadHistory().length, 1);
  assert.equal(loadHistory()[0].method, "yarrow");
  assert.equal(loadHistory()[0].provenance, undefined);
  assert.equal(lastMethod(), "yarrow");
  deleteReading("old");
  assert.equal(loadHistory().length, 0);
});

test("full provenance survives local history; only completed casts affect the remembered method", () => {
  storage.clear();
  assert.equal(lastMethod(), null);
  const cast = castMeihua(
    "number",
    parseBeijingInput("2026-10-03T14:32"),
    "27",
  );
  assert.equal(lastMethod(), null);
  assert.equal(saveReading("学习", cast.lines, cast.meta).saved, true);
  assert.deepEqual(loadHistory()[0].provenance, cast.meta.provenance);
  assert.equal(lastMethod(), "number");
  for (let i = 0; i < 42; i++) saveReading("测试", legacyLines);
  assert.equal(loadHistory().length, 40);
});

test("v2 shares exclude question, number and timestamp unless independently opted in", () => {
  const cast = castMeihua(
    "number",
    parseBeijingInput("2026-10-03T14:32"),
    "27",
  );
  const minimal = openLink(createShareUrl(cast.lines, undefined, cast.meta));
  assert.deepEqual(minimal, {
    lines: cast.lines,
    subject: "",
    method: "number",
    rule: "meihua-beijing-v1",
  });
  assert.equal(
    openLink(createShareUrl(cast.lines, "私人问题", cast.meta)).provenance,
    undefined,
  );
  const full = openLink(createShareUrl(cast.lines, undefined, cast.meta, true));
  assert.equal(full.subject, "");
  assert.deepEqual(full.provenance, cast.meta.provenance);
  assert.deepEqual(
    openLink(createShareUrl(cast.lines, "公开问题", cast.meta, true)).lines,
    cast.lines,
  );
});

test("legacy links work; unknown rules, methods, invalid lines and inconsistent provenance fail safely", () => {
  window.location.hash = encodedLink({ v: 1, l: legacyLines, s: "旧分享" });
  assert.equal(readSharedResult().method, "yarrow");
  assert.equal(readSharedResult().subject, "旧分享");
  for (const payload of [
    null,
    { v: 3 },
    { v: 1, l: [1, 2] },
    { v: 1, l: legacyLines, s: {} },
    { v: 2, l: legacyLines, m: "future", r: "v1" },
    { v: 2, l: legacyLines, m: "yarrow", r: "future" },
    { v: 2, l: legacyLines, m: "number", r: "meihua-beijing-v1" },
    {
      v: 2,
      l: [6, 8, 8, 8, 8, 8],
      m: "number",
      r: "meihua-beijing-v1",
      p: { castAt: "2026-10-03T06:32:00Z", number: "27" },
    },
  ]) {
    window.location.hash = encodedLink(payload);
    assert.equal(readSharedResult(), null);
  }
});

test("unavailable storage never prevents displaying a completed reading", () => {
  const normal = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error("quota");
  };
  try {
    assert.equal(saveReading("仍可阅读", legacyLines).saved, false);
  } finally {
    localStorage.setItem = normal;
  }
});
