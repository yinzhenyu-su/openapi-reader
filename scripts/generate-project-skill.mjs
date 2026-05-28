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
    const args = [...block.matchAll(/\.argument\(['"](<[^>]+>)['"],\s*['"]([^'"]+)['"]\s*\)/g)]
      .map(m => ({ syntax: m[1], desc: m[2] }))
    const opts = [...block.matchAll(/\.option\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]/g)]
      .map(m => {
        const flag = m[1]
        const desc = m[2].replace(/\s*\(repeatable\).*/, '').trim()
        const isRepeatable = m[2].includes('(repeatable)')
        return { flag, desc, isRepeatable }
      })
    return { name, desc, args, opts }
  }).filter(c => c.name)
}

const commands = extractCommandDetails()
const globalOpts = ['--format <type>  Output format: text or json (default: text)',
  '--no-cache      Skip cache for remote specs']

function usageLine(c) {
  const args = c.args.map(a => a.syntax).join(' ')
  const opts = c.opts.map(o => `[${o.flag.split(' ')[0]}]`).join(' ')
  return `\`openapi-reader ${c.name} ${args}${opts ? ' ' + opts : ''}\``
}

let commandsMd = ''
for (const c of commands) {
  commandsMd += `### \`${c.name}\` — ${c.desc}\n\n`
  commandsMd += `${usageLine(c)}\n\n`
  if (c.args.length) {
    commandsMd += '**参数:**\n\n'
    for (const a of c.args) {
      commandsMd += `- \`${a.syntax}\` ${a.desc}\n`
    }
    commandsMd += '\n'
  }
  if (c.opts.length) {
    commandsMd += '**选项:**\n\n'
    for (const o of c.opts) {
      commandsMd += `- \`${o.flag}\` ${o.desc}${o.isRepeatable ? ' (可重复)' : ''}\n`
    }
    commandsMd += '\n'
  }
}

const examples = [
  '```bash',
  '# 查看 API 概览',
  'openapi-reader https://api.example.com/openapi.json summary',
  '',
  '# 列出所有端点',
  'openapi-reader spec.yaml ls',
  '',
  '# 按 tag 过滤端点',
  'openapi-reader spec.yaml ls --tag users --tag admin',
  '',
  '# 查看端点详情（含参数和响应）',
  'openapi-reader spec.yaml get POST /users',
  '',
  '# 只看请求参数',
  'openapi-reader spec.yaml get POST /users --params',
  '',
  '# 只看响应（指定状态码）',
  'openapi-reader spec.yaml get POST /users --response 201',
  '',
  '# 搜索端点',
  'openapi-reader spec.yaml search user',
  '',
  '# 查看数据模型',
  'openapi-reader spec.yaml schema User',
  '',
  '# 查看哪些端点使用了某个模型',
  'openapi-reader spec.yaml schema User --used-by',
  '',
  '# 限制嵌套展开深度（节省 token）',
  'openapi-reader spec.yaml get POST /users --depth 1',
  '',
  '# 限制输出 token 预算',
  'openapi-reader spec.yaml get POST /users --max-tokens 500',
  '',
  '# JSON 格式输出',
  'openapi-reader spec.yaml summary --format json',
  '```'
].join('\n')

const content = `---
name: openapi-reader
description: |
  CLI tool for querying OpenAPI 3.0 specifications. Use when the user asks
  about API spec inspection, browsing endpoints, viewing schemas, searching
  APIs, or needs help using the openapi-reader CLI.
---

# ${pkg.name} v${pkg.version}

${pkg.description}

## 安装

\`\`\`bash
npx ${pkg.name} <spec> <command> [options]
\`\`\`

或全局安装:

\`\`\`bash
npm install -g ${pkg.name}
openapi-reader <spec> <command> [options]
\`\`\`

## 全局选项

\`\`\`
${globalOpts.join('\n')}
\`\`\`

## 命令

${commandsMd}
## 示例

${examples}

## 输出格式

所有命令默认输出格式化文本（适合终端阅读），加 \`--format json\` 输出 JSON。

### 文本输出示例

\`\`\`
# summary
Pet Store API v1.0
────────────────────────────────────────────────
Endpoints:  42
Tags:       pets (12), users (8), store (22)
Auth:       Bearer token (Authorization header)
Servers:    https://api.example.com
Models:     15

# ls (按 tag 分组)
pets:
  GET    /pets          List all pets
  POST   /pets          Create a pet
  GET    /pets/{id}     Get pet by ID

# get
POST /users
────────────────────────────────────────────────
Auth:  Bearer token (Authorization header)

Path Parameters:
  id                   int        ✱  User ID

Request Body (application/json) ✱:
  name                 string     ✱  Full name
  email                string     ✱  Email address
  role                 string        User role

Responses:
  201  Created
    id                 int        ✱  User ID
    name               string     ✱  Full name
  400  Bad request
  404  Not found

# search
Search results for "user":

  GET    /users         List users
  POST   /users         Create user
  GET    /users/{id}    Get user by ID

# schema
User
────────────────────────────────────────────────
  id                   int        ✱  User ID
  name                 string     ✱  Full name
  email                string     ✱  Email address
  role                 string        User role
\`\`\`

### JSON 输出示例

\`\`\`json
{
  "title": "Pet Store API",
  "version": "1.0",
  "endpoints": 42,
  "tags": [
    { "name": "pets", "count": 12 }
  ],
  "auth": "Bearer token (Authorization header)",
  "servers": ["https://api.example.com"],
  "models": 15
}
\`\`\`

## 与 LLM 配合使用

- 用 \`openapi-reader spec.yaml summary\` 快速了解 API
- 用 \`--depth 1\` 限制嵌套深度，减少 token 消耗
- 用 \`--max-tokens 500\` 控制输出长度
- 用 \`--format json\` 输出结构化数据便于程序处理
- \`get\` 命令支持 \`--params\`、\`--response [code]\`、\`--codes\` 子视图，只获取需要的信息
`

writeFileSync(SKILL_FILE, content, 'utf-8')
console.log(`✓ Regenerated SKILL.md`)
