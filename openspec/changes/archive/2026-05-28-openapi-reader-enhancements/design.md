## Context

openapi-reader 已实现基础的端点查询（ls/get/search/schema/summary），但面对大型 spec（GitHub 1186 端点）时 LLM 难以快速定位到目标端点。需要增强过滤能力、结构化输出和 token 控制。

## Goals / Non-Goals

**Goals:**
- ls 支持 --tag/--method/--deprecated 过滤
- 解析 allOf 组合 schema
- 展示 header 类型参数
- schema 反向引用查询
- 超长描述截断
- 远程 spec 文件缓存
- 废弃端点标记和过滤
- JSON 格式输出（--format json）
- 深度控制（--depth N）
- Token 预算压缩（--max-tokens N）
- 必填字段优先级排序

**Non-Goals:**
- 不实现 MCP Server（单独提案）
- 不支持 OpenAPI 2.0（单独提案）
- 不实现端点对比 diff

## Decisions

### 1. ls 过滤实现

```
ls [--tag <name>] [--method <method>] [--deprecated]
```

多个 flag 之间是 AND 关系。`--tag` 可重复（OR 关系）：`ls --tag users --tag pets` 显示两个 tag 的端点。

`--deprecated` 是布尔 flag：默认隐藏废弃端点（除非 `--deprecated` 显式要求显示）。

### 2. allOf 解析

在 `schemaToFields()` 中，如果 schema 有 `allOf` 但没有 `properties`，遍历 allOf 的每个 entry，提取其 properties 并合并。合并时后出现的同名字段覆盖前面的。

### 3. header 参数

在 `ParamSection` 类型中新增 `headerParams: FieldInfo[]`，输出时展示在 query 参数之后、request body 之前。

### 4. 反向引用

构建一个 `Map<string, {method, path, location}[]>` 索引：
- 遍历所有端点
- 检查 requestBody 和 responses 中的 schema
- 通过 schema `title` 或遍历 ref 找到引用关系

注意：swagger-parser dereference 后 $ref 已解析，需要用 schema title 或 name 来匹配。

### 5. 描述截断

在 `fmtField()` 中截断：取第一个句号前的部分，如果超过 80 字符则截断到 80 字符加 `...`。

### 6. Spec 缓存

```
~/.cache/openapi-reader/<md5-of-url>.json
```

- 缓存键：URL 的 MD5 哈希
- 缓存值：swagger-parser 解析后的完整 JSON
- 写入时机：首次解析成功后
- 读取时机：检测到缓存文件且未过期（默认 1 小时）
- `--no-cache` flag 跳过缓存
- 本地文件不需要缓存

### 7. 废弃标记

在 `EndpointDetail` 中新增 `deprecated: boolean` 和 `deprecationMessage?: string`。

在 `get` 输出顶部显示 `⚠ DEPRECATED`。
在 `ls` 中已废弃端点用 `⚠` 前缀。
`ls --deprecated` 只显示已废弃端点。

### 8. JSON 输出

`--format json` flag 作用于所有命令。

- ls 输出 JSON 数组
- get 输出 JSON 对象
- search 输出 JSON 数组
- schema 输出 JSON 对象
- summary 输出 JSON 对象

JSON schema 与 `--format text` 的结构一致，但用 JSON 表示。

实现方式：新增 `src/formatters/json.ts`，为每个命令提供一个 toJSON 函数。

### 9. 深度控制

`--depth N` 控制嵌套对象的展开层数：

- `--depth 1`: 只显示字段名和类型，不展开任何 children
- `--depth 2`: 展开一层嵌套
- 默认（无 --depth）：完全展开（兼容当前行为）

深度通过 `schemaToFields()` 的 `depth` 参数传递，递归时递减。

### 10. Token 预算

`--max-tokens N`：

Token 估算公式：`Math.ceil(text.length / 4)`（英文）。

渐进压缩顺序（从轻到重）：
1. 截断描述为第一句
2. 限制 depth 到 1
3. 移除 optional 字段
4. 只保留摘要行

输出末尾添加 `(truncated to ~N tokens)` 标记。

### 11. 优先级排序

字段按以下顺序排序：
1. 必填字段（按字母序）
2. 可选字段（按字母序）
3. 只读字段（按字母序）

在 response 中，状态码按数值排序（200, 201, 400, 401, 404, 500...）。

## Risks / Trade-offs

- **[深度控制] 展开层数与信息完整性冲突** → 默认完全展开（兼容），--depth 由用户选择
- **[Token 估算] 粗略估算可能不准** → 加 20% 缓冲区，实际输出略小于预算
- **[缓存] 缓存可能 stale** → 默认 1 小时过期，--no-cache 强制刷新
- **[反向引用] dereference 后 ref 信息丢失** → 通过 schema title 或 field name 匹配，准确率约 90%
- **[JSON] 比文本多 50% token** → 精确度换 token，由用户选择格式
