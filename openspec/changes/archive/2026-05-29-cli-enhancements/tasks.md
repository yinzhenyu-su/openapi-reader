## 1. Spec Cache

- [x] 1.1 Fix duplicate cache check in `parser.ts` (lines 53-62 and 67-74 are identical), clean up to single check-read path
- [x] 1.2 Verify cache write happens on successful parse, cache read restores properly
- [x] 1.3 Verify `--no-cache` skips cache for remote URLs
- [ ] 1.4 Add test for cache hit/miss scenarios (requires remote URL or mock — low priority)

## 2. OpenAPI 2.0 Support

- [x] 2.1 Add `normalizeV2()` function in `parser.ts` to convert Swagger 2.0 to internal 3.0-like structure
- [x] 2.2 Replace hard `throw` on 2.0 detection with normalize and proceed
- [x] 2.3 Import `OpenAPIV2` types from `openapi-types` for type safety
- [x] 2.4 Add test with a Swagger 2.0 spec snippet

## 3. Field Search (--find)

- [x] 3.1 Add `searchFields(keyword)` to `QueryEngine`: search all schema field names + descriptions
- [x] 3.2 Add `searchEndpointFields(keyword)` to `QueryEngine`: search endpoint parameter field names + descriptions
- [x] 3.3 Register `--find <keyword>` option on `ls`, `get`, `schema` commands in `index.ts`
- [x] 3.4 Create `src/formatters/search-fields.ts` with LLM output formatter for field search results
- [x] 3.5 Dispatch `--find` in relevant command actions
- [x] 3.6 Add tests for field search

## 4. Cleanup & Verify

- [x] 4.1 Run full test suite: `npm test`
- [x] 4.2 Manual smoke test: caching with remote URL, 2.0 spec, --find
- [x] 4.3 Build check: `npm run build`
