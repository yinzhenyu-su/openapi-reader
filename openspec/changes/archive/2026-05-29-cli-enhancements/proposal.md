## Why

当前工具在 LLM 会话中每次查询都重新解析整个 spec（对大型 spec 如 GitHub API ~1-3 秒），且搜索能力局限——只能搜 endpoint 路径/描述，不能搜字段。此外只支持 OpenAPI 3.0，限制了工具适用范围。

## What Changes

1. **Spec 缓存**：实现 `openspec/specs/spec-cache/spec.md` 已定义的缓存机制，远程 URL spec 首次解析后缓存到本地，后续查询秒回。已存在的 `--no-cache` flag 保持不变。
2. **字段级搜索**：新增 `--find <keyword>` 选项，支持跨所有 schema 和 endpoint 参数的字段名/描述搜索。解决"找到所有含 email 字段的 schema"这类问题。
3. **OpenAPI 2.0 支持**：扩展 parser 层兼容 Swagger 2.0 (OpenAPI 2.0) spec，用已有解析库能力完成转换适配。

## Capabilities

### New Capabilities
- `field-search`: 跨 schema 和 endpoint 参数的字段名/描述搜索
- `openapi-2-support`: 兼容 OpenAPI 2.0 (Swagger) 格式的 spec 解析

### Modified Capabilities
- `spec-cache`: 实现远程 spec 本地缓存（spec 已定义，仅实现）

## Impact

- `src/index.ts`: 新增 `--find` 选项注册
- `src/query.ts`: 新增字段搜索逻辑、缓存读写逻辑
- `src/parser.ts`: 扩展支持 OpenAPI 2.0 解析
- `src/types.ts`: 可能需扩展搜索相关类型
- `test-spec.yaml`: 可考虑添加 OpenAPI 2.0 测试 spec
- 新依赖：`openapi-types` 已支持 2.0
