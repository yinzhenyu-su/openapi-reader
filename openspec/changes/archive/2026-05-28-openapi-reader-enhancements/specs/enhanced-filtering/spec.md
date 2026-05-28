## MODIFIED Requirements

### Requirement: List all endpoints

MODIFIED: `ls` command now supports --tag, --method, --deprecated filter flags.

The system SHALL support `ls --tag <name>` to filter endpoints by tag. Multiple `--tag` flags SHALL use OR logic.

The system SHALL support `ls --method <method>` to filter by HTTP method.

The system SHALL support `ls --deprecated` to show only deprecated endpoints. Without this flag, deprecated endpoints SHALL still be shown but marked with `⚠`.

#### Scenario: Filter by tag
- **WHEN** user runs `openapi-reader spec.yaml ls --tag Pets`
- **THEN** output SHALL show only endpoints tagged with "Pets"

#### Scenario: Filter by method
- **WHEN** user runs `openapi-reader spec.yaml ls --method POST`
- **THEN** output SHALL show only POST endpoints

#### Scenario: Show deprecated endpoints
- **WHEN** user runs `openapi-reader spec.yaml ls --deprecated`
- **THEN** output SHALL show only deprecated endpoints
