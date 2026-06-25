# vue-gravity-engine

Vue 代码幻觉检测器 — 捕获 AI 生成的 React 混入、Vue 2 残留和反模式代码。

## 技术栈

- TypeScript (ES2022, ESNext module)
- 构建: tsup (ESM + CJS 双格式, 3 入口)
- 测试: vitest
- CLI: commander + picocolors
- 依赖: minimatch, picocolors

## 项目结构

```
src/
├── index.ts              # 库入口, 导出所有公共 API
├── cli.ts                # CLI 入口 (vue-gravity check / generate-skills)
├── vite-plugin.ts        # Vite 插件入口
├── config.ts             # 配置加载 (gravity.config.ts/js/mjs, .gravityrc.json)
├── skills-generator.ts   # 生成 AI 工具使用的 skills markdown 文档
├── rules.ts              # 20 条默认规则定义
├── types.ts              # GravityRule, Finding, GravityConfig 等核心类型
└── engine/
    ├── scanner.ts        # GravityEngine — 核心扫描器, 基于正则匹配
    └── reporter.ts       # 终端/JSON 报告格式化
```

## 构建与测试

```bash
npm run build          # tsup 构建 → dist/
npm test               # vitest run
npm run test:watch     # vitest watch 模式
npm run generate-skills # 生成 skills 文档
```

tsup 构建 3 个入口: `index` (库), `vite-plugin` (Vite 插件), `cli` (命令行工具)。

## 规则系统

规则是声明式的, 一份规则被三个消费者共享:
- **Vite 插件**: 开发时实时检测 (hotUpdate), error 级阻断 HMR
- **CLI**: 全量扫描, 支持 `--ci` (退出码 1)、`--report` (JSON)
- **Skills 生成器**: 输出 markdown 文档供 AI 工具参考

5 个规则类别: `api-alignment`, `reactivity`, `template`, `styles`, `performance`

每条规则包含: id, name, category, severity (error/warning/info), filePatterns, patterns (正则), message, suggestion, docsUrl

## 代码规范

- 使用 ESM (`import.meta.url`, `.js` 扩展名)
- 严格模式 TypeScript (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- 测试文件与源文件同目录, 命名 `*.test.ts`
- 正则检测自动跳过注释和字符串, 避免误报
- config 支持: `gravity.config.ts`, `gravity.config.js`, `gravity.config.mjs`, `.gravityrc.json`
