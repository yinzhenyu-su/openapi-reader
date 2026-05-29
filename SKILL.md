---
name: openapi-reader
description: |
  CLI tool for querying OpenAPI 3.0 specifications. Use when the user asks
  about API spec inspection, browsing endpoints, viewing schemas, searching
  APIs, or needs help using the openapi-reader CLI.
---

# openapi-reader v0.4.0

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

## 全局选项

```
--format <type>  Output format: text or json (default: text)
--no-cache      Skip cache for remote specs
```

## 命令

### `ls` — List all endpoints grouped by tag

`openapi-reader <spec> ls [--tag] [--url] [--method] [--deprecated]`

**参数:**

- `<spec>` Path or URL to OpenAPI 3.0 spec

**选项:**

- `--tag <name>` Filter by tag (可重复)
- `--url <keyword>` Filter by URL path (fuzzy match)
- `--method <method>` Filter by HTTP method
- `--deprecated` Show only deprecated endpoints

### `get` — Get endpoint details

`openapi-reader <spec> get <method> <path> [--params] [--response] [--codes] [--depth] [--max-tokens]`

**参数:**

- `<spec>` Path or URL to OpenAPI 3.0 spec
- `<method>` HTTP method (GET, POST, PUT, DELETE, etc.)
- `<path>` Endpoint path (e.g., /pets)

**选项:**

- `--params` Show only request parameters
- `--response [code]` Show only response schemas, optionally filter by status code
- `--codes` Show only HTTP status codes
- `--depth <n>` Nested field depth (default: unlimited)
- `--max-tokens <n>` Approximate token budget for output

### `search` — Search endpoints by keyword

`openapi-reader <spec> search <keyword>`

**参数:**

- `<spec>` Path or URL to OpenAPI 3.0 spec
- `<keyword>` Search keyword

### `schema` — View a schema/model definition

`openapi-reader <spec> schema <name> [--used-by] [--depth]`

**参数:**

- `<spec>` Path or URL to OpenAPI 3.0 spec
- `<name>` Schema name

**选项:**

- `--used-by` Show which endpoints use this schema
- `--depth <n>` Nested field depth

### `summary` — Show API overview

`openapi-reader <spec> summary`

**参数:**

- `<spec>` Path or URL to OpenAPI 3.0 spec


## 示例

```bash
# 查看 API 概览
openapi-reader https://api.example.com/openapi.json

# 列出所有端点
openapi-reader spec.yaml ls

# 按 tag 过滤端点
openapi-reader spec.yaml ls --tag users --tag admin

# 按 URL 路径模糊搜索
openapi-reader spec.yaml ls --url pet

# 查看端点详情（含参数和响应）
openapi-reader spec.yaml get POST /users

# 只看请求参数
openapi-reader spec.yaml get POST /users --params

# 只看响应（指定状态码）
openapi-reader spec.yaml get POST /users --response 201

# 搜索端点
openapi-reader spec.yaml search user

# 查看数据模型
openapi-reader spec.yaml schema User

# 查看哪些端点使用了某个模型
openapi-reader spec.yaml schema User --used-by

# 限制嵌套展开深度（节省 token）
openapi-reader spec.yaml get POST /users --depth 1

# 限制输出 token 预算
openapi-reader spec.yaml get POST /users --max-tokens 500

# JSON 格式输出
openapi-reader spec.yaml --format json
```

## 输出格式

所有命令默认输出格式化文本（适合终端阅读），加 `--format json` 输出 JSON。

### 文本输出示例

```
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

- 用 `openapi-reader spec.yaml` 快速了解 API（默认为 summary）
- 用 `--url` 按路径过滤端点（支持模糊匹配）
- 用 `--depth 1` 限制嵌套深度，减少 token 消耗
- 用 `--max-tokens 500` 控制输出长度
- 用 `--format json` 输出结构化数据便于程序处理
- `get` 命令支持 `--params`、`--response [code]`、`--codes` 子视图，只获取需要的信息
