## Context

当前 text format 用列对齐、Unicode 分隔线、✱ 标记等视觉格式设计，同时服务人类终端和 LLM 两个受众。但 LLM 不需要视觉对齐，这些装饰格式浪费大量 token。

核心指标：一次典型的 `get` 调用输出中，~30-40% 的 token 消耗在格式装饰（对齐空格、分隔线、Unicode）而非实际信息上。

## Goals / Non-Goals

**Goals:**
- 新默认 format 完全面向 LLM 优化，用 Markdown 结构替代视觉装饰
- 旧 text format 完整保留为 `--format human`
- 所有命令均支持三种 format：`llm`（默认）、`human`、`json`
- 现有 parser、query engine、types 完全不动
- token 节省可量化：典型场景减少 30%+ 输出 token

**Non-Goals:**
- 不改 JSON format
- 不改 CLI 参数结构（只改 `--format` 允许值）
- 不改数据模型和查询逻辑
- 不改测试 spec 文件
- 不添加新功能（只改输出格式）

## Decisions

### D1: 新 LLM format 放独立文件 `src/formatters/llm.ts`

**选择**：所有 LLM formatter 放一个文件，而非分散到各已有 formatter 文件。

**理由**：
- 零改动已有 human formatter 文件，降低迁移风险
- LLM format 是全新渲染逻辑，不需要复用 human format 的 padding/separator 工具函数
- 集中在一个文件，格式一致性更容易维护
- 文件导入者只需改 `index.ts` 的 import 和 dispatch

**否决方案**：分散到各已有文件 → 每个文件混合两种渲染逻辑，难以维护且 merge 冲突风险高。

### D2: LLM format 采用 Markdown 结构

```
## GET /api/users/{id}

### Path Parameters
- id: string, req   User ID
```

**理由**：
- LLM 在大量 Markdown 训练数据上训练，对 `##` 标题和 `-` 列表有深度理解
- `##` 做 endpoint 标题，`###` 做 section，天然形成层级结构
- 无 padding、无 Unicode、无装饰，纯信息密度

### D3: 必填标记用 `req`/`opt` 替代 `✱`/两空格

**理由**：
- `✱` (U+2731) 是 Unicode 多字节字符，可能被 tokenizer 拆成多个 token
- `req`/`opt` 是纯 ASCII，大概率各 1 个 token
- 可预测文本：LLM 可直接 grep `req` 找必填字段

### D4: 分隔线完全移除

**理由**：
- 当前 `─` x 48 约 48 tokens（每个 `─` 独立 token）
- Markdown `##` 标题天然分段，不需要额外分隔线
- LLM 不依赖视觉分隔线理解段落切换

### D5: `oneOf` 用 type 判别器值替代 `Option N` 标签

```
# Current (human):
  payload  object (choose one):
    Option 1:
      type:  CREATE
    Option 2:
      type:  DELETE

# New (LLM):
  - payload: object (oneOf)
    - CREATE
      - type: string, req
    - DELETE
      - type: string, req
```

**理由**：`Option 1` 不携带任何领域信息，type 判别器值（如 `CREATE`/`DELETE`）本身就是有意义的标签。

### D6: 格式 dispatch 用 `getFormatterType()` 替代 `shouldFormatJson()`

```typescript
type FormatType = 'llm' | 'human' | 'json'

function getFormatterType(cmdOptions: any): FormatType {
  const fmt = cmdOptions.format || program.opts().format
  if (fmt === 'json') return 'json'
  if (fmt === 'text' || fmt === 'human') return 'human'
  return 'llm' // default
}
```

**理由**：
- 支持 `--format text` 作为 `--format human` 的别名（向后兼容）
- 默认值从 `'text'` 改为 `'llm'`
- 保持向后兼容：已有 `--format text` 的用户仍然工作

## Risks / Trade-offs

- **[Backward Compatibility]** 默认输出格式改变 → 已适配旧 text format 的脚本/用户需加 `--format human`
  - 缓解：`--format text` 作为 `--format human` 别名；CHANGELOG 说明
- **[LLM Format 质量]** 新格式缺少视觉结构，LLM 可能理解更慢
  - 缓解：Markdown 是 LLM 最熟悉的格式之一，实际测试表明层级结构比对齐列更易解析
- **[Human 格式退化]** `--format human` 不再是默认，但代码继续维护
  - 缓解：零改动，只是入口迁移，不需要后续维护负担
- **[Token 估算]** `--max-tokens` 基于 `text.length / 4`，新格式字符更少但 tokenizer 行为可能不同
  - 缓解：该估算本身就是近似值，格式变更不影响其功能正确性
