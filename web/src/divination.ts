import rawHexagrams from "./data/gua_yao_ci.json" with { type: "json" };
import { Solar } from "lunar-javascript";

export type LineValue = 6 | 7 | 8 | 9;

export type HexagramText = {
  id: number;
  name_cn: string;
  gua_ci: string;
  yao_ci: string[];
  tuan_ci: string;
  da_xiang_ci: string;
  xiao_xiang_ci: string[];
  yong_jiu?: string;
  yong_liu?: string;
};

export type DivinationResult = {
  lines: LineValue[];
  primaryKey: string;
  secondaryKey: string;
  primary: HexagramText;
  secondary: HexagramText;
  changingIndices: number[];
};

export type ReadingGuide = {
  heading: string;
  explanation: string;
  passages: Array<{ label: string; text: string; emphasis?: boolean }>;
};

export const METHODS = {
  yarrow: {
    name: "蓍草",
    title: "大衍蓍草",
    subtitle: "以蓍策十八变，静候六爻渐成",
    rule: "yarrow-v1",
  },
  coins: {
    name: "铜钱",
    title: "三枚铜钱",
    subtitle: "三钱一掷，自下而上，六次成卦",
    rule: "coins-v1",
  },
  number: {
    name: "梅花报数",
    title: "梅花报数",
    subtitle: "以报数与当前时辰起卦",
    rule: "meihua-beijing-v1",
  },
  time: {
    name: "梅花时间",
    title: "梅花时间",
    subtitle: "以年月日时，观一时之象",
    rule: "meihua-beijing-v1",
  },
} as const;
export type Method = keyof typeof METHODS;
export type CoinThrow = [2 | 3, 2 | 3, 2 | 3];
export type Provenance = {
  castAt: string;
  number?: string;
  coins?: CoinThrow[];
};
export type ReadingMeta = {
  method: Method;
  rule: string;
  provenance?: Provenance;
};
export type Reading = ReadingMeta & { subject: string; lines: LineValue[] };
export type StoredReading = Reading & {
  id: string;
  createdAt: string;
};

type RandomInt = (minimum: number, maximum: number) => number;

const hexagrams = rawHexagrams as Record<string, HexagramText>;
const HISTORY_KEY = "dayan:readings:v1";
const LAST_METHOD_KEY = "dayan:last-method:v1";

export function isMethod(value: unknown): value is Method {
  return typeof value === "string" && Object.hasOwn(METHODS, value);
}

export function isMeihua(method: Method) {
  return method === "number" || method === "time";
}

export function defaultMeta(method: Method = "yarrow"): ReadingMeta {
  return { method, rule: METHODS[method].rule };
}

export function throwCoins(randomInt: RandomInt = secureRandomInt): CoinThrow {
  return [randomInt(2, 3), randomInt(2, 3), randomInt(2, 3)] as CoinThrow;
}

export function coinLine(coins: CoinThrow): LineValue {
  return coins.reduce<number>((sum, coin) => sum + coin, 0) as LineValue;
}

const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
export const TIME_CONVENTION =
  "固定北京时间（UTC+8）；农历月日、春节换年、零点换日，闰月沿用同月数。子时为 23:00–01:00，跨子时不提前换日。";

export function beijingInput(date = new Date()): string {
  return new Date(date.getTime() + 8 * 3600_000).toISOString().slice(0, 16);
}

export function parseBeijingInput(input: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    throw new Error("请选择完整的北京时间");
  const date = new Date(`${input}:00+08:00`);
  if (
    !Number.isFinite(date.getTime()) ||
    beijingInput(date) !== input ||
    input < "1901-01-01T00:00" ||
    input > "2099-12-31T23:59"
  ) {
    throw new Error("请输入 1901–2099 年内的有效日期与时间");
  }
  return date;
}

