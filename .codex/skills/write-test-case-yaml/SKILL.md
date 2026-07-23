---
name: write-test-case-yaml
description: Create or update human-readable YAML test-case documentation next to Playwright tests in this repository. Use when the user describes a test scenario, asks to document a test case, add structured test documentation, create a .test-cases.yaml file, or update the clickable tests/TEST-CASES.md index for this TypeScript Playwright automation project.
---

# Write Test Case YAML

## Overview

Create YAML test-case files that are pleasant for QA engineers to read and structured enough for later Playwright generation. Keep the YAML as the source of truth for test cases, and keep Markdown only as a clickable index.

## Workflow

1. Read the relevant existing tests and support helpers before writing documentation.
2. Choose the closest test area under `tests/`: `ui`, `integration`, `mobile/ios-safari`, `mobile/ios-native`, or another existing folder.
3. Create or update a YAML file beside the target spec file using the name `<suite>.test-cases.yaml`.
4. Write natural-language steps and expected results in Russian or the user's language, unless the surrounding documentation clearly uses English.
5. Keep technical automation details only in the `automation` block.
6. Always create or update `tests/TEST-CASES.md` with clickable relative links to every new or changed YAML suite file and its matching `.spec.ts` file.
7. Do not add Allure-specific fields unless the user explicitly asks for Allure.
8. Do not create a commit until the user confirms the result works.

## Required Structure

Read `references/test-case-yaml-format.md` before creating or changing a YAML test-case file.

Read `references/test-docs-index.md` before creating or changing `tests/TEST-CASES.md`.

## Local Conventions

- Store suite-level metadata in `suite`.
- Store cases in `testCases`.
- Use stable, readable IDs such as `UI-JUICE-SHOP-LOGIN-001`.
- Prefer `priority: high | medium | low`.
- Prefer `type: positive | negative | smoke | regression | integration`.
- Set `automation.status` to `manual`, `planned`, or `automated`.
- Set `suite.automationFile` when all cases map to the same spec file.
- Set `automation.testName` per case when a case maps to a Playwright test.
- Keep links relative to the file where they appear.
- When editing `agents/openai.yaml`, keep `interface.default_prompt` with the literal skill invocation, for example `$write-test-case-yaml`; verify the `$` was not removed by shell expansion.

## Validation

After edits, check that:

- YAML indentation is valid and all list items are under the intended parent.
- Every linked YAML/spec file in `tests/TEST-CASES.md` exists or is being created in the same change.
- `suite.automationFile` points to the nearby Playwright spec when the suite is automated or planned for automation.
- Each test case has `id`, `title`, `priority`, `type`, `preconditions`, `steps`, `expectedResult`, and `automation.status`.
- `agents/openai.yaml` still contains the literal `$write-test-case-yaml` in `interface.default_prompt`.
