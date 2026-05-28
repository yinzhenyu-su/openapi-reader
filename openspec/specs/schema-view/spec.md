## ADDED Requirements

### Requirement: View schema definition

The system SHALL show a schema/model definition when `schema <name>` is used.

The output SHALL list all fields with: name, type, required status, description, and enum values (if applicable).

Nested object schemas SHALL be shown as a reference (`→ SchemaName`), not expanded inline.

Array fields SHALL use `Type[]` notation (e.g., `string[]`, `Pet[]`).

oneOf/anyOf schemas SHALL preserve the keyword and list each variant on a separate line with `├─` prefix.

#### Scenario: View simple schema
- **WHEN** user runs `openapi-reader spec.yaml schema Pet`
- **THEN** output SHALL list all Pet fields with types and required markers

#### Scenario: View schema with nested refs
- **WHEN** user runs `openapi-reader spec.yaml schema Order`
- **THEN** nested object fields SHALL show `→ SchemaName (ref)` instead of expanded content

#### Scenario: View schema with enum
- **WHEN** user runs `openapi-reader spec.yaml schema Pet`
- **THEN** enum fields SHALL show `One of: cat, dog, fish`

#### Scenario: View schema with oneOf
- **WHEN** user runs `openapi-reader spec.yaml schema Payment`
- **THEN** oneOf variants SHALL be listed with `├─` prefix

#### Scenario: Schema not found
- **WHEN** user runs `openapi-reader spec.yaml schema Unknown`
- **THEN** output SHALL indicate schema not found
