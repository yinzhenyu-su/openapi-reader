## ADDED Requirements

### Requirement: Token budget control

The system SHALL support `--max-tokens N` flag for all commands to limit output to approximately N tokens.

Token estimation SHALL use `Math.ceil(text.length / 4)` for ASCII text.

When output exceeds the budget, the system SHALL progressively compress:
1. Truncate descriptions to first sentence
2. Reduce depth to 1 (no nested expansion)
3. Remove optional fields (keep only required)
4. Show only summary line

The system SHALL append `(truncated to ~N tokens)` to the end of compressed output.

#### Scenario: Budget sufficient
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --max-tokens 1000`
- **THEN** output SHALL be complete (under budget)

#### Scenario: Budget exceeded
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --max-tokens 100`
- **THEN** output SHALL be progressively compressed to fit ~100 tokens

#### Scenario: Budget very small
- **WHEN** user runs `openapi-reader spec.yaml get POST /pets --max-tokens 20`
- **THEN** output SHALL show only method, path, and summary
