# openapi-reader

CLI tool for LLM-friendly OpenAPI 3.0 document querying.

## Why

LLM agent 读取 OpenAPI 文档时，直接解析原始 JSON/YAML 会引入大量噪声（引号、括号、深层嵌套）。本工具提供结构化的 LLM 友好输出，消除噪声，按需获取精准信息。

## Features

### Commands

```
openapi-reader <spec> ls [--tag <name>] [--method <method>] [--deprecated]
  List all endpoints grouped by tag

openapi-reader <spec> get <method> <path> [options]
  Get endpoint details with sub-query support

openapi-reader <spec> search <keyword>
  Search endpoints by keyword

openapi-reader <spec> schema <name> [--used-by]
  View a schema/model definition

openapi-reader <spec> summary
  Show API overview
```

`<spec>` supports local JSON/YAML files and remote URLs.

### get Sub-queries

| Flag | Description |
|------|-------------|
| `--params` | Show only request parameters (path/query/header/body) |
| `--response [code]` | Show only response schemas, optionally filter by status code |
| `--codes` | Show only HTTP status codes |
| `--depth <n>` | Control nested field expansion depth |
| `--max-tokens <n>` | Approximate token budget for output |

### Global Options

| Option | Description |
|--------|-------------|
| `--format json` | Output structured JSON instead of formatted text |
| `--no-cache` | Skip cache for remote specs |

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
# List all endpoints
openapi-reader spec.yaml ls

# Filter by tag and method
openapi-reader spec.yaml ls --tag Users --method POST

# Get endpoint details
openapi-reader spec.yaml get POST /pets

# Get only request parameters
openapi-reader spec.yaml get POST /pets --params

# Get only response (or filter by code)
openapi-reader spec.yaml get POST /pets --response 201

# Get only status codes
openapi-reader spec.yaml get POST /pets --codes

# Search endpoints
openapi-reader spec.yaml search "pet"

# View schema definition
openapi-reader spec.yaml schema Pet
openapi-reader spec.yaml schema Pet --used-by

# API overview
openapi-reader spec.yaml summary

# JSON output
openapi-reader spec.yaml get POST /pets --format json

# Depth control (limit nested expansion)
openapi-reader spec.yaml get POST /pets --depth 1

# Token budget
openapi-reader spec.yaml get POST /pets --max-tokens 300

# Remote URL
openapi-reader https://api.example.com/openapi.json summary
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

## Output Format Conventions

- `✱` — Required field
- `cat | dog | fish` — Enum values
- `→ SchemaName` — Nested object reference
- `oneOf (choose one)` — Polymorphic type variants
- `string[]` — Array type
- `⚠ DEPRECATED` — Deprecated endpoint

## Token Efficiency

| Output | Tokens | vs Raw Spec |
|--------|--------|-------------|
| Raw spec | ~4124 | — |
| `summary` | ~100 | **-98%** |
| `ls` | ~155 | **-96%** |
| `get --params` | ~129 | **-97%** |
| Full `get` | ~454 | **-89%** |

## Requirements

- Node.js 18+
- OpenAPI 3.0 specs only

## Development

```bash
npm run build    # Compile TypeScript
npm start        # Run compiled CLI
npm run dev      # Watch mode
```
