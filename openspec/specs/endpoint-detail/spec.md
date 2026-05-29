## MODIFIED Requirements

### Requirement: Show full endpoint detail

MODIFIED: Now supports dual output format (default LLM-optimized markdown, with original format as `--format human`).

The system SHALL support two output formats:
- Default (`llm`): Markdown structure with `## <METHOD> <path>` header, `### <Section Name>` subsections, `- <name>: <type>, <req/opt>  <description>` field lines. Uses `req`/`opt` markers for required/optional. No column padding, no Unicode separator line, no blank lines between sections.
- Human (`--format human`): Original padded-column layout with Unicode separators, `✱` markers, and column alignment.

The output SHALL include a "Header Parameters" section when header-type parameters exist.

The output SHALL show deprecation information when the endpoint is deprecated.

The system SHALL resolve `allOf` schema compositions by merging properties from all entries.

Field descriptions longer than 80 characters SHALL be truncated at the first sentence with `...`.

Sub-commands (`--params`, `--response`, `--codes`) SHALL also support both output formats.

#### Scenario: Show full detail in LLM format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets`
- **THEN** default output SHALL use `##`/`###` markdown headings and `-` list items with `req`/`opt` markers

#### Scenario: Show full detail in human format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --format human`
- **THEN** output SHALL show original aligned-column format with separators and `✱` markers

#### Scenario: Show header parameters
- **WHEN** spec has parameters with `in: header`
- **THEN** output SHALL include "Header Parameters" section between Query Parameters and Request Body

#### Scenario: Show deprecated endpoint
- **WHEN** endpoint has `deprecated: true`
- **THEN** output SHALL show deprecation marker

#### Scenario: Resolve allOf
- **WHEN** schema uses allOf composition
- **THEN** all properties from all allOf entries SHALL be merged and displayed

#### Scenario: Truncate long description
- **WHEN** field description exceeds 80 characters
- **THEN** description SHALL be cut at first sentence boundary and end with `...`

#### Scenario: Show params only in LLM format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --params`
- **THEN** output SHALL use markdown headings for parameter sections with `-` list items, no response/error sections

#### Scenario: Show response only in LLM format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --response`
- **THEN** output SHALL show `## <METHOD> <path>` header and `### <code>` headers for each response

#### Scenario: Show codes in LLM format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --codes`
- **THEN** output SHALL show `## <METHOD> <path>` header followed by `- <code>  <description>` lines
