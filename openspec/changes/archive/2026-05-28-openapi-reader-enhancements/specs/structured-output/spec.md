## ADDED Requirements

### Requirement: Output as JSON

The system SHALL support `--format json` flag for all commands to output structured JSON instead of formatted text.

JSON output SHALL use camelCase field names.

JSON output SHALL include all information that would be shown in text mode.

The JSON structure SHALL be consistent across commands, with each command returning a JSON object or array.

#### Scenario: ls --format json
- **WHEN** user runs `openapi-reader spec.yaml ls --format json`
- **THEN** output SHALL be a JSON array of endpoint objects

#### Scenario: get --format json
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --format json`
- **THEN** output SHALL be a JSON object with endpoint detail

#### Scenario: schema --format json
- **WHEN** user runs `openapi-reader spec.yaml schema Pet --format json`
- **THEN** output SHALL be a JSON object with field definitions

#### Scenario: summary --format json
- **WHEN** user runs `openapi-reader spec.yaml summary --format json`
- **THEN** output SHALL be a JSON object with API overview
