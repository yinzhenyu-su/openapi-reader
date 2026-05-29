## ADDED Requirements

### Requirement: OpenAPI 2.0 (Swagger) spec support

The system SHALL support parsing OpenAPI 2.0 (Swagger) specification files, in addition to OpenAPI 3.0.

The parser SHALL detect the spec version from the `swagger` field (2.0) vs `openapi` field (3.0).

The system SHALL normalize OpenAPI 2.0 structures to internal 3.0-like representation:
- `swagger: "2.0"` → `openapi: "2.0"`
- `host` + `basePath` + `schemes` → `servers` array
- `definitions` → `components.schemas`
- `securityDefinitions` → `components.securitySchemes`
- `consumes`/`produces` → content type info on requestBody/response
- Path parameter `in: "body"` → request body

All existing commands (`ls`, `get`, `search`, `schema`, `summary`) SHALL work identically on 2.0 specs.

#### Scenario: Parse Swagger 2.0 spec
- **WHEN** user runs `openapi-reader swagger.yaml summary`
- **THEN** output SHALL show correct API info, endpoints, and schemas from the Swagger 2.0 spec

#### Scenario: Swagger 2.0 with definitions
- **WHEN** user runs `openapi-reader swagger.yaml schema Pet`
- **THEN** output SHALL correctly resolve `$ref` references to definitions and show fields

#### Scenario: Swagger 2.0 endpoint detail
- **WHEN** user runs `openapi-reader swagger.yaml get POST /pets`
- **THEN** output SHALL show correct parameters and response schemas

#### Scenario: Invalid spec
- **WHEN** user provides an unknown spec format
- **THEN** output SHALL show clear error with suggestion to use OpenAPI 2.0 or 3.0
