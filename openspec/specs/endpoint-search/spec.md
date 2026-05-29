## ADDED Requirements

### Requirement: Search endpoints by keyword

The system SHALL search endpoint summaries, descriptions, and paths for a given keyword when `search <keyword>` is used.

The output SHALL show matching endpoints with method, path, and summary.

The system SHALL support two output formats:
- Default (`llm`): `## Search: "<keyword>"` header, `<method> <path>  <summary>` lines, no method column padding
- Human (`--format human`): `Search results for "<keyword>":` header with padded method column

Search SHALL be case-insensitive.

Results SHALL be ordered by relevance (path match > summary match > description match).

#### Scenario: Search finds matching endpoints (LLM format)
- **WHEN** user runs `openapi-reader spec.yaml search "pet"`
- **THEN** output SHALL show `## Search: "pet"` header with unaligned result lines

#### Scenario: Search with no matches
- **WHEN** user runs `openapi-reader spec.yaml search "nonexistent"`
- **THEN** output SHALL be `No endpoints matching "nonexistent"`
