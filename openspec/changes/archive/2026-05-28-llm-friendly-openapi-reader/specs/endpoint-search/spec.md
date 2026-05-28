## ADDED Requirements

### Requirement: Search endpoints by keyword

The system SHALL search endpoint summaries, descriptions, and paths for a given keyword when `search <keyword>` is used.

The output SHALL show matching endpoints with method, path, and summary.

Search SHALL be case-insensitive.

Results SHALL be ordered by relevance (path match > summary match > description match).

#### Scenario: Search finds matching endpoints
- **WHEN** user runs `openapi-reader spec.yaml search "pet"`
- **THEN** all endpoints containing "pet" in path/summary/description SHALL be listed

#### Scenario: Search with no matches
- **WHEN** user runs `openapi-reader spec.yaml search "nonexistent"`
- **THEN** output SHALL indicate no matches found
