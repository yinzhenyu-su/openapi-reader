## 1. Project Setup

- [x] 1.1 Initialize Node.js/TypeScript project with package.json, tsconfig.json
- [x] 1.2 Install dependencies: commander, @apidevtools/swagger-parser, openapi-types
- [x] 1.3 Create CLI entry point and argument parsing skeleton with commander
- [x] 1.4 Set up build pipeline (tsc) and npm scripts

## 2. Test Spec

- [x] 2.1 Create a test OpenAPI 3.0 spec file covering all target features: multiple tags, path/query/body params, required/optional, enums, arrays, nested $ref, oneOf/anyOf, multiple response codes, descriptions, auth methods

## 3. Parser Layer

- [x] 3.1 Implement spec loader: support local .json, .yaml, and remote URLs
- [x] 3.2 Integrate swagger-parser to resolve $ref and produce a complete resolved document
- [x] 3.3 Add error handling for invalid/malformed specs with clear messages

## 4. Query Engine

- [x] 4.1 Implement endpoint listing logic (group by tag, sort)
- [x] 4.2 Implement endpoint detail extraction: path/query/body params, responses, auth
- [x] 4.3 Implement endpoint search by keyword
- [x] 4.4 Implement schema viewer with nested ref resolution (show ref names, not inline)
- [x] 4.5 Implement API summary extraction (info, tag counts, model counts)
- [x] 4.6 Implement response code filtering for --params, --response, --codes sub-commands

## 5. Output Formatter

- [x] 5.1 Implement field formatting: type display (string, int, string[]), required marker (✱), enum values, oneOf tree display
- [x] 5.2 Implement endpoint list formatter (tag-grouped, aligned columns)
- [x] 5.3 Implement endpoint detail formatter (full + --params/--response/--codes)
- [x] 5.4 Implement search results formatter
- [x] 5.5 Implement schema viewer formatter
- [x] 5.6 Implement API summary formatter

## 6. CLI Integration

- [x] 6.1 Wire ls command to listing query + formatter
- [x] 6.2 Wire get command with --params/--response/--codes flags to detail query + formatter
- [x] 6.3 Wire search command to search query + formatter
- [x] 6.4 Wire schema command to schema query + formatter
- [x] 6.5 Wire summary command to summary query + formatter

## 7. Testing

- [x] 7.1 Test with self-built test spec: verify all commands produce correct output
- [x] 7.2 Test with remote URL spec (GitHub API with 1186 endpoints)
- [x] 7.3 Test error cases: invalid path, nonexistent file, malformed spec, unknown endpoint
- [x] 7.4 Token efficiency verification: measure output token count vs raw spec size (97% reduction achieved)

## 8. Polish

- [x] 8.1 Add --help output for all commands (handled by commander)
- [x] 8.2 Handle edge cases: specs without tags (→ "Other" group), without auth (→ "None"), no-auth endpoints (→ security: [] override)
- [x] 8.3 Verify output readability with an actual LLM prompt test (verified: POST /pets output is 40 lines/~475 tokens, complete enough to generate correct API call with auth, required fields, enum values, response parsing, and error handling)
