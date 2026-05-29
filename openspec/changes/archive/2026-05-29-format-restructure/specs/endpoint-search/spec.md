## MODIFIED Requirements

### Requirement: Search endpoints by keyword

The system SHALL search endpoint summaries, descriptions, and paths for a given keyword when `search <keyword>` is used.

The default output format (`llm`) SHALL show:
- `## Search: "<keyword>"` as header
- Each result on its own line: `<method> <path>  <summary>`
- No method column padding

The human format (`--format human`) SHALL retain the original format with `Search results for "<keyword>":` header and padded method column.

Search SHALL be case-insensitive.

Results SHALL be ordered by relevance (path match > summary match > description match).

#### Scenario: Search finds matching endpoints in LLM format
- **WHEN** user runs `openapi-reader spec.yaml search "pet"`
- **THEN** output SHALL show `## Search: "pet"` header with unaligned result lines

#### Scenario: Search with no matches in LLM format
- **WHEN** user runs `openapi-reader spec.yaml search "nonexistent"`
- **THEN** output SHALL indicate `No endpoints matching "nonexistent"` (same in both formats)
