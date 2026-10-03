import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  CopyIcon,
  LockClosedIcon,
  MoonIcon,
  Pencil2Icon,
  ReaderIcon,
  Share2Icon,
  SunIcon,
  TrashIcon,
  QuestionMarkCircledIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import { motion } from "motion/react";
import {
  BottomSheet,
  FlowStack,
  KeyboardTextarea,
  KeyboardInput,
  MobileScroll,
  useKeyboard,
  type FlowControls,
  type FlowScreen,
} from "./mobile";
import {
  buildReadingGuide,
  castHexagram,
  createShareUrl,
  deleteReading,
  hexagramChar,
  isChanging,
  lineName,
  linePosition,
  loadHistory,
  readSharedResult,
  resolveDivination,
  saveReading,
  type DivinationResult,
  type LineValue,
  type StoredReading,
  METHODS,
  TIME_CONVENTION,
  beijingInput,
  parseBeijingInput,
  timeContext,
  parseCastingNumber,
  castMeihua,
  coinLine,
  throwCoins,
  defaultMeta,
  isMeihua,
  lastMethod,
  meihuaReading,
  elementRelation,
  type Method,
  type ReadingMeta,
  type CoinThrow,
} from "./divination";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(
  null,
);

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Theme context missing");
  return context;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      onClick={toggle}
      aria-label={`切换为${theme === "light" ? "暗色" : "浅色"}主题`}
    >
      <span data-active={theme === "light" ? "true" : "false"}>
        <SunIcon />
      </span>
      <span data-active={theme === "dark" ? "true" : "false"}>
        <MoonIcon />
      </span>
    </button>
  );
}

function ScreenTopbar({ flow, title }: { flow: FlowControls; title: string }) {
  return (
    <div className="screen-topbar">
      <button
        className="icon-button"
        type="button"
        onClick={flow.canGoBack ? flow.pop : restart}
        aria-label={flow.canGoBack ? "返回" : "返回起卦"}
      >
        <ChevronLeftIcon />
      </button>
      <span>{title}</span>
      <ThemeToggle />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark">
      <div className="brand-rule" aria-hidden="true">
        <span />
      </div>
      <div>
        <h1>大衍</h1>
        <p>周易占卜</p>
      </div>
    </div>
  );
}

function HexagramGlyph({
  result,
  secondary = false,
  compact = false,
}: {
  result: DivinationResult;
  secondary?: boolean;
  compact?: boolean;
}) {
  const hexagram = secondary ? result.secondary : result.primary;
  return (
    <div
      className={`hexagram-glyph${compact ? " compact" : ""}`}
      aria-label={`${hexagram.name_cn}卦`}
    >
      <span aria-hidden="true">{hexagramChar(hexagram)}</span>
      <strong>{hexagram.name_cn}</strong>
      <small>第 {hexagram.id} 卦</small>
    </div>
  );
}

type StartRequest = {
  subject: string;
  method: Method;
  castAt: Date;
  number?: string;
};

function restart() {
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  window.location.reload();
}

function homeScreen(
  onStart: (request: StartRequest, flow: FlowControls) => void,
  onHistory: (flow: FlowControls) => void,
): FlowScreen {
  return {
    id: "home",
    render: (flow) => (
      <HomeScreen
        onStart={(request) => onStart(request, flow)}
        onHistory={() => onHistory(flow)}
      />
    ),
  };
}

function MethodHelp({ method }: { method: Method }) {
  return (
    <details className="method-help" key={method}>
      <summary>
        <QuestionMarkCircledIcon />
        了解此方法
      </summary>
      <div>
        {method === "yarrow" ? (
          <p>
            模拟 49
            根蓍草，三变成一爻，六爻共十八变。依原有大衍算法起卦，按动爻数量提供卦爻辞阅读参考。
          </p>
        ) : null}
        {method === "coins" ? (
          <p>
            每次独立掷出三枚铜钱，约定字面为 2、背面为 3。总和 6 为老阴、7
            为少阳、8 为少阴、9
            为老阳；老阴、老阳为动爻。自初爻至上爻共掷六次，也可一键完成。
          </p>
        ) : null}
        {isMeihua(method) ? (
          <>
            <p>
              {method === "number"
                ? "报一个正整数，报数除以八取上卦，当前时辰数除以八取下卦，报数与时辰数之和除以六取动爻。"
                : "年支数＋农历月数＋农历日数，除以八取上卦；再加时辰数，除以八取下卦、除以六取动爻。"}
            </p>
            <p>
              卦序：乾 1、兑 2、离 3、震 4、巽 5、坎 6、艮 7、坤
              8。余零作八或六；子 1 至亥 12。
            </p>
            <p>{TIME_CONVENTION}</p>
            <p>
              支持 1901–2099
              年。取时在开始起卦时锁定。此处是明确约定的一种梅花起法，并非唯一流派。
            </p>
            <a
              href="https://zh.wikisource.org/zh-hant/梅花易數/卷一"
              target="_blank"
              rel="noreferrer"
            >
              方法依据：《梅花易数》卷一
            </a>
          </>
        ) : null}
      </div>
    </details>
  );
}

