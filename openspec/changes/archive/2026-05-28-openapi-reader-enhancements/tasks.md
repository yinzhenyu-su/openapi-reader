## 1. allOf Support + Description Truncation + Priority Ordering

- [x] 1.1 Add allOf resolution in schemaToFields(): merge properties from all allOf entries
- [x] 1.2 Add description truncation in fmtField(): first sentence, max 80 chars
- [x] 1.3 Add priority ordering in fmtFields(): required first, optional second, read-only last
- [x] 1.4 Sort response status codes numerically

## 2. Header Parameters + Deprecation

- [x] 2.1 Add headerParams to ParamSection in types.ts and query.ts
- [x] 2.2 Add "Header Parameters" section to detail formatter
- [x] 2.3 Add deprecated field to EndpointDetail and OperationInfo
- [x] 2.4 Show `⚠ DEPRECATED` in get output with deprecation message
- [x] 2.5 Mark deprecated endpoints with `⚠` in ls output

## 3. ls Filtering

- [x] 3.1 Add `--tag` flag to ls command (repeatable, OR logic)
- [x] 3.2 Add `--method` flag to ls command
- [x] 3.3 Add `--deprecated` flag to ls command (show only deprecated)
- [x] 3.4 Implement query-side filtering in query.ts

## 4. Schema Back-reference

- [x] 4.1 Build reverse index from all endpoints to referenced schemas
- [x] 4.2 Add `--used-by` flag to schema command
- [x] 4.3 Format back-reference list in schema output

## 5. Spec Cache

- [x] 5.1 Create cache helper: key generation (MD5), cache dir management
- [x] 5.2 Implement cache read/write in parser.ts load()
- [x] 5.3 Add `--no-cache` flag to all commands
- [x] 5.4 Handle cache expiration (1 hour default)

## 6. JSON Output Format

- [x] 6.1 Create `src/formatters/json.ts` with JSON serialization for all output types
- [x] 6.2 Add `--format json` flag to all commands
- [x] 6.3 Wire format flag to dispatch between text/JSON formatters

## 7. Depth Control

- [x] 7.1 Add depth parameter to schemaToFields() and propagate through query pipeline
- [x] 7.2 Add `--depth` flag to get and schema commands
- [x] 7.3 Implement child field suppression when depth limit reached

## 8. Token Budget

- [x] 8.1 Implement token estimation function (text.length / 4)
- [x] 8.2 Implement token budget truncation fallback
- [x] 8.3 Add `--max-tokens` flag to all commands
- [x] 8.4 Add truncated marker to output

## 9. Testing

- [x] 9.1 Update test-spec.yaml with deprecated endpoints, header params, allOf schema
- [x] 9.2 Test ls filtering with filters
- [x] 9.3 Test allOf resolution output
- [x] 9.4 Test header parameters display
- [x] 9.5 Test deprecated endpoint marking
- [x] 9.6 Test JSON format output correctness
- [x] 9.7 Test depth control output
- [x] 9.8 Test token budget compression
- [x] 9.9 Test cache hit/miss/no-cache
- [x] 9.10 Test schema back-reference
