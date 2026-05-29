---
name: openapi-reader
description: |
  CLI tool for querying OpenAPI 3.0 specifications. Use when the user asks
  about API spec inspection, browsing endpoints, viewing schemas, searching
  APIs, or needs help using the openapi-reader CLI.
---

# openapi-reader v0.5.0

CLI tool for LLM-friendly OpenAPI document querying

## 安装

```bash
npx openapi-reader [spec] <command> [options]
```

或全局安装:

```bash
npm install -g openapi-reader
openapi-reader [spec] <command> [options]
```

## Spec 来源

`<spec>` 参数可选，按以下优先级解析：

1. CLI 参数（如提供）
2. 环境变量 `OPENAPI_READER_SPEC`
3. 当前目录的 `.openapi-reader.json` 或 `openapi-reader.json`（含 `{"spec": "..."}`）

```bash
# 环境变量
export OPENAPI_READER_SPEC=https://api.example.com/openapi.json
openapi-reader ls

# 配置文件
echo '{"spec":"openapi.yaml"}' > .openapi-reader.json
openapi-reader ls
```

## 全局选项

```
--format <type>  Output format: llm, human (or text), json (default: llm)
--no-cache      Skip cache for remote specs
```

## 命令

### `ls` — List all endpoints grouped by tag

`openapi-reader ls [spec] [--tag] [--path] [--method] [--deprecated] [--brief]`

**参数:**

- `[spec]` Path or URL to OpenAPI 3.0 spec

**选项:**

- `--tag <name>` Filter by tag (可重复)
- `--path <keyword>` Filter by path (fuzzy match)
- `--method <method>` Filter by HTTP method
- `--deprecated` Show only deprecated endpoints
- `--brief` Show method and path only (no descriptions)

### `summary` — Show API overview

`openapi-reader summary [spec]`

**参数:**

- `[spec]` Path or URL to OpenAPI 3.0 spec

### `get` — Get endpoint details

`openapi-reader get [spec] [method] [path] [--params] [--response] [--example]`

**参数:**

- `[spec]` Path or URL to OpenAPI 3.0 spec
- `[method]` HTTP method (GET, POST, etc.). Omit to list all methods on the path.
- `[path]` Endpoint path (e.g., /pets). Supports fuzzy matching if exact path not found.

**选项:**

- `--params` Show only request parameters
- `--response [code]` Show only response schemas, optionally filter by status code
- `--example` Generate request/response JSON examples

### `search` — Search endpoints, schemas, and fields by keyword

`openapi-reader search [spec] [keyword] [--exact]`

**参数:**

- `[spec]` Path or URL to OpenAPI 3.0 spec
- `[keyword]` Search keyword

**选项:**

- `--exact` Match field names exactly instead of substring

### `schema` — View a schema/model definition

`openapi-reader schema [spec] [name]`

**参数:**

- `[spec]` Path or URL to OpenAPI 3.0 spec
- `[name]` Schema name


## 示例

```bash
# API 概览（标题/版本/端点数/tag/method/认证/服务器/模型/schema 列表 + 命令提示）
openapi-reader spec.yaml summary

# 概览与端点列表（一行显示标题/端点数/认证/服务器）
openapi-reader https://api.example.com/openapi.json ls

# 列出所有端点
openapi-reader spec.yaml ls

# 按 tag 过滤端点
openapi-reader spec.yaml ls --tag users --tag admin

# 按路径模糊搜索
openapi-reader spec.yaml ls --path pet

# 只看端点列表（无描述）
openapi-reader spec.yaml ls --brief

# 查看端点详情（含参数和响应，ref 自动展开）
openapi-reader spec.yaml get POST /users

# 只看请求参数
openapi-reader spec.yaml get POST /users --params

# 只看响应（指定状态码）
openapi-reader spec.yaml get POST /users --response 201

# 生成请求/响应 JSON 示例
openapi-reader spec.yaml get POST /pets --example

# 全局搜索：端点 + schema 字段 + 端点字段
openapi-reader spec.yaml search user

# 精确匹配字段名（不匹配子串，如 id 不匹配 petId）
openapi-reader spec.yaml search id --exact

# 查看数据模型（自动显示引用来源，ref 自动展开）
openapi-reader spec.yaml schema User

# 列出所有数据模型名称
openapi-reader spec.yaml schema

# 只传路径查看该路径所有方法
openapi-reader spec.yaml get /users

# 路径模糊匹配（无需前导 /）
openapi-reader spec.yaml get POST pets

# JSON 格式输出
openapi-reader spec.yaml ls --format json
```

