## ADDED Requirements

### Requirement: Priority ordering for fields

The system SHALL sort fields within each section by priority: required fields first, then optional fields, then read-only fields.

Within each priority group, fields SHALL be sorted alphabetically by name.

Response status codes SHALL be sorted numerically (200, 201, 400, 401, 404, 500...).

Error codes (4xx/5xx) SHALL appear after success codes (2xx) in the errors section.

#### Scenario: Required fields first
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --priority`
- **THEN** required fields SHALL appear before optional fields

#### Scenario: Status codes sorted
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets`
- **THEN** response codes SHALL appear in numeric order
