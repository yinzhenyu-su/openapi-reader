## Why

当前 text format 同时服务人类和 LLM 两个受众，但两者需求冲突：

| 维度 | 人类需要 | LLM 需要 |
|------|---------|---------|
| 视觉对齐 | `padEnd(18)` 列对齐 | 无 padding，紧凑 |
| 分隔线 | 48 个 ─ 的视觉分割 | 不需要，或 `---` 足够 |
| 必填标记 | `✱` (Unicode 醒目) | `req` (可预测文本) |
| 空白 | 空行呼吸感 | 跳过空行，直接扫结构 |

结果：text format 在两者间妥协，token 效率不高。

## What Changes

1. 默认 format 从当前 text → 新的 LLM-optimized markdown 格式
2. 当前 text format 移至 `--format human`（人类可读旧格式）
3. 所有命令 (`ls`, `get`, `search`, `schema`, `summary`) 都支持三种 format

```
当前:              改后:
--format text      --format human     (旧 text, 人类可读)
                   --format llm       (新默认, LLM 优化)
--format json      --format json      (不变)
```

4. 全局 `--format` 默认值从 `text` 改为 `llm`

## Capabilities

### Modified Capabilities

所有现有 formatter 均需修改（`listing`, `detail`, `schema`, `search`, `summary` 及各自的 `shared.ts` 工具函数）：

**新 LLM format 设计要点：**
- Markdown 结构：`##` 做 endpoint 标题, `###` 做 section 标题
- `- ` 列表做字段行
- `req`/`opt` 替代 `✱`/`  `
- 无 `padEnd` 列对齐
- 无 48-char Unicode 分隔线（用 `---` 或完全省略）
- `oneOf` 用 type 判别器值做标签（去掉 `(choose one)` 和 `Option N:`）
- 枚举值保持 inline 但更紧凑
- 区块间无多余空行

**新 human format（即旧 text，不动）：**
- 原封不动迁移，只改入口

**`shouldFormatJson()` 逻辑扩展为 `getFormatterType()`：**
```
'llm' | 'human' | 'json'
```

### Unchanged Capabilities

- 所有 parser / query engine / types 逻辑不变
- JSON format 完全不变
- CLI 参数结构不变（只改 `--format` 的允许值和默认值）

## Impact

### Artifacts To Create
- `openspec/changes/format-restructure/design.md`
- `openspec/changes/format-restructure/tasks.md`

### Files To Modify

| 文件 | 改动 |
|------|------|
| `src/index.ts` | `--format` 默认值 `text` → `llm`；`shouldFormatJson` → `getFormatterType`；所有 dispatch 加 `human` 分支 |
| `src/formatters/listing.ts` | 新增 `formatListingLLM` |
| `src/formatters/detail.ts` | 新增 `formatDetailLLM`, `formatParamsOnlyLLM`, `formatResponseOnlyLLM`, `formatCodesOnlyLLM` |
| `src/formatters/schema.ts` | 新增 `formatSchemaLLM`, `formatSchemaWithBackRefsLLM` |
| `src/formatters/search.ts` | 新增 `formatSearchLLM` |
| `src/formatters/summary.ts` | 新增 `formatSummaryLLM` |
| 新增 | `src/formatters/llm.ts`（或分散在各 formatter，看团队风格） |
| 测试 | 为每组新 LLM formatter 加测试用例 |

### No Change To

- `src/formatters/json.ts`
- `src/parser.ts`, `src/query.ts`, `src/types.ts`
- 测试 spec 文件
- package.json

### Backward Compatibility

- `--format text` 仍可用（等价于 `--format human`）
- 默认行为改变：原来 `openapi-reader ...` → 旧 text，现在 → LLM format
- 脚本使用者需加 `--format human` 保持旧行为
