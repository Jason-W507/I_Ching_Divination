import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
} from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "motion/react";
import {
  BottomSheet,
  FlowStack,
  KeyboardTextarea,
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
} from "./divination";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Theme context missing");
  return context;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="icon-button theme-toggle" type="button" onClick={toggle} aria-label={`切换为${theme === "light" ? "暗色" : "浅色"}主题`}>
      <span data-active={theme === "light" ? "true" : "false"}><SunIcon /></span>
      <span data-active={theme === "dark" ? "true" : "false"}><MoonIcon /></span>
    </button>
  );
}

function ScreenTopbar({ flow, title }: { flow: FlowControls; title: string }) {
  return (
    <div className="screen-topbar">
      <button className="icon-button" type="button" onClick={flow.pop} aria-label="返回">
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
      <div className="brand-rule" aria-hidden="true"><span /></div>
      <div>
        <h1>大衍</h1>
        <p>周易六爻</p>
      </div>
    </div>
  );
}

function HexagramGlyph({ result, secondary = false, compact = false }: { result: DivinationResult; secondary?: boolean; compact?: boolean }) {
  const hexagram = secondary ? result.secondary : result.primary;
  return (
    <div className={`hexagram-glyph${compact ? " compact" : ""}`} aria-label={`${hexagram.name_cn}卦`}>
      <span aria-hidden="true">{hexagramChar(hexagram)}</span>
      <strong>{hexagram.name_cn}</strong>
      <small>第 {hexagram.id} 卦</small>
    </div>
  );
}

function homeScreen(onStart: (subject: string, flow: FlowControls) => void, onHistory: (flow: FlowControls) => void): FlowScreen {
  return {
    id: "home",
    render: (flow) => <HomeScreen onStart={(subject) => onStart(subject, flow)} onHistory={() => onHistory(flow)} />,
  };
}

function HomeScreen({ onStart, onHistory }: { onStart: (subject: string) => void; onHistory: () => void }) {
  const [subject, setSubject] = useState("");
  const keyboard = useKeyboard();

  return (
    <MobileScroll className="app-screen">
      <main className="dayan-screen home-screen" data-testid="home-screen">
        <div className="cosmic-rings" aria-hidden="true" />
        <header className="home-header">
          <BrandMark />
          <ThemeToggle />
        </header>

        <div className="hexagram-preview" aria-hidden="true">
          <div className="preview-figure">
            <span>䷀</span>
            <ol><li>上爻</li><li>五爻</li><li>四爻</li><li>三爻</li><li>二爻</li><li>初爻</li></ol>
          </div>
          <div className="preview-caption"><i />天地之序</div>
        </div>

        <p className="invitation">正心诚意，问其所疑</p>

        <section className="question-section" aria-labelledby="question-label">
          <label id="question-label" htmlFor="subject">所占之事</label>
          <div className="textarea-wrap">
            <KeyboardTextarea
              id="subject"
              value={subject}
              maxLength={160}
              placeholder="例如：我该如何看待眼前的工作选择？"
              onChange={(event) => setSubject(event.currentTarget.value)}
              onBlur={() => keyboard.hide()}
            />
            <Pencil2Icon aria-hidden="true" />
          </div>
          <div className="field-meta">
            <span><LockClosedIcon />问题仅存于此设备</span>
            <span>{subject.length}/160</span>
          </div>
        </section>

        <div className="home-actions">
          <button className="primary-button" type="button" disabled={!subject.trim()} onClick={() => onStart(subject.trim())}>
            <span className="button-orbit" aria-hidden="true" />
            开始起卦
          </button>
          <button className="secondary-button" type="button" onClick={onHistory}>
            <ReaderIcon />查看记录
          </button>
        </div>

        <p className="quiet-note">占卜结果仅供研习与自省，重大决定仍请理性判断。</p>
      </main>
    </MobileScroll>
  );
}

function castingScreen(subject: string, lines: LineValue[], onComplete: (flow: FlowControls) => void): FlowScreen {
  return {
    id: "casting",
    render: (flow) => <CastingScreen subject={subject} lines={lines} onComplete={() => onComplete(flow)} />,
  };
}

