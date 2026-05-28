---
name: project
description: |
  Project-level knowledge for openapi-reader. Use when the user asks about
  project structure, build/test commands, code conventions, or adding new
  features. Loaded automatically to give general-purpose agents project
  context.
  Do NOT use for OpenSpec workflow tasks (those go to openspec-* skills).
---

# openapi-reader v0.1.0

CLI tool for LLM-friendly OpenAPI document querying

## Scripts

| `npm run build` | `tsc` |
| `npm run start` | `node dist/index.js` |
| `npm run dev` | `tsc --watch` |
| `npm run test` | `vitest run` |
| `npm run test:watch` | `vitest` |
| `npm run lint` | `eslint src/` |
| `npm run lint:fix` | `eslint src/ --fix` |
| `npm run generate:skill` | `node scripts/generate-project-skill.mjs` |

## CLI Commands

Usage: `openapi-reader <spec> <command> [options]`

All commands support `--format json`.

| `ls` | List all endpoints grouped by tag |
| `get` | Get endpoint details |
| `search` | Search endpoints by keyword |
| `schema` | View a schema/model definition |
| `summary` | Show API overview |

## Source layout

```
src/
├── __tests__
│   └── parser.test.ts
├── formatters
│   ├── detail.ts
│   ├── json.ts
│   ├── listing.ts
│   ├── schema.ts
│   ├── search.ts
│   ├── shared.ts
│   └── summary.ts
├── index.ts
├── parser.ts
├── query.ts
└── types.ts
```

## Key modules

### `__tests__/`

- `__tests__/parser.test.ts`

### `formatters/`

Output formatters for each query type. All are pure functions returning strings.

- **`formatters/detail.ts`** — `formatDetail`, `formatParamsOnly`, `formatResponseOnly`, `formatCodesOnly`
- **`formatters/json.ts`** — `formatListingJSON`, `formatDetailJSON`, `formatSearchJSON`, `formatSchemaJSON`, `formatSummaryJSON`
- **`formatters/listing.ts`** — `formatListing`
- **`formatters/schema.ts`** — `formatSchema`, `formatSchemaWithBackRefs`, `formatSchemaNotFound`
- **`formatters/search.ts`** — `formatSearch`
- **`formatters/shared.ts`** — `fmtFields`, `fmtRequiredMark`, `fmtSectionHeader`, `fmtSeparator`
- **`formatters/summary.ts`** — `formatSummary`

### Root files

- **`index.ts`** — _no exports_
- **`parser.ts`** — `HttpMethod`, `OperationInfo`, `OpenApiParser`
- **`query.ts`** — `QueryEngine`
- **`types.ts`** — `EndpointSummary`, `FieldInfo`, `ParamSection`, `ResponseInfo`, `EndpointDetail`, `BackRef`, `ApiSummary`, `SchemaInfo`


## Conventions

- Use `import type` for type-only imports
- Output formatters are pure functions (no side effects)
- All commands share `--format text` (default) and `--format json` via `shouldFormatJson()`
- Parser exposes `OpenApiParser`, QueryEngine wraps parser with query methods
- `getTypeString` / `getBaseType` normalize OpenAPI types to compact strings (`int`, `bool`, `datetime`, etc.)
- `FieldInfo.children` handles nested object expansion; `depth` controls recursion
- `allOf` is merged in `mergeAllOf` before field traversal
- Sorting: required fields first, then optional, then readOnly; alphabetical within group
