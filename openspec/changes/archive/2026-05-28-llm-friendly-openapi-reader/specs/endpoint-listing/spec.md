## ADDED Requirements

### Requirement: List all endpoints

The system SHALL list all API endpoints when the `ls` command is used.

The output SHALL group endpoints by their OpenAPI `tags`, with each tag as a section header.

Each endpoint line SHALL show: HTTP method (GET/POST/PUT/DELETE/PATCH) and full path.

Endpoints without a `tag` SHALL be grouped under "Other".

The output SHALL be ordered by tag name alphabetically, then by path and method within each tag.

#### Scenario: List endpoints with tags
- **WHEN** user runs `openapi-reader spec.yaml ls`
- **THEN** output SHALL show endpoints grouped by tag

#### Scenario: List endpoints without tags
- **WHEN** spec has endpoints with no tags
- **THEN** those endpoints SHALL appear under an "Other" group