function HomeScreen({
  onStart,
  onHistory,
}: {
  onStart: (request: StartRequest) => void;
  onHistory: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [method, setMethod] = useState<Method | null>(() => lastMethod());
  const [number, setNumber] = useState("");
  const [customTime, setCustomTime] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState("");
  const keyboard = useKeyboard();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const selectMethod = (value: Method) => {
    keyboard.hide();
    setMethod(value);
    setError("");
  };
  let preview: ReturnType<typeof timeContext> | null = null;
  try {
    preview = timeContext(
      method === "time" && customTime !== null
        ? parseBeijingInput(customTime)
        : now,
    );
  } catch {
    /* Validation appears next to the input. */
  }
  const begin = () => {
    if (!method || !subject.trim()) return;
    try {
      if (method === "number") parseCastingNumber(number);
      const castAt =
        method === "time" && customTime !== null
          ? parseBeijingInput(customTime)
          : new Date();
      if (isMeihua(method)) timeContext(castAt);
      keyboard.hide();
      onStart({ subject: subject.trim(), method, castAt, number });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "请检查输入后重试");
    }
  };

  return (
    <div className="method-shell" data-testid="home-screen">
      <aside className="method-sidebar">
        <BrandMark />
        <nav aria-label="起卦方法">
          <p>起卦方法</p>
          {(Object.keys(METHODS) as Method[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-current={key === method ? "page" : undefined}
              onClick={() => selectMethod(key)}
            >
              {METHODS[key].name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button type="button" className="text-button" onClick={onHistory}>
            <ReaderIcon />
            查看记录
          </button>
          <p>正心诚意，问其所疑</p>
          <small>
            <LockClosedIcon />
            问题仅存于此设备
          </small>
        </div>
      </aside>
      <MobileScroll className="app-screen method-scroll">
        <main
          className={`dayan-screen method-home${method ? "" : " first-visit"}`}
        >
          <div className="cosmic-rings" aria-hidden="true" />
          <header className="method-header">
            <div className="mobile-brand">
              <BrandMark />
            </div>
            <ThemeToggle />
          </header>
          {method ? (
            <>
              <div className="mobile-method-picker">
                <select
                  aria-label="起卦方法"
                  value={method}
                  onChange={(event) =>
                    selectMethod(event.target.value as Method)
                  }
                >
                  {(Object.keys(METHODS) as Method[]).map((key) => (
                    <option key={key} value={key}>
                      {METHODS[key].name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon />
              </div>
              <div className="method-heading">
                <h2>{METHODS[method].title}</h2>
                <p>{METHODS[method].subtitle}</p>
                <MethodHelp method={method} />
              </div>
              <div
                className="hexagram-preview method-ornament"
                aria-hidden="true"
              >
                <div className="preview-figure">
                  <span>䷀</span>
                  <ol>
                    <li>上爻</li>
                    <li>五爻</li>
                    <li>四爻</li>
                    <li>三爻</li>
                    <li>二爻</li>
                    <li>初爻</li>
                  </ol>
                </div>
                <div className="preview-caption">
                  <i />
                  天地之序
                </div>
              </div>

              <div className="method-form">
                <section
                  className="question-section"
                  aria-labelledby="question-label"
                >
                  <label id="question-label" htmlFor="subject">
                    所占之事
                  </label>
                  <div className="textarea-wrap">
                    <KeyboardTextarea
                      id="subject"
                      value={subject}
                      maxLength={160}
                      placeholder="例如：我该如何看待眼前的工作选择？"
                      onChange={(event) =>
                        setSubject(event.currentTarget.value)
                      }
                      onBlur={() => keyboard.hide()}
                    />
                    <Pencil2Icon aria-hidden="true" />
                  </div>
                  <div className="field-meta">
                    <span>
                      <LockClosedIcon />
                      问题仅存于此设备
                    </span>
                    <span>{subject.length}/160</span>
                  </div>
                </section>

                {isMeihua(method) ? (
                  <div className="method-fields">
                    {method === "number" ? (
                      <div className="method-field">
                        <label htmlFor="casting-number">心中之数</label>
                        <KeyboardInput
                          id="casting-number"
                          inputMode="numeric"
                          value={number}
                          maxLength={12}
                          placeholder="例如：27"
                          aria-describedby="number-hint"
                          aria-invalid={Boolean(error)}
                          onChange={(event) => {
                            setNumber(event.currentTarget.value);
                            setError("");
                          }}
                          onBlur={() => keyboard.hide()}
                        />
                        <small id="number-hint">
                          请输入正整数（最多 12 位）
                        </small>
                      </div>
                    ) : (
                      <div className="method-field">
                        <label htmlFor="casting-time">
                          起卦时间（北京时间）
                        </label>
                        <KeyboardInput
                          id="casting-time"
                          type="datetime-local"
                          min="1901-01-01T00:00"
                          max="2099-12-31T23:59"
                          value={customTime ?? beijingInput(now)}
                          aria-invalid={Boolean(error)}
                          onInput={(event) => {
                            setCustomTime(event.currentTarget.value);
                            setError("");
                          }}
                          onChange={(event) => {
                            setCustomTime(event.currentTarget.value);
                            setError("");
                          }}
                          onBlur={() => keyboard.hide()}
                        />
                        <button
                          type="button"
                          className="text-button reset-time"
                          onClick={() => {
                            setCustomTime(null);
                            setNow(new Date());
                            setError("");
                          }}
                        >
                          使用当前时间
                        </button>
                      </div>
                    )}
                    <div className="method-field">
                      <label>
                        {method === "number"
                          ? "当前时辰（北京时间）"
                          : "农历与时辰"}
                      </label>
                      <div className="time-preview">
                        {preview
                          ? method === "number"
                            ? preview.label
                            : `${preview.lunarLabel} · ${preview.branchName}`
                          : "请填写有效的日期与时间"}
                      </div>
                      <small>
                        {method === "number" || customTime === null
                          ? "点击起卦时锁定时间"
                          : "以此指定时间起卦"}
                      </small>
                    </div>
                  </div>
                ) : (
                  <p className="method-instruction">
                    {method === "coins"
                      ? "每次掷三枚铜钱，六次成卦。进入后也可一键完成。"
                      : "静心所问，依次演示六爻生成；约需十秒。"}
                  </p>
                )}
                {error ? (
                  <p className="input-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="method-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      !subject.trim() || (method === "number" && !number)
                    }
                    onClick={begin}
                  >
                    开始起卦
                  </button>
                  <button
                    className="text-button history-shortcut"
                    type="button"
                    onClick={onHistory}
                  >
                    <ReaderIcon />
                    查看记录
                  </button>
                </div>
                <p className="quiet-note">
                  <span className="mobile-privacy">
                    <LockClosedIcon />
                    问题仅存于此设备
                  </span>
                  <span className="home-disclaimer">
                    占卜结果仅供研习与自省，重大决定仍请理性判断。
                  </span>
                </p>
              </div>
            </>
          ) : (
            <section className="method-welcome">
              <span className="section-kicker">一事一问，从容起卦</span>
              <h2>择一法，问所思</h2>
              <p>
                不同的起卦方式，同一份静心自省。
                <br />
                选一种适合此刻的方法，之后仍可随时切换。
              </p>
              <div className="method-options">
                {(Object.keys(METHODS) as Method[]).map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => selectMethod(key)}
                  >
                    <span>
                      <strong>{METHODS[key].title}</strong>
                      <small>{METHODS[key].subtitle}</small>
                    </span>
                    <ArrowRightIcon />
                  </button>
                ))}
              </div>
              <button
                className="text-button history-shortcut"
                type="button"
                onClick={onHistory}
              >
                <ReaderIcon />
                查看记录
              </button>
              <p className="quiet-note">
                <LockClosedIcon /> 无需注册，问题与记录仅存于此设备。
              </p>
            </section>
          )}
        </main>
      </MobileScroll>
    </div>
  );
}

function CoinCastingScreen({
  flow,
  subject,
  onComplete,
}: {
  flow: FlowControls;
  subject: string;
  onComplete: (coins: CoinThrow[]) => void;
}) {
  const [throws, setThrows] = useState<CoinThrow[]>([]);
  const current = useRef<CoinThrow[]>([]);
  const done = useRef(false);
  const cast = (all: boolean) => {
    if (current.current.length === 6) return;
    current.current = [
      ...current.current,
      ...Array.from({ length: all ? 6 - current.current.length : 1 }, () =>
        throwCoins(),
      ),
    ];
    setThrows(current.current);
  };
  useEffect(() => {
    if (throws.length !== 6) return;
    const timer = window.setTimeout(() => {
      if (!done.current) {
        done.current = true;
        onComplete(throws);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [throws, onComplete]);
  return (
    <MobileScroll className="app-screen">
      <main className="dayan-screen coin-screen">
        <ScreenTopbar flow={flow} title="三枚铜钱" />
        <div className="coin-heading">
          <span className="section-kicker">自下而上 · 六次成卦</span>
          <h2>
            {throws.length === 6
              ? "六爻已成"
              : `第 ${throws.length + 1} 次掷钱`}
          </h2>
          <p>{subject}</p>
        </div>
        <ol className="coin-lines" aria-label="六次掷钱结果">
          {[5, 4, 3, 2, 1, 0].map((index) => (
            <li key={index} data-complete={Boolean(throws[index])}>
              <span>{linePosition(index)}</span>
              <div>
                {throws[index] ? (
                  throws[index].map((face, i) => (
                    <span className="coin-face" key={i}>
                      {face === 2 ? "字" : "背"}
                      <small>{face}</small>
                    </span>
                  ))
                ) : (
                  <span className="coin-pending">待掷</span>
                )}
              </div>
              <strong>
                {throws[index]
                  ? `${coinLine(throws[index])} · ${lineName(coinLine(throws[index]))}`
                  : "—"}
              </strong>
            </li>
          ))}
        </ol>
        <div className="coin-actions">
          <button
            type="button"
            className="primary-button"
            disabled={throws.length === 6}
            onClick={() => cast(false)}
          >
            {throws.length === 6 ? "正在呈现卦象…" : "掷三枚铜钱"}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={throws.length === 6}
            onClick={() => cast(true)}
          >
            {throws.length ? "一键完成余下爻" : "一键完成六爻"}
          </button>
        </div>
        <p className="quiet-note" aria-live="polite">
          已完成 {throws.length}/6 爻 · 字 2，背 3；6、9 为动爻。
        </p>
      </main>
    </MobileScroll>
  );
}

function castingScreen(
  subject: string,
  lines: LineValue[],
  onComplete: (flow: FlowControls) => void,
): FlowScreen {
  return {
    id: "casting",
    render: (flow) => (
      <CastingScreen
        subject={subject}
        lines={lines}
        onComplete={() => onComplete(flow)}
      />
    ),
  };
}

function CastingScreen({
  subject,
  lines,
  onComplete,
}: {
  subject: string;
  lines: LineValue[];
  onComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const interval = reduced ? 90 : 1400;
    if (revealed >= 6) {
      const finish = window.setTimeout(onComplete, reduced ? 100 : 900);
      return () => window.clearTimeout(finish);
    }
    const timer = window.setTimeout(
      () => setRevealed((value) => value + 1),
      interval,
    );
    return () => window.clearTimeout(timer);
  }, [onComplete, revealed]);

  return (
    <MobileScroll className="app-screen">
      <main
        className="dayan-screen casting-screen"
        data-testid="casting-screen"
      >
        <div className="cosmic-rings casting-rings" aria-hidden="true" />
        <div className="casting-brand">
          <BrandMark />
          <ThemeToggle />
        </div>
        <div className="casting-copy">
          <span>大衍筮法 · 十八变</span>
          <h2>{revealed < 6 ? "蓍策往复，爻象渐成" : "六爻已成"}</h2>
          <p>{subject}</p>
        </div>
        <ol className="casting-lines" aria-label="六爻生成进度">
          {[5, 4, 3, 2, 1, 0].map((index) => {
            const visible = index < revealed;
            const value = lines[index];
            return (
              <motion.li
                key={index}
                data-visible={visible ? "true" : "false"}
                initial={false}
                animate={{ opacity: visible ? 1 : 0.2, x: visible ? 0 : 18 }}
              >
                <span className="line-position">{linePosition(index)}</span>
                <span className="line-glyph" aria-hidden="true">
                  {visible ? (value === 7 || value === 9 ? "⚊" : "⚋") : "·"}
                </span>
                <strong>{visible ? lineName(value) : "待定"}</strong>
              </motion.li>
            );
          })}
        </ol>
        <div className="casting-progress" aria-label={`已完成 ${revealed} 爻`}>
          <span style={{ width: `${(revealed / 6) * 100}%` }} />
        </div>
        <p className="casting-footnote">一变而三，三变成爻；六爻共十八变。</p>
      </main>
    </MobileScroll>
  );
}

function resultScreen(
  subject: string,
  lines: LineValue[],
  shared = false,
  meta: ReadingMeta = defaultMeta(),
  saved = true,
): FlowScreen {
  return {
    id: shared ? "shared-result" : "result",
    render: (flow) => (
      <ResultScreen
        flow={flow}
        subject={subject}
        lines={lines}
        shared={shared}
        meta={meta}
        saved={saved}
      />
    ),
  };
}

function ProvenanceDetails({
  meta,
  lines,
}: {
  meta: ReadingMeta;
  lines: LineValue[];
}) {
  const p = meta.provenance;
  const computation =
    p && (meta.method === "number" || meta.method === "time")
      ? castMeihua(meta.method, new Date(p.castAt), p.number)
      : null;
  return (
    <details>
      <summary>
        <span>起卦依据与规则</span>
        <ChevronLeftIcon />
      </summary>
      <div className="classic-copy provenance-copy">
        <p>
          方法：{METHODS[meta.method].title} · 规则 {meta.rule}
        </p>
        {p ? (
          <>
            <p>
              取时：{beijingInput(new Date(p.castAt)).replace("T", " ")}
              （北京时间）
            </p>
            {computation ? (
              <>
                <p>
                  农历：{computation.time.lunarLabel}；
                  {computation.time.branchName}，时辰数{" "}
                  {computation.time.hourBranch}。
                </p>
                {meta.method === "number" ? (
                  <p>报数 {p.number}。</p>
                ) : (
                  <p>
                    年支 {computation.time.yearBranch} ＋ 月{" "}
                    {computation.time.month} ＋ 日 {computation.time.day} ＝{" "}
                    {computation.upperSum}。
                  </p>
                )}
                <p>
                  上卦：{computation.upperSum} 除以 8，取 {computation.upper}。
                  <br />
                  下卦：{computation.lowerSum} 除以 8，取 {computation.lower}。
                  <br />
                  动爻：{computation.movingSum} 除以 6，取 {computation.moving}
                  。余零取除数。
                </p>
              </>
            ) : null}
            {p.coins ? (
              <p>
                初爻至上爻：
                {p.coins
                  .map((coins, index) => `${coins.join("＋")}＝${lines[index]}`)
                  .join("；")}
                。
              </p>
            ) : null}
          </>
        ) : (
          <p>
            本条记录未保存或未公开报数、取时等依据；仅按已保存的六爻展示，不重新起卦。
          </p>
        )}
        {isMeihua(meta.method) ? <p>{TIME_CONVENTION}</p> : null}
      </div>
    </details>
  );
}

function ResultScreen({
  flow,
  subject,
  lines,
  shared,
  meta,
  saved,
}: {
  flow: FlowControls;
  subject: string;
  lines: LineValue[];
  shared: boolean;
  meta: ReadingMeta;
  saved: boolean;
}) {
  const result = useMemo(() => resolveDivination(lines), [lines]);
  const guide = useMemo(() => buildReadingGuide(result), [result]);
  const plum = useMemo(
    () => (isMeihua(meta.method) ? meihuaReading(lines) : null),
    [meta.method, lines],
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [includeSubject, setIncludeSubject] = useState(false);
  const [includeProvenance, setIncludeProvenance] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const shareUrl = createShareUrl(
    lines,
    includeSubject ? subject : undefined,
    meta,
    includeProvenance,
  );
  const keyboard = useKeyboard();

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <>
      <MobileScroll className="app-screen">
        <main
          className="dayan-screen result-screen"
          data-testid="result-screen"
        >
          <ScreenTopbar
            flow={flow}
            title={shared ? "分享的卦象" : "占卜结果"}
          />
          <section className="result-hero">
            <p className="method-badge">
              {METHODS[meta.method].title} ·{" "}
              {plum ? "梅花阅读参考" : "卦爻辞阅读参考"}
            </p>
            <div className="cosmic-rings result-rings" aria-hidden="true" />
            {plum ? (
              <div className="result-pair meihua-trio">
                <div>
                  <span>本卦</span>
                  <HexagramGlyph result={result} />
                </div>
                <div>
                  <span>互卦</span>
                  <HexagramGlyph result={plum.mutual} />
                </div>
                <div>
                  <span>变卦</span>
                  <HexagramGlyph result={result} secondary />
                </div>
              </div>
            ) : result.changingIndices.length === 0 ? (
              <div className="result-pair single">
                <div>
                  <span>本卦 · 六爻皆静</span>
                  <HexagramGlyph result={result} />
                </div>
              </div>
            ) : (
              <div className="result-pair">
                <div>
                  <span>本卦</span>
                  <HexagramGlyph result={result} />
                </div>
                <div className="result-arrow" aria-hidden="true">
                  →
                </div>
                <div>
                  <span>变卦</span>
                  <HexagramGlyph result={result} secondary />
                </div>
              </div>
            )}
            {subject ? (
              <p className="result-subject">
                <span>所占之事</span>
                {subject}
              </p>
            ) : (
              <p className="result-subject muted">分享者未公开所占之事</p>
            )}
            {!saved ? (
              <p className="input-error" role="status">
                浏览器未能保存此次记录。可先复制分享链接保留结果。
              </p>
            ) : null}
          </section>

          {plum ? (
            <section className="reading-focus" aria-labelledby="focus-title">
              <div className="section-kicker">梅花 · 自省参考</div>
              <h2 id="focus-title">{plum.relation.name}</h2>
              <p>{plum.relation.hint}</p>
              <div className="body-use">
                <span>
                  体 · {plum.body.name} · {plum.body.element}
                </span>
                <span>
                  用 · {plum.use.name} · {plum.use.element}
                </span>
              </div>
              <p>
                静卦为体，动卦为用。体可借指自己，用可借指所问之事；这里的关系是思考线索，不是吉凶定论。
              </p>
              <div className="passages">
                <blockquote data-emphasis="true">
                  <span>{result.primary.name_cn} · 卦辞</span>
                  <p>{result.primary.gua_ci}</p>
                </blockquote>
                <blockquote>
                  <span>{linePosition(plum.moving)}动 · 爻辞参读</span>
                  <p>{result.primary.yao_ci[plum.moving]}</p>
                </blockquote>
              </div>
              <a
                className="source-link"
                href="https://zh.wikisource.org/wiki/梅花易數/卷二"
                target="_blank"
                rel="noreferrer"
              >
                体用参考：《梅花易数》卷二；白话提示由固定规则整理
              </a>
            </section>
          ) : (
            <section className="reading-focus" aria-labelledby="focus-title">
              <div className="section-kicker">重点参看</div>
              <h2 id="focus-title">{guide.heading}</h2>
              <p>{guide.explanation}</p>
              <div className="passages">
                {guide.passages.map((passage) => (
                  <blockquote
                    key={`${passage.label}-${passage.text}`}
                    data-emphasis={passage.emphasis ? "true" : "false"}
                  >
                    <span>{passage.label}</span>
                    <p>{passage.text}</p>
                  </blockquote>
                ))}
              </div>
              <a
                className="source-link"
                href="https://ctext.org/datawiki.pl?if=en&remap=gb&res=545766"
                target="_blank"
                rel="noreferrer"
              >
                取用说明：依《易学启蒙》常用占例整理
              </a>
            </section>
          )}

          <section className="line-detail" aria-labelledby="lines-title">
            <div className="section-kicker">六爻</div>
            <h2 id="lines-title">由下而上</h2>
            <ol>
              {[5, 4, 3, 2, 1, 0].map((index) => (
                <li
                  key={index}
                  data-changing={isChanging(lines[index]) ? "true" : "false"}
                >
                  <div className="line-value">
                    <span>
                      {lines[index] === 7 || lines[index] === 9 ? "⚊" : "⚋"}
                    </span>
                    <small>{linePosition(index)}</small>
                  </div>
                  <div>
                    <strong>
                      {lineName(lines[index])}
                      {isChanging(lines[index]) ? " · 变" : ""}
                    </strong>
                    <p>{result.primary.yao_ci[index]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="classics-section">
            {plum ? (
              <details>
                <summary>
                  <span>互卦、体用与五行关系</span>
                  <ChevronLeftIcon />
                </summary>
                <div className="classic-copy">
                  <p>
                    {linePosition(plum.moving)}动，
                    {plum.moving < 3
                      ? "下卦为用、上卦为体"
                      : "上卦为用、下卦为体"}
                    。体 {plum.body.name}（{plum.body.element}），用{" "}
                    {plum.use.name}（{plum.use.element}）：{plum.relation.name}
                    。
                  </p>
                  <p>
                    互卦取本卦二三四爻为下卦，三四五爻为上卦，得
                    {plum.mutual.primary.name_cn}。互下 {plum.mutualLower.name}
                    （{plum.mutualLower.element}）与体：
                    {
                      elementRelation(
                        plum.body.element,
                        plum.mutualLower.element,
                      ).name
                    }
                    ；互上 {plum.mutualUpper.name}（{plum.mutualUpper.element}
                    ）与体：
                    {
                      elementRelation(
                        plum.body.element,
                        plum.mutualUpper.element,
                      ).name
                    }
                    。
                  </p>
                  <p>
                    变卦中体卦不变，用卦变为{plum.changedUse.name}（
                    {plum.changedUse.element}），与体的关系为
                    {plum.changedRelation.name}
                    。可借此对照变化前后值得留意的侧面，不代表确定的未来。
                  </p>
                  <p>
                    此为简化的五行关系参考，未加入旺衰、外应等其他流派判断。
                  </p>
                </div>
              </details>
            ) : null}
            <ProvenanceDetails meta={meta} lines={lines} />
            <details open>
              <summary>
                <span>本卦 · {result.primary.name_cn}</span>
                <ChevronLeftIcon />
              </summary>
              <div className="classic-copy">
                <h3>卦辞</h3>
                <p>{result.primary.gua_ci}</p>
                <h3>彖传</h3>
                <p>{result.primary.tuan_ci}</p>
                <h3>大象传</h3>
                <p>{result.primary.da_xiang_ci}</p>
              </div>
            </details>
            {result.changingIndices.length > 0 ? (
              <details>
                <summary>
                  <span>变卦 · {result.secondary.name_cn}</span>
                  <ChevronLeftIcon />
                </summary>
                <div className="classic-copy">
                  <h3>卦辞</h3>
                  <p>{result.secondary.gua_ci}</p>
                  <h3>彖传</h3>
                  <p>{result.secondary.tuan_ci}</p>
                  <h3>大象传</h3>
                  <p>{result.secondary.da_xiang_ci}</p>
                </div>
              </details>
            ) : null}
          </section>

          <div className="result-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => setShareOpen(true)}
            >
              <Share2Icon />
              分享此卦
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={restart}
            >
              重新起卦
            </button>
          </div>

          <p className="quiet-note result-disclaimer">
            本页只呈现传统卦爻辞与取用参考，不构成医疗、法律、财务或其他专业建议。
          </p>
        </main>
      </MobileScroll>

      <BottomSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        title="分享此卦"
        description="链接可以重现同一卦象，不会重新随机起卦。"
      >
        <div className="share-sheet">
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={includeSubject}
              disabled={!subject}
              onChange={(event) => {
                setIncludeSubject(event.currentTarget.checked);
                setCopied(false);
              }}
            />
            <span>
              <strong>包含所占之事</strong>
              <small>默认关闭，避免意外泄露私人问题</small>
            </span>
          </label>
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={includeProvenance}
              disabled={!meta.provenance}
              onChange={(event) => {
                setIncludeProvenance(event.currentTarget.checked);
                setCopied(false);
              }}
            />
            <span>
              <strong>包含起卦依据</strong>
              <small>
                {meta.provenance
                  ? "公开取时、报数或铜钱明细，默认关闭"
                  : "此卦没有可公开的起卦依据"}
              </small>
            </span>
          </label>
          <div className="share-preview">
            <LockClosedIcon />
            <span>
              链接包含卦象、方法与规则
              {includeSubject ? "，并公开问题" : "，不含问题"}
              {includeProvenance ? "及起卦依据" : "；不含起卦依据"}
              。链接内容不是加密数据。
            </span>
          </div>
          <button className="primary-button" type="button" onClick={copyShare}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "已复制" : "复制分享链接"}
          </button>
          {copyError ? (
            <div className="copy-fallback">
              <p role="status">无法访问剪贴板，请手动复制以下链接。</p>
              <KeyboardTextarea
                aria-label="分享链接"
                readOnly
                value={shareUrl}
                onBlur={() => keyboard.hide()}
              />
            </div>
          ) : null}
          <button
            className="text-button sheet-close"
            type="button"
            onClick={() => setShareOpen(false)}
          >
            关闭
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function historyScreen(): FlowScreen {
  return { id: "history", render: (flow) => <HistoryScreen flow={flow} /> };
}

function HistoryScreen({ flow }: { flow: FlowControls }) {
  const [items, setItems] = useState<StoredReading[]>(() => loadHistory());
  const [error, setError] = useState("");
  const remove = (id: string) => {
    try {
      deleteReading(id);
      setItems(loadHistory());
      setError("");
    } catch {
      setError("浏览器未能删除记录，请检查站点存储权限。");
    }
  };

  return (
    <MobileScroll className="app-screen">
      <main
        className="dayan-screen history-screen"
        data-testid="history-screen"
      >
        <ScreenTopbar flow={flow} title="往期记录" />
        <header className="history-heading">
          <span className="section-kicker">仅存于本机</span>
          <h2>回看所问，也回看当时的自己</h2>
          <p>最多保留最近 40 条记录，你可以随时删除。</p>
        </header>
        {error ? (
          <p className="input-error" role="alert">
            {error}
          </p>
        ) : null}
        {items.length === 0 ? (
          <div className="empty-history">
            <ClockIcon />
            <h3>还没有记录</h3>
            <p>完成第一次起卦后，结果会安全地保存在这个浏览器中。</p>
            <button className="primary-button" type="button" onClick={flow.pop}>
              返回起卦
            </button>
          </div>
        ) : (
          <ol className="history-list">
            {items.map((item) => {
              const result = resolveDivination(item.lines);
              return (
                <li key={item.id}>
                  <button
                    className="history-main"
                    type="button"
                    onClick={() =>
                      flow.push(
                        resultScreen(item.subject, item.lines, false, item),
                      )
                    }
                  >
                    <span className="history-glyph">
                      {hexagramChar(result.primary)}
                    </span>
                    <span>
                      <strong>
                        {result.primary.name_cn}
                        {result.changingIndices.length
                          ? ` → ${result.secondary.name_cn}`
                          : ""}
                      </strong>
                      <small>
                        {METHODS[item.method].name} ·{" "}
                        {new Intl.DateTimeFormat("zh-CN", {
                          timeZone: "Asia/Shanghai",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(item.createdAt))}
                      </small>
                      <p>{item.subject}</p>
                    </span>
                  </button>
                  <button
                    className="history-delete"
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`删除“${item.subject}”`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </MobileScroll>
  );
}

export default function Prototype() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem("dayan:theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [hash, setHash] = useState(() => window.location.hash);
  const shared = useMemo(() => readSharedResult(), [hash]);
  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);
  const devicePreview = useMemo(
    () =>
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get("devicePreview") === "1",
    [],
  );

  useLayoutEffect(() => {
    document.documentElement.dataset.dayanShell = devicePreview
      ? "device"
      : "web";
    return () => {
      delete document.documentElement.dataset.dayanShell;
    };
  }, [devicePreview]);

  useEffect(() => {
    try {
      localStorage.setItem("dayan:theme", theme);
    } catch {
      /* The current theme still works without storage. */
    }
  }, [theme]);

  const start = (
    { subject, method, castAt, number }: StartRequest,
    flow: FlowControls,
  ) => {
    const finish = (
      lines: LineValue[],
      meta: ReadingMeta,
      castingFlow: FlowControls,
      replace = true,
    ) => {
      const { saved } = saveReading(subject, lines, meta);
      const screen = resultScreen(subject, lines, false, meta, saved);
      if (replace) castingFlow.replace(screen);
      else castingFlow.push(screen);
    };
    const meta: ReadingMeta = {
      ...defaultMeta(method),
      provenance: { castAt: castAt.toISOString() },
    };
    if (method === "yarrow") {
      const lines = castHexagram();
      flow.push(
        castingScreen(subject, lines, (castingFlow) =>
          finish(lines, meta, castingFlow),
        ),
      );
    } else if (method === "coins") {
      flow.push({
        id: "coins",
        render: (castingFlow) => (
          <CoinCastingScreen
            flow={castingFlow}
            subject={subject}
            onComplete={(coins) =>
              finish(
                coins.map(coinLine),
                { ...meta, provenance: { ...meta.provenance!, coins } },
                castingFlow,
              )
            }
          />
        ),
      });
    } else {
      const cast = castMeihua(method, castAt, number);
      finish(cast.lines, cast.meta, flow, false);
    }
  };

  const initial = shared
    ? resultScreen(shared.subject, shared.lines, true, shared)
    : homeScreen(start, (flow) => flow.push(historyScreen()));

  const themeValue = useMemo(
    () => ({
      theme,
      toggle: () =>
        setTheme((current) => (current === "light" ? "dark" : "light")),
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <div
        className="dayan-app"
        data-theme={theme}
        data-shell={devicePreview ? "device" : "web"}
      >
        <FlowStack key={hash} initial={initial} />
      </div>
    </ThemeContext.Provider>
  );
}
