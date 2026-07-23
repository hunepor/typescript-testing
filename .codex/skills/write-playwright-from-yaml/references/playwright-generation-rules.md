# Playwright Generation Rules

## Repository Patterns

- Tests live under `tests/`.
- Playwright config uses `testDir: "./tests"`, serial workers, and `@playwright/test`.
- UI tests use `Page`, helper functions, accessible locators, and `expect`.
- Integration tests use Testcontainers helpers and cleanup resources in `finally`.
- Mobile Safari and native iOS tests are Playwright test wrappers around Appium/WebDriverIO sessions.

## Mapping YAML To Code

- Convert `preconditions` into setup steps, helper calls, or clear inline arrangement.
- Convert `steps` into direct Playwright/WebDriverIO actions.
- Convert `expectedResult` into assertions.
- Use data values found in natural-language steps directly when they are explicit.
- Reuse nearby helper functions such as `openJuiceShop`, `closeOptionalDialogs`, `searchFor`, `waitForText`, or container helpers if they already exist.
- Add a helper only when at least two tests need it or the setup would otherwise obscure the test intent.

## UI Locator Preferences

1. Prefer `page.getByRole(...)` for semantic controls and headings.
2. Prefer `page.getByLabel(...)` for inputs and labeled buttons.
3. Use `page.getByText(...)` for visible messages.
4. Use CSS locators only when the existing test uses them or no accessible locator is available.

## Integration Test Preferences

- Keep container/client creation at the start of the test.
- Put cleanup in `finally`.
- Use typed domain objects from `src/` when existing tests do so.
- Use `expect(...).resolves` or `expect.poll`/`toPass` consistently with the target file.

## YAML Sync

After implementing a case, update only the corresponding YAML case:

```yaml
automation:
  status: automated
  testName: exact Playwright test title
```

If implementation is blocked, leave `automation.status` as `planned` and explain the blocker to the user.
