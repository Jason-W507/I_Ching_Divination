# 大衍 · 周易六爻

一个以传统大衍筮法为核心的轻量级周易六爻网页应用。无需注册，打开浏览器即可起卦、查看本卦与变卦、按动爻规则阅读卦爻辞，并在本地保存占卜记录。

**在线体验：** [dayan-iching.pages.dev](https://dayan-iching.pages.dev/)

> 本项目用于周易文化研究与个人参考，不构成医疗、法律、投资或其他专业建议。重大决策请结合现实信息独立判断。

## 功能

- 大衍筮法：以 49 根蓍草、三变成爻的方式生成六爻
- 分步演算：逐爻展示起卦过程，保留仪式感而不牺牲可读性
- 卦象解读：展示本卦、变卦、动爻、卦辞与爻辞
- 传统取用：覆盖 0–6 个变爻的取用规则，并附简要说明
- 明暗主题：支持浅色与暗色界面
- 本地记录：占卜历史仅存储在当前浏览器中
- 隐私分享：分享链接默认不包含所占之事，可由用户主动选择公开
- 移动优先：针对手机屏幕设计，同时可在桌面浏览器中使用

## 隐私说明

应用没有账号、服务端数据库或第三方分析服务。所占之事与历史记录默认只保存在浏览器的 `localStorage` 中；清除浏览器站点数据会同时删除这些记录。分享链接仅编码生成卦象所需的数据，默认不包含问题文本。

## 技术栈

- React 19 + TypeScript
- Vite
- Motion 与 Radix UI
- Node.js 内置测试运行器
- Cloudflare Pages

核心起卦逻辑位于 [`web/src/divination.ts`](web/src/divination.ts)，卦爻辞数据位于 [`web/src/data/gua_yao_ci.json`](web/src/data/gua_yao_ci.json)。旧 Python demo 已在 Web 版本稳定后移除，算法对应关系由自动化测试继续保障。

## 本地开发

需要 Node.js 20 或更高版本。

```bash
cd web
npm ci
npm run dev
```

Vite 会输出本地访问地址，通常为 `http://localhost:5173/`。

## 测试与构建

```bash
cd web
npm run test:logic
npm run check:runtime
npm run test:sites
npm run build
```

生产文件输出到 `web/dist/client`。

## 部署

生产站点托管于 Cloudflare Pages，项目名为 `dayan-iching`。构建参数如下：

| 配置 | 值 |
| --- | --- |
| 根目录 | `web` |
| 构建命令 | `npm run build` |
| 输出目录 | `dist/client` |
| 生产分支 | `main` |

## 项目结构

```text
.
├─ web/
│  ├─ public/          # 静态素材
│  ├─ scripts/         # 构建与运行时校验脚本
│  ├─ src/             # React 界面、起卦逻辑与卦爻辞数据
│  ├─ tests/           # 站点与运行时测试
│  └─ design-qa.md     # 视觉与交互验收记录
├─ LICENSE
└─ README.md
```

## 许可协议

本项目采用 [MIT License](LICENSE)。
