---
name: write-playwright-from-yaml
description: Generate or update TypeScript Playwright tests from nearby .test-cases.yaml documentation in this repository. Use when the user asks to automate a YAML test case, convert YAML test documentation into a Playwright spec, sync a .spec.ts file with a YAML test case, or implement tests from the project's structured test-case files.
---

# Write Playwright From YAML

## Overview

Turn the project's human-readable YAML test cases into maintainable Playwright tests. Treat YAML as the intent and existing `.spec.ts` files as the implementation style guide.

## Workflow

1. Read the selected `.test-cases.yaml` file completely.
2. Read the matching `.spec.ts` file from `suite.automationFile` or the nearest spec file in the same folder.
3. Read relevant files under `tests/support/` when the existing spec uses helpers.
4. Implement only cases whose `automation.status` is `planned` or whose automation is requested by the user.
5. Reuse existing setup, helpers, imports, locator style, and cleanup patterns from the target spec.
6. Add or update `automation.testName` and set `automation.status: automated` in the YAML only for cases that were actually implemented.
7. Keep the generated test name close to the YAML title, but use the language/style already present in the spec file when needed.
8. Do not add Allure-specific code unless the user explicitly asks for Allure.
9. Do not create a commit until the user confirms the result works.

## Required References

Read `references/playwright-generation-rules.md` before editing Playwright tests.

If the YAML schema is unclear, also read the schema reference from the companion skill:
`.codex/skills/write-test-case-yaml/references/test-case-yaml-format.md`.

## Implementation Rules

- Use `@playwright/test` imports already present in the file.
- Prefer accessible locators such as `getByRole`, `getByLabel`, and `getByText` for UI tests.
- For integration tests, reuse the existing container lifecycle and `try/finally` cleanup pattern.
- For Appium/WebDriverIO-backed mobile tests, reuse helpers from `tests/support/appium.ts` or `tests/support/webdriverio.ts`.
- Avoid generating a generic step interpreter; write clear Playwright code.
- Avoid broad refactors of existing tests while adding a case.
- Keep YAML and spec changes in sync.
- When editing `agents/openai.yaml`, keep `interface.default_prompt` with the literal skill invocation, for example `$write-playwright-from-yaml`; verify the `$` was not removed by shell expansion.

## Validation

After edits, run the narrowest useful checks:

- Run `npm run typecheck`.
- Run the target Playwright command when it is practical for the area being changed.
- If a runtime dependency is unavailable, report the skipped runtime check and why.
- Check that `agents/openai.yaml` still contains the literal `$write-playwright-from-yaml` in `interface.default_prompt`.
