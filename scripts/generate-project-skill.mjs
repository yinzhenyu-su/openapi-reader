#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')
const SKILL_FILE = join(ROOT, 'SKILL.md')

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))

function extractCommandDetails() {
  const src = readFileSync(join(SRC, 'index.ts'), 'utf-8')
  const blocks = src.split(/\nprogram\b/).slice(1)

  return blocks.map(block => {
    const name = block.match(/\.command\(['"](\w+)['"]\)/)?.[1] ?? ''
    const desc = block.match(/\.description\(['"]([^'"]+)['"]\)/)?.[1] ?? ''
    const optDefs = [...block.matchAll(/\.option\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]/g)]
      .map(m => {
        const flag = m[1]
        const rawDesc = m[2]
        return { flag, desc: rawDesc }
      })
    return { name, desc, opts: optDefs }
  }).filter(c => c.name)
}

const commands = extractCommandDetails()

function strategyLine(c) {
  const map = {
    ls: '浏览端点，按 tag/path/method 筛选，`--brief` 节省 token',
    summary: '了解 API 全貌（大 spec 的起点，避免直接 search）',
    get: '查看端点详情、参数、响应、示例，`--params/--response` 节省 token',
    search: '全局搜索端点、schema 字段、参数字段，大 spec 慎用（先 `ls --path`）',
    schema: '查看数据模型，不传 name 列出所有模型，支持模糊匹配',
  }
  return map[c.name] ?? c.desc
}

const rows = commands.map(c => {
  const tokenTips = {
    ls: '`--brief` 省 50%+',
    summary: '最少输出，首选',
    get: '`--params`/`--response` 避免加载全部',
    search: '大 spec 慎用',
    schema: '不传 name 列出所有',
  }
  const tip = tokenTips[c.name] ?? ''
  return `| \`${c.name}\` | ${strategyLine(c)} | ${tip} |`
}).join('\n')

const content = `---
name: openapi-reader
description: |
  CLI tool for querying OpenAPI 3.0 specifications. Use when the user
  wants to explore, inspect, or understand an API — browse endpoints,
  view schemas, search fields, read params/responses, or generate examples.
  Common triggers: "what endpoints does this API have", "how do I call X",
  "what's the schema for Y", "find endpoints related to Z", "show me the
  API overview".
---

# openapi-reader v${pkg.version} — LLM 策略手册

Spec 路径通过 CLI 参数、\`OPENAPI_READER_SPEC\` 环境变量或 \`.openapi-reader.json\` 配置文件指定。所有命令默认输出 LLM 友好格式，加 \`--format json\` 输出 JSON。

## 1. 快速概览（大 spec 的起点）

\`\`\`bash
openapi-reader <spec> summary
# 标题/版本/端点数/tag 分布/方法分布/认证/server/模型列表
\`\`\`

**策略：** 面对大 spec（几百端点），先用 \`summary\` 了解全貌，确定相关 tag 后再缩小范围，不要直接 \`search\`。

## 2. 浏览端点

\`\`\`bash
# 列出所有端点（按 tag 分组）
openapi-reader <spec> ls

# 按路径模糊筛选（推荐：先 summary 确定 tag/keyword）
openapi-reader <spec> ls --path <keyword>

# 按 tag/方法/已弃用筛选
openapi-reader <spec> ls --tag <tag> [--method GET] [--deprecated]

# Token 优化：只显示方法和路径，不显示描述
openapi-reader <spec> ls --brief
\`\`\`

## 3. 查看端点详情

\`\`\`bash
# 完整详情：请求参数 + 响应 + 错误码
openapi-reader <spec> get <METHOD> <path>

# Token 优化：只看参数或只看响应
openapi-reader <spec> get <METHOD> <path> --params
openapi-reader <spec> get <METHOD> <path> --response [code]

# 生成请求/响应 JSON 示例
openapi-reader <spec> get <METHOD> <path> --example
\`\`\`

路径支持模糊匹配，\`get POST pets\` 和 \`get POST /api/v1/pets\` 均可。

## 4. 搜索（大 spec 谨慎使用）

\`\`\`bash
openapi-reader <spec> search <keyword> [--exact]
\`\`\`

**策略：**
- 小 spec（<100 端点）直接 \`search\` 效率最高
- 大 spec（如 714 端点）\`search\` 可能栈溢出 → **fallback：** 先用 \`ls --path\` 缩小范围，或用 \`ls\` + 手动筛选
- \`--exact\` 避免子串噪音（如 \`id\` 不匹配 \`petId\`）

## 5. 查看数据模型

\`\`\`bash
# 列出所有模型（含描述）
openapi-reader <spec> schema

# 查看特定模型（自动展开字段 + 显示引用来源）
openapi-reader <spec> schema <name>
\`\`\`

模型名不区分大小写，支持子串模糊匹配。

## 命令速查

| 命令 | 用途 | Token 节省技巧 |
|---|---|---|
${rows}
`

writeFileSync(SKILL_FILE, content, 'utf-8')
console.log(`✓ Regenerated SKILL.md`)