function CastingScreen({ subject, lines, onComplete }: { subject: string; lines: LineValue[]; onComplete: () => void }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = reduced ? 90 : 1400;
    if (revealed >= 6) {
      const finish = window.setTimeout(onComplete, reduced ? 100 : 900);
      return () => window.clearTimeout(finish);
    }
    const timer = window.setTimeout(() => setRevealed((value) => value + 1), interval);
    return () => window.clearTimeout(timer);
  }, [onComplete, revealed]);

  return (
    <MobileScroll className="app-screen">
      <main className="dayan-screen casting-screen" data-testid="casting-screen">
        <div className="cosmic-rings casting-rings" aria-hidden="true" />
        <div className="casting-brand"><BrandMark /><ThemeToggle /></div>
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
              <motion.li key={index} data-visible={visible ? "true" : "false"} initial={false} animate={{ opacity: visible ? 1 : 0.2, x: visible ? 0 : 18 }}>
                <span className="line-position">{linePosition(index)}</span>
                <span className="line-glyph" aria-hidden="true">{visible ? (value === 7 || value === 9 ? "⚊" : "⚋") : "·"}</span>
                <strong>{visible ? lineName(value) : "待定"}</strong>
              </motion.li>
            );
          })}
        </ol>
        <div className="casting-progress" aria-label={`已完成 ${revealed} 爻`}><span style={{ width: `${(revealed / 6) * 100}%` }} /></div>
        <p className="casting-footnote">一变而三，三变成爻；六爻共十八变。</p>
      </main>
    </MobileScroll>
  );
}

function resultScreen(subject: string, lines: LineValue[], shared = false): FlowScreen {
  return {
    id: shared ? "shared-result" : "result",
    render: (flow) => <ResultScreen flow={flow} subject={subject} lines={lines} shared={shared} />,
  };
}

