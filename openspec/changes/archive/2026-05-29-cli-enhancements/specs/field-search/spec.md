## ADDED Requirements

### Requirement: Field-level search across schemas

The system SHALL support `--find <keyword>` flag on `schema` and endpoint query commands to search across all schema fields and endpoint parameters.

Search SHALL be case-insensitive and match against field names and field descriptions.

When used with `schema --find <keyword>`, the system SHALL search all schema definitions' fields.

When used with `get --find <keyword>` or `ls --find <keyword>`, the system SHALL search all endpoint parameters (path, query, header, body fields).

Output SHALL list matching schema/endpoint with matched fields and their context.

#### Scenario: Find field across all schemas
- **WHEN** user runs `openapi-reader spec.yaml schema --find email`
- **THEN** output SHALL list all schemas containing a field matching "email" (name or description)

#### Scenario: Find field across all endpoints
- **WHEN** user runs `openapi-reader spec.yaml ls --find "page"`
- **THEN** output SHALL list all endpoints whose parameters contain a field matching "page"

#### Scenario: No matches
- **WHEN** user runs `openapi-reader spec.yaml schema --find nonexistentfieldxyz`
- **THEN** output SHALL indicate no matches found

#### Scenario: Empty find keyword
- **WHEN** user runs `openapi-reader spec.yaml schema --find ""`
- **THEN** output SHALL show error message indicating empty search term
