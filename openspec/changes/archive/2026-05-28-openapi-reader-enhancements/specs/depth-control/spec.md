## ADDED Requirements

### Requirement: Control nested field depth

The system SHALL support `--depth N` flag for `get` and `schema` commands to limit how many levels of nested object fields are shown.

`--depth 0` SHALL show field names and types only, with no children expanded.

`--depth 1` SHALL show one level of fields. Nested object fields SHALL show type only.

`--depth 2` SHALL expand one level of nesting.

Without the `--depth` flag, the system SHALL expand all levels (current default behavior).

#### Scenario: Depth 0
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --depth 0`
- **THEN** output SHALL show field names and types without expanding any nested objects

#### Scenario: Depth 1
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --depth 1`
- **THEN** output SHALL show top-level fields; nested objects SHALL show `object` without children

#### Scenario: No depth flag
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets`
- **THEN** output SHALL expand all nested fields (current behavior)