function ResultScreen({ flow, subject, lines, shared }: { flow: FlowControls; subject: string; lines: LineValue[]; shared: boolean }) {
  const result = useMemo(() => resolveDivination(lines), [lines]);
  const guide = useMemo(() => buildReadingGuide(result), [result]);
  const [shareOpen, setShareOpen] = useState(false);
  const [includeSubject, setIncludeSubject] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = createShareUrl(lines, includeSubject ? subject : undefined);

  const copyShare = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <MobileScroll className="app-screen">
        <main className="dayan-screen result-screen" data-testid="result-screen">
          <ScreenTopbar flow={flow} title={shared ? "分享的卦象" : "占卜结果"} />
          <section className="result-hero">
            <div className="cosmic-rings result-rings" aria-hidden="true" />
            {result.changingIndices.length === 0 ? (
              <div className="result-pair single">
                <div><span>本卦 · 六爻皆静</span><HexagramGlyph result={result} /></div>
              </div>
            ) : (
              <div className="result-pair">
                <div><span>本卦</span><HexagramGlyph result={result} /></div>
                <div className="result-arrow" aria-hidden="true">→</div>
                <div><span>变卦</span><HexagramGlyph result={result} secondary /></div>
              </div>
            )}
            {subject ? <p className="result-subject"><span>所占之事</span>{subject}</p> : <p className="result-subject muted">分享者未公开所占之事</p>}
          </section>

          <section className="reading-focus" aria-labelledby="focus-title">
            <div className="section-kicker">重点参看</div>
            <h2 id="focus-title">{guide.heading}</h2>
            <p>{guide.explanation}</p>
            <div className="passages">
              {guide.passages.map((passage) => (
                <blockquote key={`${passage.label}-${passage.text}`} data-emphasis={passage.emphasis ? "true" : "false"}>
                  <span>{passage.label}</span>
                  <p>{passage.text}</p>
                </blockquote>
              ))}
            </div>
            <a className="source-link" href="https://ctext.org/datawiki.pl?if=en&remap=gb&res=545766" target="_blank" rel="noreferrer">取用说明：依《易学启蒙》常用占例整理</a>
          </section>

          <section className="line-detail" aria-labelledby="lines-title">
            <div className="section-kicker">六爻</div>
            <h2 id="lines-title">由下而上</h2>
            <ol>
              {[5, 4, 3, 2, 1, 0].map((index) => (
                <li key={index} data-changing={isChanging(lines[index]) ? "true" : "false"}>
                  <div className="line-value"><span>{lines[index] === 7 || lines[index] === 9 ? "⚊" : "⚋"}</span><small>{linePosition(index)}</small></div>
                  <div><strong>{lineName(lines[index])}{isChanging(lines[index]) ? " · 变" : ""}</strong><p>{result.primary.yao_ci[index]}</p></div>
                </li>
              ))}
            </ol>
          </section>

          <section className="classics-section">
            <details open>
              <summary><span>本卦 · {result.primary.name_cn}</span><ChevronLeftIcon /></summary>
              <div className="classic-copy"><h3>卦辞</h3><p>{result.primary.gua_ci}</p><h3>彖传</h3><p>{result.primary.tuan_ci}</p><h3>大象传</h3><p>{result.primary.da_xiang_ci}</p></div>
            </details>
            {result.changingIndices.length > 0 ? (
              <details>
                <summary><span>变卦 · {result.secondary.name_cn}</span><ChevronLeftIcon /></summary>
                <div className="classic-copy"><h3>卦辞</h3><p>{result.secondary.gua_ci}</p><h3>彖传</h3><p>{result.secondary.tuan_ci}</p><h3>大象传</h3><p>{result.secondary.da_xiang_ci}</p></div>
              </details>
            ) : null}
          </section>

          <div className="result-actions">
            <button className="primary-button" type="button" onClick={() => setShareOpen(true)}><Share2Icon />分享此卦</button>
            <button className="secondary-button" type="button" onClick={() => { window.location.hash = ""; window.location.reload(); }}>重新起卦</button>
          </div>

          <p className="quiet-note result-disclaimer">本页只呈现传统卦爻辞与取用参考，不构成医疗、法律、财务或其他专业建议。</p>
        </main>
      </MobileScroll>

      <BottomSheet open={shareOpen} onOpenChange={setShareOpen} title="分享此卦" description="链接可以重现同一卦象，不会重新随机起卦。">
        <div className="share-sheet">
          <label className="share-toggle">
            <input type="checkbox" checked={includeSubject} onChange={(event) => setIncludeSubject(event.currentTarget.checked)} />
            <span><strong>包含所占之事</strong><small>默认关闭，避免意外泄露私人问题</small></span>
          </label>
          <div className="share-preview"><LockClosedIcon /><span>{includeSubject ? "链接将包含问题与卦象" : "链接只包含卦象，不包含问题"}</span></div>
          <button className="primary-button" type="button" onClick={copyShare}>{copied ? <CheckIcon /> : <CopyIcon />}{copied ? "已复制" : "复制分享链接"}</button>
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
  const remove = (id: string) => {
    deleteReading(id);
    setItems(loadHistory());
  };

  return (
    <MobileScroll className="app-screen">
      <main className="dayan-screen history-screen" data-testid="history-screen">
        <ScreenTopbar flow={flow} title="往期记录" />
        <header className="history-heading"><span className="section-kicker">仅存于本机</span><h2>回看所问，也回看当时的自己</h2><p>最多保留最近 40 条记录，你可以随时删除。</p></header>
        {items.length === 0 ? (
          <div className="empty-history"><ClockIcon /><h3>还没有记录</h3><p>完成第一次起卦后，结果会安全地保存在这个浏览器中。</p><button className="primary-button" type="button" onClick={flow.pop}>返回起卦</button></div>
        ) : (
          <ol className="history-list">
            {items.map((item) => {
              const result = resolveDivination(item.lines);
              return (
                <li key={item.id}>
                  <button className="history-main" type="button" onClick={() => flow.push(resultScreen(item.subject, item.lines))}>
                    <span className="history-glyph">{hexagramChar(result.primary)}</span>
                    <span><strong>{result.primary.name_cn}{result.changingIndices.length ? ` → ${result.secondary.name_cn}` : ""}</strong><small>{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</small><p>{item.subject}</p></span>
                  </button>
                  <button className="history-delete" type="button" onClick={() => remove(item.id)} aria-label={`删除“${item.subject}”`}><TrashIcon /></button>
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
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("dayan:theme") === "dark" ? "dark" : "light"));
  const shared = useMemo(() => readSharedResult(), []);

  useEffect(() => {
    localStorage.setItem("dayan:theme", theme);
  }, [theme]);

  const start = (subject: string, flow: FlowControls) => {
    const lines = castHexagram();
    flow.push(castingScreen(subject, lines, (castingFlow) => {
      saveReading(subject, lines);
      castingFlow.replace(resultScreen(subject, lines));
    }));
  };

  const initial = shared
    ? resultScreen(shared.subject, shared.lines, true)
    : homeScreen(start, (flow) => flow.push(historyScreen()));

  const themeValue = useMemo(() => ({
    theme,
    toggle: () => setTheme((current) => (current === "light" ? "dark" : "light")),
  }), [theme]);

  return (
    <ThemeContext.Provider value={themeValue}>
      <div className="dayan-app" data-theme={theme}>
        <FlowStack initial={initial} />
      </div>
    </ThemeContext.Provider>
  );
}
