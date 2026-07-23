# Test Documentation Index

Create `tests/TEST-CASES.md` as the clickable index for test documentation.

## Shape

```md
# Test Cases

## UI

| Functional area | Priority | Test cases | Automation |
| --- | --- | --- | --- |
| Juice Shop storefront | High | [juice-shop.test-cases.yaml](ui/juice-shop.test-cases.yaml) | [juice-shop.spec.ts](ui/juice-shop.spec.ts) |

## Integration

| Functional area | Priority | Test cases | Automation |
| --- | --- | --- | --- |
| PostgreSQL order events | High | [postgres.test-cases.yaml](integration/postgres.test-cases.yaml) | [postgres.spec.ts](integration/postgres.spec.ts) |
```

## Rules

- Keep paths relative to `tests/TEST-CASES.md`.
- Group rows by repository area.
- Use one row per YAML suite file.
- Use the same functional area and priority as the YAML `suite`.
- Add or update the index in every task that creates, renames, moves, or changes a YAML suite file.
- Add links only for files that exist or are created in the same task.
- Do not duplicate full test-case steps in Markdown; keep full case content in YAML.
