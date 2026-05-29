## ADDED Requirements

### Requirement: View schema definition

The system SHALL show a schema/model definition when `schema <name>` is used.

The system SHALL support two output formats:
- Default (`llm`): Markdown structure with `## <name>` header, `- <name>: <type>, <req/opt>  <description>` field lines. Uses `req`/`opt` markers. No column padding, no Unicode separator line.
- Human (`--format human`): Original padded-column layout with separators and `✱` markers, oneOf/anyOf variants listed with `├─` prefix.

The output SHALL list all fields with: name, type, required status, description, and enum values (if applicable).

Nested object schemas SHALL be shown as a reference (`→ SchemaName`), not expanded inline.

Array fields SHALL use `Type[]` notation (e.g., `string[]`, `Pet[]`).

When `--used-by` flag is set, the output SHALL append a "Used by:" section listing endpoints that reference this schema, with `<method> <path>  (<location>)` lines.

#### Scenario: View simple schema in LLM format
- **WHEN** user runs `openapi-reader spec.yaml schema Pet`
- **THEN** output SHALL show `## Pet` with `-` list items and `req`/`opt` markers

#### Scenario: View simple schema in human format
- **WHEN** user runs `openapi-reader spec.yaml schema Pet --format human`
- **THEN** output SHALL show original aligned-column format with `✱` markers

#### Scenario: View schema with nested refs
- **WHEN** user runs `openapi-reader spec.yaml schema Order`
- **THEN** nested object fields SHALL show `→ SchemaName (ref)` instead of expanded content

#### Scenario: View schema with enum
- **WHEN** user runs `openapi-reader spec.yaml schema Pet`
- **THEN** enum fields SHALL show inline values (e.g., `cat | dog | fish`)

#### Scenario: View schema with back references
- **WHEN** user runs `openapi-reader spec.yaml schema Pet --used-by`
- **THEN** output SHALL include "Used by:" section with `<method> <path>  (<location>)` lines

#### Scenario: Schema not found
- **WHEN** user runs `openapi-reader spec.yaml schema Unknown`
- **THEN** output SHALL indicate schema not found