## 输出格式

所有命令默认输出 LLM 优化格式，加 `--format human` 输出终端友好文本，加 `--format json` 输出 JSON。

### 文本输出示例

```
# summary (API 概览)
## Pet Store API v1.0.0
- Endpoints: 42
- Tags: pets (12), users (8), store (22)
- Methods: DELETE (5), GET (20), POST (10), PUT (7)
- Auth: Bearer token (Authorization header)
- Servers: https://api.example.com
- Models: 15
- Schemas: Pet, User, Order, Error, Address, PaymentRequest, ...

> Commands: `ls` list endpoints | `get <method> <path>` details | `search <keyword>` search | `schema <name>` view model

# ls (按 tag 分组，顶部概览)
Pet Store API v1.0 | 42 endpoints | Auth: Bearer token
────────────────────────────────────────────────
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

# search (按类别分组)
Search results for "user":

Endpoints:
  GET    /users         List users
  POST   /users         Create user

Schema Fields:
  User
    email: string, req  Email address

Endpoint Fields:
  POST /users
    email: string, req  Email address

# schema
User
────────────────────────────────────────────────
  id                   int        ✱  User ID
  name                 string     ✱  Full name
  email                string     ✱  Email address
  role                 string        User role

Used by:
  GET /users  (response 200)
  POST /users  (request body)
```

### JSON 输出示例

```json
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
```

## 与 LLM 配合使用

- 用 `openapi-reader spec.yaml summary` 快速了解 API 全貌（标题/版本/端点数/tag/method 分布/认证/服务器/模型数/schema 列表 + 命令提示）
- 用 `openapi-reader spec.yaml ls` 查看端点列表（标题/端点数/认证/服务器 + 按 tag 分组）
- 用 `--path` 按路径过滤端点（支持模糊匹配）
- 用 `--example` 生成请求/响应 JSON 示例，便于快速构造调用
- 用 `--format json` 输出结构化数据便于程序处理
- `get` 命令自动展开所有 ref（嵌套 schema 字段直接内联显示）
- `get` 命令支持 `--params`、`--response [code]` 子视图，只获取需要的信息
- `get` 支持路径模糊匹配，传 POST pets 无需前导 /
- `get --response` 在多方法路径下自动过滤无匹配响应的方法（如 `get /pets --response 201` 只返回 POST 的 201）
- `search` 一次搜索所有来源：端点、schema 字段、端点参数字段（包括 oneOf variant 内部字段），按类别分组输出
- `search --exact` 精确匹配字段名，避免子串匹配噪音（如 `id` 不匹配 `petId`）
- `schema` 命令自动展开所有 ref（嵌套 schema 字段直接内联显示）
- `schema` 自动显示 back references（哪些端点使用该模型）
- `schema` 不传名称时列出所有模型及描述，便于发现和导航
- `schema` 支持模糊查询：大小写不敏感精确匹配优先，其次子串匹配（唯一匹配自动选中，多个匹配列出候选）
- `schema` 找不到时自动列出所有可用 schema 名称
- `ls --tag` 无匹配时自动提示可用 tag 列表
- `get` 多方法路径时显示简要列表而非全部详情，节省 token
- spec 参数可选，支持环境变量和配置文件
