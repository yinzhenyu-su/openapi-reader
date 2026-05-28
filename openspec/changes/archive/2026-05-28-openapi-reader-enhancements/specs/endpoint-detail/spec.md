## MODIFIED Requirements

### Requirement: Show full endpoint detail

MODIFIED: Now includes header parameters, deprecation warnings, allOf resolution, and truncated descriptions.

The output SHALL include a new "Header Parameters" section when header-type parameters exist.

The output SHALL show `⚠ DEPRECATED` at the top when the endpoint is deprecated, along with any deprecation message.

The system SHALL resolve `allOf` schema compositions by merging properties from all entries.

Field descriptions longer than 80 characters SHALL be truncated at the first sentence with `...`.

#### Scenario: Show header parameters
- **WHEN** spec has parameters with `in: header`
- **THEN** output SHALL include "Header Parameters" section between Query Parameters and Request Body

#### Scenario: Show deprecated endpoint
- **WHEN** endpoint has `deprecated: true`
- **THEN** output SHALL show `⚠ DEPRECATED` at top with deprecation message

#### Scenario: Resolve allOf
- **WHEN** schema uses allOf composition
- **THEN** all properties from all allOf entries SHALL be merged and displayed

#### Scenario: Truncate long description
- **WHEN** field description exceeds 80 characters
- **THEN** description SHALL be cut at first sentence boundary and end with `...`
