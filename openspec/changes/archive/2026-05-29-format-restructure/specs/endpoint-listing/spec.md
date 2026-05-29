## MODIFIED Requirements

### Requirement: List all endpoints

The system SHALL list all API endpoints when the `ls` command is used.

The default output format (`llm`) SHALL use Markdown structure:
- Tag groups as `## <tag>` headers
- Each endpoint on its own line: `<method> <path>  <summary>`
- No column padding on method
- Human format (`--format human`) SHALL retain the original aligned-column layout

The output SHALL group endpoints by their OpenAPI `tags`, with each tag as a section header.

Endpoints without a `tag` SHALL be grouped under "Other".

The output SHALL be ordered by tag name alphabetically, then by path and method within each tag.

#### Scenario: List endpoints in default LLM format
- **WHEN** user runs `openapi-reader spec.yaml ls`
- **THEN** output SHALL show `## <tag>` headers with unaligned method + path lines

#### Scenario: List endpoints in human format
- **WHEN** user runs `openapi-reader spec.yaml ls --format human`
- **THEN** output SHALL show original aligned-column grouping format

#### Scenario: List endpoints without tags
- **WHEN** spec has endpoints with no tags
- **THEN** those endpoints SHALL appear under an "Other" group in both formats
