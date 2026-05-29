# openapi-reader

CLI tool for LLM-friendly OpenAPI 3.0 document querying.

## Why

LLM agent 读取 OpenAPI 文档时，直接解析原始 JSON/YAML 会引入大量噪声（引号、括号、深层嵌套）。本工具提供结构化的 LLM 友好输出，消除噪声，按需获取精准信息。

## 五步工作流

1. **`summary`** — API 概览：标题、版本、端点数、tag 分布、method 分布、认证方式、服务器、模型数、schema 列表 + 命令提示
2. **`ls`** — 端点列表：顶层显示标题、端点数、认证、服务器信息，下方按 tag 分组列出所有端点
3. **`get`** — 深入查看端点详情、请求参数、响应结构，所有 ref 自动展开内联，支持 `--example` 生成 JSON 示例
4. **`search`** — 全局搜索：端点的名称/路径/标签 + schema 字段 + 端点参数字段，支持 `--exact` 精确匹配
5. **`schema`** — 查看数据模型定义，所有 ref 自动展开内联，自动显示哪些端点使用了该模型

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

### `summary` — Show API overview

```
openapi-reader [spec] summary
```

Shows a comprehensive API overview including:
- Title and version
- Total endpoint count
- Tag distribution with counts
- Method distribution (GET/POST/PUT/DELETE counts)
- Authentication method
- Server URLs
- Model count
- Schema names (up to 15 shown, truncated with count if more)
- Command hints for next steps

```
## Pet Store API v1.0.0
- Endpoints: 15
- Tags: Pets (7), Store (3), Users (3), Payments (1), Other (1)
- Methods: DELETE (1), GET (7), POST (6), PUT (1)
- Auth: Bearer token (Authorization header)
- Servers: https://api.petstore.example.com/v1, https://staging.petstore.example.com/v1
- Models: 15
- Schemas: Address, BaseEntity, CreateOrderRequest, CreatePetRequest, CreateUserRequest, Error, MedicalRecord, Order, PaymentRequest, PaymentResult, Pet, Photo, Staff, User, UserRef

> Commands: `ls` list endpoints | `get <method> <path>` details | `search <keyword>` search | `schema <name>` view model
```

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
| `--example` | Generate request/response JSON examples |

### `search` — Search everything by keyword

```
openapi-reader [spec] search <keyword>
```

Searches across all sources in one pass, including oneOf variant fields:
- **Endpoints** — matches path, summary, description, tags, operationId, parameter names
- **Schema fields** — matches field names and descriptions across all schemas (including oneOf variants)
- **Endpoint fields** — matches request/response parameter fields (including oneOf variants)

Results are grouped by category in the output.

| Option | Description |
|--------|-------------|
| `--exact` | Match field names exactly instead of substring (e.g. `id` won't match `petId`) |

### `schema` — View schema/model definition

```
openapi-reader [spec] schema [name] [options]
```

- Omit `name` to list all schema names
- Always shows which endpoints reference the schema
- **Fuzzy matching**: case-insensitive exact match first, then substring match
  - Single match: auto-selects (e.g., `schema pet` → `Pet`)
  - Multiple matches: lists candidates (e.g., `schema request` → shows `CreatePetRequest`, `PaymentRequest`, etc.)
  - No match: shows all available schemas

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
openapi-reader summary
openapi-reader ls
openapi-reader get POST /pets

# Spec from environment variable
OPENAPI_READER_SPEC=spec.yaml openapi-reader summary

# API overview (title/version/endpoints/tags/auth/servers/models/schemas)
openapi-reader spec.yaml summary

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

# Generate request/response JSON examples
openapi-reader spec.yaml get POST /pets --example

# Search everything (endpoints + schema fields + endpoint fields)
openapi-reader spec.yaml search login

# Exact field name matching (id won't match petId, orderId, etc.)
openapi-reader spec.yaml search id --exact

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

### summary

```
## Pet Store API v1.0.0
- Endpoints: 15
- Tags: Pets (7), Store (3), Users (3), Payments (1), Other (1)
- Methods: DELETE (1), GET (7), POST (6), PUT (1)
- Auth: Bearer token (Authorization header)
- Servers: https://api.petstore.example.com/v1, https://staging.petstore.example.com/v1
- Models: 15
- Schemas: Address, BaseEntity, CreateOrderRequest, CreatePetRequest, CreateUserRequest, Error, MedicalRecord, Order, PaymentRequest, PaymentResult, Pet, Photo, Staff, User, UserRef

> Commands: `ls` list endpoints | `get <method> <path>` details | `search <keyword>` search | `schema <name>` view model
```

### get (human format)

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
  - owner: UserRef, opt
    - id: string, opt
    - name: string, opt
  - photos: object[], opt  Pet photos
    - id: string, opt
    - url: string, opt
```

## Output Format Conventions

- `req` / `opt` — Required / optional field
- `cat | dog | fish` — Enum values
- `=20` — Default value
- `string[]` — Array type
- `oneOf (oneOf)` with `- variant_name:` — Polymorphic type variants, each variant labeled
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