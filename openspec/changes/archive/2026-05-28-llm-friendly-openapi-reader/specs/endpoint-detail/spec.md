## ADDED Requirements

### Requirement: Show full endpoint detail

The system SHALL show comprehensive endpoint information when `get <method> <path>` is used without flags.

The output SHALL include:
- HTTP method and path
- Summary/description of the endpoint
- Authentication requirements
- Path parameters (name, type, required, description)
- Query parameters (name, type, required, description)
- Request body schema (content type, fields with type/required/description)
- Response schemas grouped by status code
- Common error status codes

#### Scenario: Show full endpoint detail
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets`
- **THEN** output SHALL include all sections: auth, path params, query params, request body, responses, errors

#### Scenario: Show detail for endpoint without request body
- **WHEN** user runs `openapi-reader spec.yaml get DELETE /pets/{id}`
- **THEN** output SHALL omit the "Request Body" section

---

### Requirement: Show only request parameters

The system SHALL show only request parameters when `get <method> <path> --params` is used.

The output SHALL include: path parameters, query parameters, request body (if any), and authentication info.

Path/query/body sections SHALL be visually separated with distinct headers.

#### Scenario: Show params with all three parameter types
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --params`
- **THEN** output SHALL show "Path Parameters", "Query Parameters", and "Request Body" as separate sections

#### Scenario: Show params when only path params exist
- **WHEN** user runs `openapi-reader spec.yaml get DELETE /pets/{id} --params`
- **THEN** output SHALL show "Path Parameters" section and omit query/body sections

---

### Requirement: Show only response schemas

The system SHALL show only response information when `get <method> <path> --response` is used.

The output SHALL show each response status code with its schema fields.

When `--response <code>` is used (e.g., `--response 201`), the system SHALL filter to show only that status code's response.

#### Scenario: Show all responses
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --response`
- **THEN** output SHALL show response schemas for all status codes (200, 201, 4xx, etc.)

#### Scenario: Filter response by status code
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --response 201`
- **THEN** output SHALL show only the 201 response schema

---

### Requirement: Show only status codes

The system SHALL show only possible HTTP status codes when `get <method> <path> --codes` is used.

The output SHALL list each status code with its reason phrase and brief description.

#### Scenario: Show status codes
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --codes`
- **THEN** output SHALL list all possible status codes with descriptions
