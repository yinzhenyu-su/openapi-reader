## ADDED Requirements

### Requirement: Show API summary

The system SHALL show a high-level API overview when `summary` is used.

The system SHALL support two output formats:
- Default (`llm`): `## <title> v<version>` header, `- <label>: <value>` compact lines, no column alignment padding, no Unicode separator line
- Human (`--format human`): Original aligned-key format with `──────────────────────────────────────────────────` separator line

The output SHALL include:
- API title and version (from OpenAPI `info`)
- Total endpoint count
- Tag names with endpoint count per tag
- Authentication method(s)
- Server/base URL(s)
- Total schema/model count

#### Scenario: Show summary in LLM format
- **WHEN** user runs `openapi-reader spec.yaml summary`
- **THEN** output SHALL show `## <title> v<version>` header with compact `- <label>: <value>` lines

#### Scenario: Show summary in human format
- **WHEN** user runs `openapi-reader spec.yaml summary --format human`
- **THEN** output SHALL show original aligned-key format with separator line
