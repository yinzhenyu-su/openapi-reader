## Context

本项目是一个 CLI 工具，供 LLM agent 通过命令行查询 OpenAPI 3.0 文档。核心场景：LLM agent 需要调用某个 API → 通过本工具查询端点和方法 → 获取入参出参 → 构造 HTTP 请求。

与直接 grep JSON/YAML 相比，本工具提供结构化的 LLM 友好输出，消除引号括号等噪声，按需获取精准信息。

## Goals / Non-Goals

**Goals:**
- 支持从本地 JSON/YAML 文件和远程 URL 解析 OpenAPI 3.0 文档
- 端点列表按 tag 分组，一目了然
- 端点详情输出清晰可读：区分 path/query/body 参数，保留必填标记、描述、枚举值
- 支持子查询：`--params` / `--response` / `--codes` 分别获取特定信息
- 模型 schema 独立查看，嵌套对象引用标注
- 全文搜索端点
- API 全局概览

**Non-Goals:**
- 不处理 OpenAPI 2.0（Swagger）— 后续可扩展
- 不支持多 spec 切换会话管理
- 不支持交互式 shell 模式
- 不生成代码，只提供信息查询

## Decisions

### CLI 接口设计

采用 `openapi-reader <spec> <action> [args...]` 的扁平结构，避免深层子命令：

```
openapi-reader <spec-path> ls
openapi-reader <spec-path> get <method> <path> [flags]
openapi-reader <spec-path> search <keyword>
openapi-reader <spec-path> schema <name>
openapi-reader <spec-path> summary
```

`<spec-path>` 可以是本地文件路径（`.json` / `.yaml`）或远程 URL。

### get 子查询设计

```
get <method> <path>             完整详情
get <method> <path> --params    仅入参
get <method> <path> --response  仅响应
get <method> <path> --codes     仅状态码
```

`--response` 支持按状态码过滤：`--response 201` 只显示 201 的响应体。

### 输出格式

可读性优先，每个字段一行，结构如下：

```
<METHOD> <path>
<summary>
────────────────────────────────────────────────
Auth:  <auth description>

Path Parameters:
  <name>   <type>   ✱  <description>

Query Parameters:
  <name>   <type>     <description>

Request Body (<content-type>) ✱:
  <name>   <type>   ✱  <description>

Responses:
  <status> <reason>:
    <name>   <type>   ✱  <description>

Errors (common):
  <status> <reason>
```

格式约定：
- `✱` 表示必填字段
- 类型用完整词（`string`, `integer`, `object`, `string[]`）
- 枚举值：`One of: cat, dog, fish`
- 嵌套对象引用：`→ SchemaName (ref)`
- oneOf/anyOf 保留关键字，子树用缩进 + `├─` 展示

### 技术栈

- **语言**: Node.js / TypeScript
- **解析库**: `@apidevtools/swagger-parser`（OpenAPI 3.0 $ref 解析）
- **运行时**: Node.js 18+
- **CLI 框架**: `commander` 或 `yargs`

### 架构分层

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Input      │───▶│  Parser      │───▶│  Query Engine   │
│  (file/URL) │    │  (resolve    │    │  (filter +       │
│             │    │   $ref)      │    │   compress)      │
└─────────────┘    └──────────────┘    └────────┬─────────┘
                                                │
                                        ┌───────▼─────────┐
                                        │  Output         │
                                        │  Formatter      │
                                        │  (text printer) │
                                        └─────────────────┘
```

1. **Input Layer**: 读取本地文件或 fetch 远程 URL
2. **Parser Layer**: 用 swagger-parser 解析并 resolve $ref，得到完整的内存模型
3. **Query Engine**: 按命令和参数过滤、提取所需信息，构建中间表示
4. **Output Formatter**: 将中间表示格式化为 LLM-friendly 文本输出

### 测试策略

自建一份 OpenAPI 3.0 测试 spec，覆盖以下特性：
- 多个 tag
- path / query / body 参数
- 必填/可选混合
- 枚举字段
- 数组类型
- 嵌套 $ref
- oneOf / anyOf
- 多种响应码（2xx, 4xx, 5xx）
- 字段描述和注释
- 多种认证方式

对比测试：用真实 OpenAPI spec（如 GitHub API）验证输出效果和 token 节省。

## Risks / Trade-offs

- **[性能] 远程 URL 每次查询都 fetch** → 实现简单的内存缓存，同一 spec 在同一次 CLI 调用中只 fetch 一次
- **[兼容性] 某些 spec 的 $ref 结构极其复杂** → swagger-parser 成熟库处理，失败时给出清晰错误
- **[token 节省] 可读性优先可能 token 偏多** → 但子查询机制让 LLM 只获取所需部分（如 --params 省掉 response 内容），整体更省
- **[边界] 无 tag 的 spec** → 自动归入 "Other" 分组
- **[边界] 超长描述** → 截断到 2 行，完整描述放在注释中
