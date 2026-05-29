## 1. Format Dispatch

- [x] 1.1 Add `getFormatterType()` in `src/index.ts` replacing `shouldFormatJson()`: support `'llm' | 'human' | 'json'`, default to `'llm'`, treat `--format text` as alias for `human`
- [x] 1.2 Update global `--format` option default from `'text'` to `'llm'`
- [x] 1.3 Update all dispatch branches in `index.ts` (`ls`, `get`, `search`, `schema`, `summary`) to call LLM formatters for `'llm'` type and human formatters for `'human'` type

## 2. LLM Formatters — Core

- [x] 2.1 Create `src/formatters/llm.ts` with shared helpers: `fmtFieldLLM`, `fmtFieldsLLM` using Markdown list format with `req`/`opt` markers
- [x] 2.2 Implement `formatListingLLM()`: `## <tag>` headers, `<method> <path>  <summary>` lines, no padding
- [x] 2.3 Implement `formatDetailLLM()`: `## <METHOD> <path>` header, `### <Section>` subsections, `- <field>` lines
- [x] 2.4 Implement `formatParamsOnlyLLM()`, `formatResponseOnlyLLM()`, `formatCodesOnlyLLM()`: focused views with same Markdown structure
- [x] 2.5 Implement `formatSearchLLM()`: `## Search: "<keyword>"` header, result lines
- [x] 2.6 Implement `formatSchemaLLM()` and `formatSchemaWithBackRefsLLM()`: `## <name>` header, `- ` field lines
- [x] 2.7 Implement `formatSummaryLLM()`: `## <title> v<version>` header, compact key-value lines

## 3. Human Format (Migration — No Logic Change)

- [x] 3.1 Rename `formatListing` → `formatListingHuman` in `listing.ts`
- [x] 3.2 Rename `formatDetail`, `formatParamsOnly`, `formatResponseOnly`, `formatCodesOnly` → add `Human` suffix in `detail.ts`
- [x] 3.3 Rename `formatSearch` → `formatSearchHuman` in `search.ts`
- [x] 3.4 Rename `formatSchema`, `formatSchemaWithBackRefs` → add `Human` suffix in `schema.ts`
- [x] 3.5 Rename `formatSummary` → `formatSummaryHuman` in `summary.ts`
- [x] 3.6 Export renamed functions and update imports in `index.ts`

## 4. Tests

- [x] 4.1 Write tests for LLM listing formatter
- [x] 4.2 Write tests for LLM detail formatter (including params-only, response-only, codes-only)
- [x] 4.3 Write tests for LLM search formatter
- [x] 4.4 Write tests for LLM schema formatter
- [x] 4.5 Write tests for LLM summary formatter
- [x] 4.6 Update existing human formatter tests to use renamed import paths
- [x] 4.7 Verify `--format text` alias works (backward compat)

## 5. Cleanup & Verify

- [x] 5.1 Remove unused exports and imports after renaming
- [x] 5.2 Run full test suite: `npm test`
- [x] 5.3 Manual smoke test: `npm run build` and try `ls`, `get`, `search`, `schema`, `summary` with default format and `--format human`/`--format json`
