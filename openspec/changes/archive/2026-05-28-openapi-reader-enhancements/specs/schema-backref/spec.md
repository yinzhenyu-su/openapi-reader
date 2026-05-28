## ADDED Requirements

### Requirement: Schema back-references

The system SHALL support `schema <name> --used-by` to show which endpoints reference the given schema.

The output SHALL list each referencing endpoint with method, path, and where it's used (request body / response).

#### Scenario: Schema used by endpoints
- **WHEN** user runs `openapi-reader spec.yaml schema Pet --used-by`
- **THEN** output SHALL list endpoints that use Pet in request or response

#### Scenario: Schema not used
- **WHEN** user runs `openapi-reader spec.yaml schema UnusedSchema --used-by`
- **THEN** output SHALL indicate no endpoints use this schema
