# Test-Case YAML Format

Use one YAML file per test suite, stored beside the related Playwright spec:

```text
tests/<area>/<suite>.spec.ts
tests/<area>/<suite>.test-cases.yaml
```

## Shape

```yaml
suite:
  id: UI-JUICE-SHOP
  title: Juice Shop UI
  area: ui
  feature: Storefront
  priority: high
  automationFile: juice-shop.spec.ts

testCases:
  - id: UI-JUICE-SHOP-LOGIN-001
    title: Ошибка при входе с неверными данными
    priority: high
    type: negative
    tags:
      - auth
      - login

    story:
      asA: пользователь магазина
      iWant: попробовать войти с email и паролем
      soThat: система показала понятную ошибку при неверных данных

    preconditions:
      - Открыт OWASP Juice Shop
      - Пользователь не авторизован

    steps:
      - Открыть страницу входа
      - Ввести email: not-a-user@example.test
      - Ввести пароль: wrong-password
      - Нажать кнопку Login

    expectedResult:
      - Появляется сообщение: Invalid email or password.

    automation:
      status: automated
      testName: shows an error for invalid login
```

## Field Rules

- `suite.id`: Stable suite ID in uppercase kebab form.
- `suite.title`: Human-readable suite name.
- `suite.area`: Repository area such as `ui`, `integration`, `mobile-ios-safari`, or `mobile-ios-native`.
- `suite.feature`: Functional area or feature.
- `suite.priority`: Default suite priority, usually `high`, `medium`, or `low`.
- `suite.automationFile`: Spec filename in the same folder.
- `testCases[].id`: Stable case ID, unique in the repository.
- `testCases[].title`: Clear human-readable title.
- `testCases[].priority`: Case priority; inherit the suite priority only when the user did not specify one.
- `testCases[].type`: Use `positive`, `negative`, `smoke`, `regression`, or `integration` when possible.
- `testCases[].tags`: Short lowercase labels.
- `story`: Optional, but use it when it helps preserve business intent.
- `preconditions`, `steps`, `expectedResult`: Natural-language lists for humans.
- `automation.status`: `manual`, `planned`, or `automated`.
- `automation.testName`: Exact Playwright test title when automated.

Keep the file readable. Do not turn steps into a machine-only DSL unless the user asks for a stricter generator format.
