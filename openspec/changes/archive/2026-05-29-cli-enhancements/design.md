## Context

当前工具查询路径：`spec → parse → query → output`。每次 CLI 调用都从零开始 parse。远程 spec 每次 fetch + resolve $ref，是主要延迟瓶颈。搜索只能搜 endpoint 元数据（path/summary/description），不能深入到字段级别。Parser 层硬编码 OpenAPI 3.0 类型，限制了兼容性。

## Goals / Non-Goals

**Goals:**
- 远程 spec 缓存到 `~/.cache/openapi-reader/`，过期时间 1 小时
- 已有 `--no-cache` flag 跳过缓存
- `--find <keyword>` 可搜索所有 schema 的字段名和描述
- `--find <keyword>` 可搜索 endpoint 参数（path/query/body）的字段名和描述
- Parser 层兼容 OpenAPI 2.0 (Swagger) 格式

**Non-Goals:**
- 不移除已有搜索（保留 `search` 命令）
- 不为 OpenAPI 2.0 做 2.0→3.0 的完整转换，只在工具内部做适配
- 不缓存本地文件（文件系统已经够快）
- 不做内存跨进程缓存（只做文件缓存）

## Decisions

### D1: 缓存用文件 JSON，hash 键为 URL 的 MD5

**缓存路径**: `~/.cache/openapi-reader/<md5(url)>.json`

**理由**：
- 文件缓存无需额外依赖（不用 SQLite/Redis）
- MD5 快，URL 做 key 天然唯一
- JSON 序列化已解析后的 API 数据（不是原始 spec），读缓存后直接 QueryEngine
- 1 小时 TTL 合理：一次 LLM 会话通常 <1 小时

**缓存格式**：存储 `OpenApiParser` 的 parsed result（dereferenced 后的完整 API 对象），附带 `cachedAt` 时间戳。

### D2: `--find` 作为独立字段搜索，不改造 `search` 命令

**设计**：
- 独立 flag `--find <keyword>` 可附加到现有命令上
  - `schema --find email` → 搜索所有 schema 字段
  - `get --find "page"` → 搜索所有 endpoint 的参数字段
  - `ls --find "page"` → 同 get
- 搜索范围：字段名 + 字段描述（大小写不敏感）
- 输出：schema 名/endpoint 路径 + 匹配的字段行

### D3: OpenAPI 2.0 支持通过扩展 Parser 层

`@apidevtools/swagger-parser` 原生支持 Swagger 2.0 和 OpenAPI 3.0。parser 层加一个 normalize 步骤，将 2.0 的 spec 结构映射到工具内部使用的 3.0 类型：

```
2.0 → normalize → 3.0-like structure → query engine (不变)
   - swagger → openapi (version)
   - info, paths, definitions → info, paths, components.schemas
   - host + basePath + schemes → servers[]
   - securityDefinitions → components.securitySchemes
   - consumes/produces → per-path requestBody/response content type
```

## Risks / Trade-offs

- **[缓存失效]** 远程 spec 变更后 1 小时内不感知 → TTL 后自动刷新，可用 `--no-cache` 强制
- **[缓存膨胀]** 大型 spec 的缓存文件可能数 MB → 每个 URL 一个文件，不影响其他缓存，可手动删除
- **[2.0 兼容不完整]** 极端 edge case 可能映射失败 → 降级为 "解析失败，建议升级到 3.0" 错误信息
- **[--find 性能]** 在大型 spec 中搜索所有字段可能慢 → 搜索结果流式输出，不构建完整结果集
