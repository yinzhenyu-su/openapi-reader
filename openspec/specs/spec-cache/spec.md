## ADDED Requirements

### Requirement: Cache remote specs

The system SHALL cache remotely fetched and parsed OpenAPI specs to `~/.cache/openapi-reader/<hash>.json`.

Cache key SHALL be the MD5 hash of the URL.

Cache entries SHALL expire after 1 hour by default.

The `--no-cache` flag SHALL skip cache and force re-fetching.

The system SHALL write to cache after successful parse, before output.

#### Scenario: Cache hit
- **WHEN** user runs `openapi-reader https://example.com/spec.yaml ls`
- **THEN** if cached file exists and not expired, use cached version

#### Scenario: Cache miss
- **WHEN** user runs `openapi-reader https://example.com/spec.yaml ls` first time
- **THEN** fetch remote, parse, cache, output

#### Scenario: Force no cache
- **WHEN** user runs `openapi-reader https://example.com/spec.yaml ls --no-cache`
- **THEN** skip cache, fetch fresh
