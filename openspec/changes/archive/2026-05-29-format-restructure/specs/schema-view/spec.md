## MODIFIED Requirements

### Requirement: View schema definition

The system SHALL show a schema/model definition when `schema <name>` is used.

The default output format (`llm`) SHALL use Markdown structure:
- `## <name>` as header
- `- <field>: <type>, <req/opt>  <description>` for each field
- `req`/`opt` as required/optional markers
- No column padding on field names or types
- No Unicode separator line
- `--used-by` section: `Used by:` followed by `<method> <path>  (<location>)` lines

The human format (`--format human`) SHALL retain the original padded-column layout with separators and `✱` markers.

Nested object schemas SHALL be shown as a reference (`→ SchemaName`), not expanded inline, in both formats.

Array fields SHALL use `Type[]` notation (e.g., `string[]`, `Pet[]`).

#### Scenario: View simple schema in LLM format
- **WHEN** user runs `openapi-reader spec.yaml schema Pet`
- **THEN** output SHALL show `## Pet` header with `- ` list items and `req`/`opt` markers

#### Scenario: View schema with back-refs in LLM format
- **WHEN** user runs `openapi-reader spec.yaml schema Pet --used-by`
- **THEN** output SHALL show `Used by:` section with `<method> <path>  (<location>)` lines

#### Scenario: Schema not found
- **WHEN** user runs `openapi-reader spec.yaml schema Unknown`
- **THEN** output SHALL indicate schema not found (same in both formats)
