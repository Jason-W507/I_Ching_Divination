import rawHexagrams from "./data/gua_yao_ci.json" with { type: "json" };

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

export type StoredReading = {
  id: string;
  createdAt: string;
  subject: string;
  lines: LineValue[];
};

type RandomInt = (minimum: number, maximum: number) => number;

const hexagrams = rawHexagrams as Record<string, HexagramText>;
const HISTORY_KEY = "dayan:readings:v1";

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

export function yarrowStalkCast(randomInt: RandomInt = secureRandomInt): LineValue {
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

export function resolveDivination(lines: LineValue[]): DivinationResult {
  if (lines.length !== 6 || lines.some((line) => ![6, 7, 8, 9].includes(line))) {
    throw new Error("卦象必须由六个有效爻值组成");
  }

  const primaryKey = lines.map((line) => (line === 7 || line === 9 ? "1" : "0")).join("");
  const secondaryKey = lines.map((line) => (line === 7 || line === 6 ? "1" : "0")).join("");
  const primary = hexagrams[primaryKey];
  const secondary = hexagrams[secondaryKey];
  if (!primary || !secondary) throw new Error("未能在卦爻辞数据中找到对应卦象");

  return {
    lines,
    primaryKey,
    secondaryKey,
    primary,
    secondary,
    changingIndices: lines.flatMap((line, index) => (isChanging(line) ? [index] : [])),
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
      passages: [{ label: `${primary.name_cn}卦辞`, text: primary.gua_ci, emphasis: true }],
    };
  }

  if (count === 1) {
    const index = changingIndices[0];
    return {
      heading: `以${linePosition(index)}爻辞为主`,
      explanation: "一爻变，重点参看本卦这一变爻的爻辞与小象传。",
      passages: [
        { label: `${primary.name_cn}·${linePosition(index)}`, text: primary.yao_ci[index], emphasis: true },
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
        { label: `${primary.name_cn}·${linePosition(upper)}`, text: primary.yao_ci[upper], emphasis: true },
        { label: `${primary.name_cn}·${linePosition(lower)}`, text: primary.yao_ci[lower] },
      ],
    };
  }

  if (count === 3) {
    return {
      heading: "本卦与变卦卦辞并读",
      explanation: "三爻变，兼看本卦与变卦卦辞，以本卦为主。",
      passages: [
        { label: `${primary.name_cn}卦辞`, text: primary.gua_ci, emphasis: true },
        { label: `${secondary.name_cn}卦辞`, text: secondary.gua_ci },
      ],
    };
  }

  if (count === 4) {
    const stable = result.lines.flatMap((line, index) => (!isChanging(line) ? [index] : []));
    const [lower, upper] = stable;
    return {
      heading: "参看变卦两处不变爻，以下爻为主",
      explanation: "四爻变，取变卦中两条不变爻的爻辞，位置较低的一爻为主。",
      passages: [
        { label: `${secondary.name_cn}·${linePosition(lower)}`, text: secondary.yao_ci[lower], emphasis: true },
        { label: `${secondary.name_cn}·${linePosition(upper)}`, text: secondary.yao_ci[upper] },
      ],
    };
  }

  if (count === 5) {
    const stable = result.lines.findIndex((line) => !isChanging(line));
    return {
      heading: `以变卦${linePosition(stable)}爻辞为主`,
      explanation: "五爻变，重点参看变卦中唯一不变爻的爻辞。",
      passages: [
        { label: `${secondary.name_cn}·${linePosition(stable)}`, text: secondary.yao_ci[stable], emphasis: true },
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
    passages: [{ label: `${secondary.name_cn}卦辞`, text: secondary.gua_ci, emphasis: true }],
  };
}

export function loadHistory(): StoredReading[] {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as StoredReading[];
    return stored.filter((item) => item.lines?.length === 6).slice(0, 40);
  } catch {
    return [];
  }
}

export function saveReading(subject: string, lines: LineValue[]) {
  const reading: StoredReading = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    subject,
    lines,
  };
  localStorage.setItem(HISTORY_KEY, JSON.stringify([reading, ...loadHistory()].slice(0, 40)));
  return reading;
}

export function deleteReading(id: string) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter((reading) => reading.id !== id)));
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function createShareUrl(lines: LineValue[], subject?: string) {
  const payload = toBase64Url(JSON.stringify({ v: 1, l: lines, ...(subject ? { s: subject } : {}) }));
  return `${window.location.origin}${window.location.pathname}#r=${payload}`;
}

export function readSharedResult(): { lines: LineValue[]; subject: string } | null {
  const match = window.location.hash.match(/^#r=([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  try {
    const payload = JSON.parse(fromBase64Url(match[1])) as { v: number; l: LineValue[]; s?: string };
    if (payload.v !== 1 || payload.l.length !== 6 || payload.l.some((line) => ![6, 7, 8, 9].includes(line))) {
      return null;
    }
    return { lines: payload.l, subject: payload.s ?? "" };
  } catch {
    return null;
  }
}