export function timeContext(date: Date) {
  const input = beijingInput(date);
  parseBeijingInput(input);
  const parts = input.match(/\d+/g)!.map(Number);
  const [year, month, day, hour, minute] = parts;
  // Pass Beijing calendar fields explicitly: never use the device's local timezone.
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const yearBranch = ((((lunar.getYear() - 4) % 12) + 12) % 12) + 1;
  const hourBranch = (Math.floor((hour + 1) / 2) % 12) + 1;
  return {
    input,
    yearBranch,
    hourBranch,
    month: Math.abs(lunar.getMonth()),
    day: lunar.getDay(),
    leap: lunar.getMonth() < 0,
    branchName: `${BRANCHES[hourBranch - 1]}时`,
    lunarLabel: `${BRANCHES[yearBranch - 1]}年 · ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    label: `${year}年${month}月${day}日 ${input.slice(11)} · ${BRANCHES[hourBranch - 1]}时`,
  };
}

export function parseCastingNumber(value: string): number {
  if (!/^[1-9]\d{0,11}$/.test(value))
    throw new Error("请输入 1–999999999999 之间的正整数，不含小数或符号");
  return Number(value);
}

type Element = "金" | "木" | "水" | "火" | "土";
export const TRIGRAMS: ReadonlyArray<{
  name: string;
  element: Element;
  bits: string;
}> = [
  { name: "乾", element: "金", bits: "111" },
  { name: "兑", element: "金", bits: "110" },
  { name: "离", element: "火", bits: "101" },
  { name: "震", element: "木", bits: "100" },
  { name: "巽", element: "木", bits: "011" },
  { name: "坎", element: "水", bits: "010" },
  { name: "艮", element: "土", bits: "001" },
  { name: "坤", element: "土", bits: "000" },
];
const remainder = (n: number, divisor: number) => n % divisor || divisor;

export function castMeihua(
  method: "number" | "time",
  date: Date,
  number?: string,
) {
  const time = timeContext(date);
  const upperSum =
    method === "number"
      ? parseCastingNumber(number ?? "")
      : time.yearBranch + time.month + time.day;
  const lowerSum =
    method === "number" ? time.hourBranch : upperSum + time.hourBranch;
  const movingSum = upperSum + time.hourBranch;
  const upper = remainder(upperSum, 8);
  const lower = remainder(lowerSum, 8);
  const moving = remainder(movingSum, 6);
  const bits = TRIGRAMS[lower - 1].bits + TRIGRAMS[upper - 1].bits;
  const lines = [...bits].map(
    (bit, index): LineValue =>
      index === moving - 1 ? (bit === "1" ? 9 : 6) : bit === "1" ? 7 : 8,
  );
  const meta: ReadingMeta = {
    ...defaultMeta(method),
    provenance: {
      castAt: date.toISOString(),
      ...(method === "number" ? { number } : {}),
    },
  };
  return {
    lines,
    meta,
    upper,
    lower,
    moving,
    upperSum,
    lowerSum,
    movingSum,
    time,
  };
}

function trigram(lines: LineValue[]) {
  const bits = lines.map((line) => (line % 2 ? "1" : "0")).join("");
  return TRIGRAMS.find((item) => item.bits === bits)!;
}

export function elementRelation(body: Element, use: Element) {
  const generates: Record<Element, Element> = {
    木: "火",
    火: "土",
    土: "金",
    金: "水",
    水: "木",
  };
  const controls: Record<Element, Element> = {
    木: "土",
    土: "水",
    水: "火",
    火: "金",
    金: "木",
  };
  if (body === use)
    return {
      name: "体用比和",
      hint: "留意人与事之间已有的共识，思考如何让协作更顺畅。",
    };
  if (generates[use] === body)
    return {
      name: "用生体",
      hint: "留意外部的支持与资源，想一想哪些帮助值得主动争取。",
    };
  if (generates[body] === use)
    return {
      name: "体生用",
      hint: "留意自己的投入与消耗，确认时间、精力是否分配得当。",
    };
  if (controls[use] === body)
    return {
      name: "用克体",
      hint: "留意外部约束与压力，先梳理边界，再考虑可行的应对。",
    };
  return {
    name: "体克用",
    hint: "留意自己能影响的部分，思考行动的分寸及需要承担的成本。",
  };
}

export function meihuaReading(lines: LineValue[]) {
  const result = resolveDivination(lines);
  if (result.changingIndices.length !== 1)
    throw new Error("梅花卦须有且仅有一个动爻");
  const moving = result.changingIndices[0];
  const stable = lines.map((line) => (line % 2 ? 7 : 8)) as LineValue[];
  const body = trigram(moving < 3 ? stable.slice(3) : stable.slice(0, 3));
  const use = trigram(moving < 3 ? stable.slice(0, 3) : stable.slice(3));
  const mutualLines = [
    stable[1],
    stable[2],
    stable[3],
    stable[2],
    stable[3],
    stable[4],
  ];
  const changed = lines.map((line) =>
    line === 6 ? 7 : line === 9 ? 8 : line,
  ) as LineValue[];
  const changedUse = trigram(
    moving < 3 ? changed.slice(0, 3) : changed.slice(3),
  );
  return {
    body,
    use,
    moving,
    relation: elementRelation(body.element, use.element),
    mutual: resolveDivination(mutualLines),
    mutualLower: trigram(mutualLines.slice(0, 3)),
    mutualUpper: trigram(mutualLines.slice(3)),
    changedUse,
    changedRelation: elementRelation(body.element, changedUse.element),
  };
}

export function secureRandomInt(minimum: number, maximum: number) {
  const range = maximum - minimum + 1;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  const buffer = new Uint32Array(1);
  let value = 0;

  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return minimum + (value % range);
}

export function yarrowStalkCast(
  randomInt: RandomInt = secureRandomInt,
): LineValue {
  let currentStalks = 49;

  for (let change = 0; change < 3; change += 1) {
    const leftPile = randomInt(1, currentStalks - 1);
    let rightPile = currentStalks - leftPile;
    rightPile -= 1;
    const remainderLeft = leftPile % 4 || 4;
    const remainderRight = rightPile % 4 || 4;
    currentStalks -= 1 + remainderLeft + remainderRight;
  }

  // Match Python's integer division in the original implementation exactly.
  const lineCode = Math.floor(currentStalks / 4);
  if (lineCode === 6 || lineCode === 7 || lineCode === 8 || lineCode === 9) {
    return lineCode;
  }
  throw new Error(`大衍筮法计算异常：${currentStalks} 策`);
}

export function castHexagram(): LineValue[] {
  return Array.from({ length: 6 }, () => yarrowStalkCast());
}

export function isChanging(value: LineValue) {
  return value === 6 || value === 9;
}

export function lineName(value: LineValue) {
  return ({ 6: "老阴", 7: "少阳", 8: "少阴", 9: "老阳" } as const)[value];
}

function binaryKeyFromLines(lines: LineValue[], changing: boolean) {
  return lines
    .map((line) => {
      if (changing) return line === 7 || line === 6 ? "1" : "0";
      return line === 7 || line === 9 ? "1" : "0";
    })
    .reverse()
    .join("");
}

export function resolveDivination(lines: LineValue[]): DivinationResult {
  if (
    lines.length !== 6 ||
    lines.some((line) => ![6, 7, 8, 9].includes(line))
  ) {
    throw new Error("卦象必须由六个有效爻值组成");
  }

  // JSON keys are conventional binary strings: the least-significant (rightmost)
  // bit represents the lowest line, while `lines` is stored from 初爻 to 上爻.
  const primaryKey = binaryKeyFromLines(lines, false);
  const secondaryKey = binaryKeyFromLines(lines, true);
  const primary = hexagrams[primaryKey];
  const secondary = hexagrams[secondaryKey];
  if (!primary || !secondary) throw new Error("未能在卦爻辞数据中找到对应卦象");

  return {
    lines,
    primaryKey,
    secondaryKey,
    primary,
    secondary,
    changingIndices: lines.flatMap((line, index) =>
      isChanging(line) ? [index] : [],
    ),
  };
}

export function hexagramChar(hexagram: HexagramText) {
  return String.fromCodePoint(0x4dc0 + hexagram.id - 1);
}

export function linePosition(index: number) {
  return ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"][index];
}

export function buildReadingGuide(result: DivinationResult): ReadingGuide {
  const { primary, secondary, changingIndices } = result;
  const count = changingIndices.length;

  if (count === 0) {
    return {
      heading: "以本卦卦辞为主",
      explanation: "本次六爻皆静，先读本卦卦辞，再参看彖传与大象传。",
      passages: [
        {
          label: `${primary.name_cn}卦辞`,
          text: primary.gua_ci,
          emphasis: true,
        },
      ],
    };
  }

  if (count === 1) {
    const index = changingIndices[0];
    return {
      heading: `以${linePosition(index)}爻辞为主`,
      explanation: "一爻变，重点参看本卦这一变爻的爻辞与小象传。",
      passages: [
        {
          label: `${primary.name_cn}·${linePosition(index)}`,
          text: primary.yao_ci[index],
          emphasis: true,
        },
        { label: "小象", text: primary.xiao_xiang_ci[index] },
      ],
    };
  }

  if (count === 2) {
    const [lower, upper] = changingIndices;
    return {
      heading: "参看两处变爻，以上爻为主",
      explanation: "二爻变，同看本卦两条变爻；位置较高的一爻为主。",
      passages: [
        {
          label: `${primary.name_cn}·${linePosition(upper)}`,
          text: primary.yao_ci[upper],
          emphasis: true,
        },
        {
          label: `${primary.name_cn}·${linePosition(lower)}`,
          text: primary.yao_ci[lower],
        },
      ],
    };
  }

  if (count === 3) {
    return {
      heading: "本卦与变卦卦辞并读",
      explanation: "三爻变，兼看本卦与变卦卦辞，以本卦为主。",
      passages: [
        {
          label: `${primary.name_cn}卦辞`,
          text: primary.gua_ci,
          emphasis: true,
        },
        { label: `${secondary.name_cn}卦辞`, text: secondary.gua_ci },
      ],
    };
  }

  if (count === 4) {
    const stable = result.lines.flatMap((line, index) =>
      !isChanging(line) ? [index] : [],
    );
    const [lower, upper] = stable;
    return {
      heading: "参看变卦两处不变爻，以下爻为主",
      explanation: "四爻变，取变卦中两条不变爻的爻辞，位置较低的一爻为主。",
      passages: [
        {
          label: `${secondary.name_cn}·${linePosition(lower)}`,
          text: secondary.yao_ci[lower],
          emphasis: true,
        },
        {
          label: `${secondary.name_cn}·${linePosition(upper)}`,
          text: secondary.yao_ci[upper],
        },
      ],
    };
  }

  if (count === 5) {
    const stable = result.lines.findIndex((line) => !isChanging(line));
    return {
      heading: `以变卦${linePosition(stable)}爻辞为主`,
      explanation: "五爻变，重点参看变卦中唯一不变爻的爻辞。",
      passages: [
        {
          label: `${secondary.name_cn}·${linePosition(stable)}`,
          text: secondary.yao_ci[stable],
          emphasis: true,
        },
      ],
    };
  }

  if (primary.id === 1 && primary.yong_jiu) {
    return {
      heading: "六爻皆变，参看用九",
      explanation: "乾卦六爻皆变，依例参看用九。",
      passages: [{ label: "乾·用九", text: primary.yong_jiu, emphasis: true }],
    };
  }

  if (primary.id === 2 && primary.yong_liu) {
    return {
      heading: "六爻皆变，参看用六",
      explanation: "坤卦六爻皆变，依例参看用六。",
      passages: [{ label: "坤·用六", text: primary.yong_liu, emphasis: true }],
    };
  }

  return {
    heading: "六爻皆变，以变卦卦辞为主",
    explanation: "六爻皆变，乾坤之外重点参看变卦卦辞。",
    passages: [
      {
        label: `${secondary.name_cn}卦辞`,
        text: secondary.gua_ci,
        emphasis: true,
      },
    ],
  };
}

export function loadHistory(): StoredReading[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(HISTORY_KEY) ?? "[]",
    );
    if (!Array.isArray(stored)) return [];
    return stored
      .flatMap((item) => {
        const reading = validateReading(item);
        return reading &&
          typeof item.id === "string" &&
          typeof item.createdAt === "string" &&
          Number.isFinite(Date.parse(item.createdAt))
          ? [{ ...reading, id: item.id, createdAt: item.createdAt }]
          : [];
      })
      .slice(0, 40);
  } catch {
    return [];
  }
}

export function lastMethod(): Method | null {
  try {
    const method = localStorage.getItem(LAST_METHOD_KEY);
    return isMethod(method) ? method : (loadHistory()[0]?.method ?? null);
  } catch {
    return null;
  }
}

export function saveReading(
  subject: string,
  lines: LineValue[],
  meta: ReadingMeta = defaultMeta(),
) {
  const reading: StoredReading = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    subject,
    lines,
    ...meta,
  };
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([reading, ...loadHistory()].slice(0, 40)),
    );
    localStorage.setItem(LAST_METHOD_KEY, meta.method);
    return { ...reading, saved: true };
  } catch {
    return { ...reading, saved: false };
  }
}

export function deleteReading(id: string) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(loadHistory().filter((reading) => reading.id !== id)),
  );
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

export function createShareUrl(
  lines: LineValue[],
  subject?: string,
  meta: ReadingMeta = defaultMeta(),
  includeProvenance = false,
) {
  const payload = toBase64Url(
    JSON.stringify({
      v: 2,
      l: lines,
      m: meta.method,
      r: meta.rule,
      ...(subject ? { s: subject.slice(0, 160) } : {}),
      ...(includeProvenance && meta.provenance ? { p: meta.provenance } : {}),
    }),
  );
  return `${window.location.origin}${window.location.pathname}#r=${payload}`;
}

function validateReading(value: unknown): Reading | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    !Array.isArray(data.lines) ||
    data.lines.length !== 6 ||
    data.lines.some((line) => ![6, 7, 8, 9].includes(line))
  )
    return null;
  const method = data.method ?? "yarrow";
  if (
    !isMethod(method) ||
    (data.rule !== undefined && data.rule !== METHODS[method].rule)
  )
    return null;
  if (data.subject !== undefined && typeof data.subject !== "string")
    return null;
  const lines = data.lines as LineValue[];
  if (isMeihua(method) && lines.filter(isChanging).length !== 1) return null;
  const reading: Reading = {
    lines,
    subject: ((data.subject as string) ?? "").slice(0, 160),
    ...defaultMeta(method),
  };
  if (data.provenance !== undefined) {
    const p = data.provenance as Provenance;
    if (
      !p ||
      typeof p.castAt !== "string" ||
      !Number.isFinite(Date.parse(p.castAt))
    )
      return null;
    const provenance: Provenance = { castAt: new Date(p.castAt).toISOString() };
    try {
      if (method === "number" || method === "time") {
        const cast = castMeihua(method, new Date(p.castAt), p.number);
        if (cast.lines.some((line, index) => line !== lines[index]))
          return null;
        if (method === "number") provenance.number = p.number;
      }
      if (method === "coins" && p.coins !== undefined) {
        if (
          !Array.isArray(p.coins) ||
          p.coins.length !== 6 ||
          p.coins.some(
            (coins, index) =>
              !Array.isArray(coins) ||
              coins.length !== 3 ||
              coins.some((coin) => coin !== 2 && coin !== 3) ||
              coinLine(coins) !== lines[index],
          )
        )
          return null;
        provenance.coins = p.coins;
      }
    } catch {
      return null;
    }
    reading.provenance = provenance;
  }
  return reading;
}

export function readSharedResult(): Reading | null {
  const match = window.location.hash.match(/^#r=([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  try {
    if (match[1].length > 12000) return null;
    const payload = JSON.parse(fromBase64Url(match[1])) as Record<
      string,
      unknown
    >;
    if (!payload || (payload.v !== 1 && payload.v !== 2)) return null;
    if (
      payload.v === 2 &&
      (!isMethod(payload.m) || payload.r !== METHODS[payload.m].rule)
    )
      return null;
    return validateReading({
      lines: payload.l,
      subject: payload.s,
      ...(payload.v === 2
        ? { method: payload.m, rule: payload.r, provenance: payload.p }
        : {}),
    });
  } catch {
    return null;
  }
}
