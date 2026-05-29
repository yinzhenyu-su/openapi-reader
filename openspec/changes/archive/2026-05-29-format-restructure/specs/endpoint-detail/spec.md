## MODIFIED Requirements

### Requirement: Show full endpoint detail

The default output format (`llm`) SHALL use Markdown structure:
- `## <METHOD> <path>` as the endpoint header
- `### <Section Name>` for each parameter/response section
- `- <name>: <type>, <req/opt>  <description>` for each field
- `req`/`opt` as required/optional markers (replacing `✱`/spaces)
- No column padding on field names or types
- No Unicode separator line (48x ─)
- No blank lines between sections

The human format (`--format human`) SHALL retain the original padded-column layout with Unicode separators and `✱` markers.

Sub-commands (`--params`, `--response`, `--codes`) SHALL also support both formats.

#### Scenario: Show detail in LLM format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets`
- **THEN** output SHALL use Markdown headings and list items with `req`/`opt` markers

#### Scenario: Show detail in human format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --format human`
- **THEN** output SHALL show original aligned-column format with separators and `✱` markers

#### Scenario: Show params only in LLM format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --params`
- **THEN** output SHALL use Markdown headings for parameter sections with `-` list items

#### Scenario: Show response only in LLM format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --response`
- **THEN** output SHALL show `### <code>` headers for each response with compact field lines

#### Scenario: Show codes in LLM format
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --codes`
- **THEN** output SHALL show `## <METHOD> <path>` header followed by `<code>  <description>` lines
