## Why

openapi-reader 当前支持基础的端点查询，但在大型 spec（如 GitHub API 1186 端点）中信息过载，缺乏过滤、结构化输出和 token 控制手段。需要增强查询能力、增加 JSON 输出格式、支持深度控制和 token 预算，让 LLM 能更精准高效地获取所需信息。

## What Changes

- **ls 过滤**: 支持 `--tag`, `--method`, `--deprecated` 过滤端点列表
- **allOf 支持**: 解析 allOf 组合 schema，合并 properties
- **header 参数**: 展示 header 位置参数
- **反向引用**: `schema --used-by` 显示引用该 schema 的端点
- **描述截断**: 超长描述截断为第一句
- **Spec 缓存**: 缓存已解析的远程 spec 到本地文件
- **废弃标记**: 标记和过滤废弃端点
- **JSON 输出**: `--format json` 输出结构化 JSON
- **深度控制**: `--depth N` 控制嵌套展开层数
- **Token 预算**: `--max-tokens N` 渐进压缩输出到指定 token 量
- **优先级排序**: 必填字段优先展示，可选/只读靠后

## Capabilities

### New Capabilities
- `enhanced-filtering`: ls 命令增加 --tag, --method, --deprecated 过滤
- `structured-output`: 支持 --format json 输出
- `depth-control`: --depth 参数控制嵌套展开深度
- `token-budget`: --max-tokens 渐进压缩输出
- `priority-ordering`: 必填字段优先展示
- `schema-backref`: schema --used-by 反向引用查询
- `spec-cache`: 本地文件缓存已解析的远程 spec

### Modified Capabilities
- `endpoint-detail`: 新增 header 参数展示、废弃标记、allOf 解析、描述截断

## Impact

- 修改 `src/query.ts`, `src/formatters/` 下多个文件
- 新增 `src/formatters/json.ts` JSON 输出格式化
- 新增缓存目录 `~/.cache/openapi-reader/`
- 新增依赖（可选）：token 估算可能依赖 `gpt-tokenizer` 或自实现
