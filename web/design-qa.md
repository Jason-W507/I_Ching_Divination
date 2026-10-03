# Design QA — 多方法扩展 / 方案 2

日期：2026-10-03。本报告记录发布前的本地实现与验收；用户已批准上线，实际发布状态以 GitHub 提交的 Cloudflare Pages 检查为准。

## Findings

无未解决的 P0 / P1 / P2 问题。

- [P3] 系统宋体的笔画与生成稿略有不同，装饰圆环更克制。沿用现有字体栈与圆环原始素材，不影响层级、操作或内容。
- [P3] 主 JS 约 859 kB（gzip 281 kB），Vite 提示分包体积。功能正常，后续可按方法延迟加载历法模块。

## Source and implementation evidence

证据目录：`../docs/design/multiple-methods/`，绝对路径 `D:/Programs/Projects/Playground/I_Ching_Divination/docs/design/multiple-methods/`。

- 唯一选定视觉依据：`option-2.png`，1536 × 1024 px，按对话实际显示顺序为第 2 张。
- 桌面参考裁切：`reference-desktop.png`，原图 x=24、y=51，1100 × 944 px。
- 手机参考裁切：`reference-mobile.png`，原图 x=1155、y=51，362 × 944 px。
- 浏览器截图：`implementation-desktop.png`（1100 × 944）、`implementation-mobile.png`（362 × 944）。CSS 视口与截图像素约为 1:1，不含浏览器或手机外框。
- 同一状态：梅花报数、问题“我该如何安排接下来一个月的学习？”、报数 27、帮助折叠。桌面浅色，手机暗色。时钟使用实际北京时间，不伪造生成稿中的 14:32。
- 源图裁切与浏览器截图在同一图像输入中并排对照：`comparison-desktop.png`（2200 × 944）、`comparison-mobile.png`（724 × 944）。不是仅分开查看。
- 原尺寸细节对照：`comparison-heading.png`（1520 × 220）、`comparison-form.png`（1520 × 450）。逐项检查标题、装饰、字段、帮助文字、边界、间距及按钮。
- 附加状态：`implementation-desktop-dark.png`（1440 × 900）、`implementation-tablet.png`（768 × 900）、`implementation-first-use.png`、`implementation-meihua-result.png`、`implementation-coins.png`、`implementation-share.png`、`implementation-share-mobile.png`。
- `compare.ps1` 从已保存图像重建等尺寸裁切和并排证据；实现截图来自真实浏览器。

## Required fidelity surfaces

- Fonts / typography：宋体标题与正文阅读层级保留，表单采用清晰的正文大小；桌面／手机标题、时间与辅助说明层级一致。系统字形差异为 P3。
- Spacing / layout：桌面 244 px 方法侧栏、主体问事区和双字段；手机方法下拉、单列字段和全宽主按钮。输入区和主按钮位置、手机纵向节奏与参考对齐。平板为单页与双字段布局。
- Colors / tokens：米白、深靛、朱红保持一致；暗色文字与按钮底色分开提高可读性，分享弹窗继承主题。输入错误、禁用、选中与键盘焦点可见。
- Image quality / assets：复用现有 `cosmic-rings-light.png`，修复暗色矩形底色并约束裁切。品牌、数据驱动的卦象字符和 Radix 图标沿用现有应用；未新增占位图或代码仿造插画。
- Copy / content：名称“周易占卜”，四种方法说明、时间约定、独立隐私选项、传统原文与自省免责声明齐全。计数、取时和依据来自实际数据。

## Comparison and correction history

1. 第一轮（`implementation-desktop-1.png`、`implementation-mobile-1.png` 及 `comparison-*-1.png`）：
   - [P2] 桌面装饰受旧媒体查询放大并裁切；修正方法首页选择器优先级。
   - [P2] 手机暗色圆环有矩形底色，表单偏高使记录入口落出设计画幅；调整原素材滤镜／混合方式、计数位置及表单间距。
2. 第二轮（完整并排与标题／表单细节对照）：
   - [P2] 时间字号偏小、手机页底缺少本地隐私提示；增加字号与隐私行。
   - [P2] 暗色分享弹窗旧固定黑字不可读；改用主题变量。
   - [P2] 手机结果顶部 40 px 列容纳不了主题按钮；改为对称 88 px 列，结果截图和实际边界复查无裁切。
   - [P2] 中间宽度继承旧输入框圆角／高度；768 px 截图复查后统一新表单样式。
3. 功能复查：
   - [P1] 原生日期输入事件未更新采用时间；同时处理 input/change。手机输入 2025-01-16 16:00 后，实际得到经典观梅例的革→咸、互卦姤，取时正确。
   - [P1] 已打开页面内修改分享 hash 不切换结果；订阅 hashchange 并重建对应流程。同页依次打开精简／完整分享，正确显示且不改变默认方法。
4. 最终证据为当前并排图、细节图，以及结果／分享／平板截图。前述问题已复查；不因 P3 字形与装饰差异继续循环。

## Interaction and validation

实际使用 Codex 内置浏览器访问 `http://localhost:4173/` 和 `http://127.0.0.1:4173/`，不以构建或 HTTP 成功代替浏览器验证。

- 首次选择可用；临时选择后刷新仍为首用页，完成一次后刷新进入最后完成的方法。打开分享不改变此状态。
- 四方法均走通输入→起卦→结果；铜钱验证逐次六次及一键六爻，蓍草验证动画完成后的真实结果。
- 报数 0 被拒绝；指定时间转换农历并复现经典例；梅花的体用、互卦、动爻和展开依据可读。
- 历史显示方法与问题，能重开原结果，不重新起卦。
- 默认分享解码只有 v/l/m/r；独立公开依据后含原始时间和报数，仍不含问题。复制成功状态及浅／暗弹窗均验证。
- 精简分享在另一来源显示原卦象和“未公开依据”，完整分享显示原依据，不按查看时间重算。
- 320、768、960、1440 CSS px 宽度，分别检查报数／时间表单按钮、文本框与选择器：无横向溢出。362 px 结果主题按钮右边界约 334 px，完整可见。
- 输入有标签，方法下拉可操作，Tab 焦点可见。未进行真实移动设备、屏幕阅读器或全浏览器矩阵测试。
- 控制台 error / warn 检查：无应用错误或警告。
- `npm run test:logic`：18/18 passed。
- `npm run test:sites`：4/4 passed。
- `npm run check:runtime`：28 个受保护文件校验通过，运行时未修改。
- `npm run build`：TypeScript 与生产构建通过；仅非阻断的 chunk 体积提示。

## Implementation checklist

- [x] 四种方法、专属结果、完整本地依据及旧数据兼容。
- [x] 首用选择、完成后记忆、独立分享隐私。
- [x] 桌面／手机／明暗主题，修复已发现的 P0–P2。
- [x] 浏览器交互、等尺寸对照、测试及构建。
- [x] 更新 README、术语、决策与验收文档。

final result: passed
