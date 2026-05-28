## Why

LLM agent 读取 OpenAPI 文档时，直接解析原始 JSON/YAML 会引入大量噪声（引号、括号、深层嵌套），grep 查询某个接口的请求方式、入参和出参很不方便。需要一个 CLI 工具，让 LLM agent 可以用结构化的命令查询 OpenAPI 文档，输出对 LLM 友好、可读性高、节省 token 的接口信息。

## What Changes

- 实现 `openapi-reader` CLI 工具，支持从本地 JSON/YAML 文件和远程 URL 解析 OpenAPI 3.0 文档
- 提供以下命令：`ls`, `get`, `search`, `schema`, `summary`
- `get` 命令支持子查询：`--params`, `--response`, `--codes` 分别展示入参、响应、状态码
- 输出格式以可读性优先：类型用完整词、`✱` 标记必填、枚举值 inline、oneOf/anyOf 保留关键字、嵌套对象引用标注
- 端点列表按 tag 分组展示

## Capabilities

### New Capabilities
- `endpoint-listing`: 列出 API 所有端点，按 tag 分组，显示 path 和 HTTP method
- `endpoint-detail`: 查询单个端点的完整详情，含入参、出参、响应码、认证方式
- `endpoint-params`: 仅查询端点的入参信息（path params / query params / request body 分类展示）
- `endpoint-response`: 仅查询端点的响应体 schema（支持按状态码过滤）
- `endpoint-codes`: 仅查询端点可能的 HTTP 状态码列表
- `endpoint-search`: 按关键词搜索端点
- `schema-view`: 查看数据模型定义
- `api-summary`: 显示 API 全局概览（端点数、模型数、认证方式、服务器地址）

### Modified Capabilities

（无，首次实现）

## Impact

- 新增 `openapi-reader` CLI 工具，使用 Node.js/TypeScript 编写
- 需要使用 OpenAPI 3.0 解析库（如 `@apidevtools/swagger-parser` 或 `openapi-types`）
- 需要一份测试用的 OpenAPI 3.0 spec 文件
