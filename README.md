# openapi-reader

CLI tool for LLM-friendly OpenAPI 3.0 document querying.

## Why

LLM agent 读取 OpenAPI 文档时，直接解析原始 JSON/YAML 会引入大量噪声（引号、括号、深层嵌套）。本工具提供结构化的 LLM 友好输出，消除噪声，按需获取精准信息。

## 四步工作流

1. **`ls`** — 概览 API，顶层显示标题、端点数、认证、服务器信息，下方按 tag 分组列出所有端点
2. **`get`** — 深入查看端点详情、请求参数、响应结构
3. **`search`** — 全局搜索：端点的名称/路径/标签 + schema 字段 + 端点参数字段，一次命令查清所有关联
4. **`schema`** — 查看数据模型定义，自动显示哪些端点使用了该模型

## Spec Source Resolution

The `<spec>` argument is optional. It's resolved in this order:

1. CLI argument (if provided)
2. `OPENAPI_READER_SPEC` environment variable
3. `.openapi-reader.json` or `openapi-reader.json` config file in current directory (with `{"spec": "path/or/url"}`)

```bash
# Set via environment variable
export OPENAPI_READER_SPEC=https://api.example.com/openapi.json
openapi-reader ls

# Or via config file
echo '{"spec":"openapi.yaml"}' > .openapi-reader.json
openapi-reader ls
```

## Commands

### `ls` — List endpoints with overview

```
openapi-reader [spec] ls [options]
```

Shows a one-line summary header (title, endpoint count, auth, servers) then lists all endpoints grouped by tag.

| Option | Description |
|--------|-------------|
| `--tag <name>` | Filter by tag (repeatable) |
| `--path <keyword>` | Filter by path (fuzzy match) |
| `--method <method>` | Filter by HTTP method |
| `--deprecated` | Show only deprecated endpoints |
| `--brief` | Show method and path only (no descriptions) |

### `get` — Get endpoint details

```
openapi-reader [spec] get [method] [path] [options]
```

- **Path-only mode**: omit method to show all methods on that path. E.g. `get /users`
- **Fuzzy matching**: if exact path not found, suggests similar paths. E.g. `get pet`

| Option | Description |
|--------|-------------|
| `--params` | Show only request parameters (path/query/header/body) |
| `--response [code]` | Show only response schemas, optionally filter by status code |
| `--depth <n>` | Control nested field expansion depth |

### `search` — Search everything by keyword

```
openapi-reader search <keyword> [spec]
openapi-reader <spec> search <keyword>
```

Searches across all sources in one pass, including oneOf variant fields:
- **Endpoints** — matches path, summary, description, tags, operationId, parameter names
- **Schema fields** — matches field names and descriptions across all schemas (including oneOf variants)
- **Endpoint fields** — matches request/response parameter fields (including oneOf variants)

Results are grouped by category in the output.

### `schema` — View schema/model definition

```
openapi-reader [spec] schema [name] [options]
```

- Omit `name` to list all schema names
- Always shows which endpoints reference the schema (no `--used-by` flag needed)

| Option | Description |
|--------|-------------|
| `--depth <n>` | Control nested field expansion depth |

### Global Options

| Option | Description |
|--------|-------------|
| `--format <type>` | Output format: `llm` (default), `human` (or `text`), `json` |
| `--no-cache` | Skip cache for remote specs |

`<spec>` supports local JSON/YAML files and remote URLs.

## Installation

```bash
# From npm registry (recommended)
npm install -g openapi-reader

# Or from source
git clone https://github.com/yinzhenyu-su/openapi-reader.git
cd openapi-reader
npm install && npm run build && npm install -g .
```

## Usage

```bash
# Spec from config (no spec arg needed)
echo '{"spec":"spec.yaml"}' > .openapi-reader.json
openapi-reader ls
openapi-reader get POST /pets

# Spec from environment variable
OPENAPI_READER_SPEC=spec.yaml openapi-reader ls

# List endpoints with overview header
openapi-reader spec.yaml ls

# Filter by tag and method
openapi-reader spec.yaml ls --tag Users --method POST

# Filter by path
openapi-reader spec.yaml ls --path pet

# Get endpoint details
openapi-reader spec.yaml get POST /pets

# Path-only: show all methods on a path
openapi-reader spec.yaml get /users

# Fuzzy path matching (no leading slash needed)
openapi-reader spec.yaml get POST pets

# Get only request parameters
openapi-reader spec.yaml get POST /pets --params

# Get only response (or filter by code)
openapi-reader spec.yaml get POST /pets --response 201

# Depth control (limit nested expansion)
openapi-reader spec.yaml get POST /pets --depth 1

# Search everything (endpoints + schema fields + endpoint fields)
openapi-reader spec.yaml search login

# List all schema names
openapi-reader spec.yaml schema

# View schema with back references
openapi-reader spec.yaml schema Pet

# JSON output
openapi-reader spec.yaml get POST /pets --format json

# Remote URL
openapi-reader https://api.example.com/openapi.json ls
```

## Example Output

```
POST /pets
Create a pet
────────────────────────────────────────────────
Auth:  Bearer token (Authorization header)

Request Body (application/json) ✱:
  name               string       ✱  Pet name (1-100 characters)
  species            cat | dog | fish | bird | reptile ✱
  age                int             Age in years
  ownerId            string       ✱  UUID of the pet owner
  tags               string[]

Responses:
  201  Pet created successfully
    id                 string       ✱  Unique identifier
    name               string       ✱  Pet name
    species            cat | dog | fish | bird | reptile ✱
    createdAt          datetime        When registered

Errors:
  400  Validation error
  409  Pet already exists
```

### LLM format (default)

```
## POST /pets
Create a pet

Auth: Bearer token (Authorization header)

### Request Body (application/json, req)
- name: string, req  Pet name (1-100 characters)
- species: cat | dog | fish | bird | reptile, req
- age: int, opt  Age in years
- ownerId: string, req  UUID of the pet owner
- tags: string[], opt

### 201  Pet created successfully
  - id: string, req  Unique identifier
  - name: string, req  Pet name
  - species: cat | dog | fish | bird | reptile, req
  - createdAt: datetime, opt  When registered
  - owner: → UserRef, opt
  - photos: object[], opt  Pet photos
    - id: string, opt
    - url: string, opt
```

## Output Format Conventions

- `req` / `opt` — Required / optional field
- `cat | dog | fish` — Enum values
- `=20` — Default value
- `→ SchemaName` — Reference to a named schema (use `schema SchemaName` to inspect)
- `object[] → SchemaName` — Array of objects referencing a named schema
- `oneOf (oneOf)` with `- variant_name:` — Polymorphic type variants, each variant labeled
- `string[]` — Array type
- `[DEPRECATED]` — Deprecated endpoint
- `(empty)` — Response with no body fields

## Requirements

- Node.js 18+
- OpenAPI 3.0 specs only

## Development

```bash
npm run build    # Compile TypeScript
npm start        # Run compiled CLI
npm run dev      # Watch mode
npm run test     # Run tests
```