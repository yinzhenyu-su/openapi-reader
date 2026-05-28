## ADDED Requirements

### Requirement: Show API summary

The system SHALL show a high-level API overview when `summary` is used.

The output SHALL include:
- API title and version (from OpenAPI `info`)
- Total endpoint count
- Tag names with endpoint count per tag
- Authentication method(s)
- Server/base URL(s)
- Total schema/model count

#### Scenario: Show summary
- **WHEN** user runs `openapi-reader spec.yaml summary`
- **THEN** output SHALL show API info, endpoint count, tags, auth, servers, and model count
