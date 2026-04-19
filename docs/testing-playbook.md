# Automated Testing Playbook

This project follows a requirement-driven testing workflow.

## Core Rule

- Every new product or code requirement should ship with automated test coverage for the requested behavior.
- Tests should be added into the existing test system, not as temporary one-off scripts.
- If a requirement cannot be fully covered automatically, add the highest-value automated coverage possible and document the remaining manual risk.

## Current Tooling

- Test runner: `vitest`
- Shared setup: [tests/setup.ts](/Users/yuanqiwen/Desktop/shipany-template-two-dev/tests/setup.ts)
- Config: [vitest.config.ts](/Users/yuanqiwen/Desktop/shipany-template-two-dev/vitest.config.ts)
- CI workflow: [.github/workflows/test.yaml](/Users/yuanqiwen/Desktop/shipany-template-two-dev/.github/workflows/test.yaml)

## Test Layers

- `tests/unit/**`
  Use for pure logic, provider adapters, parsing, mapping, validation, and policy rules.
- `tests/integration/**`
  Use for API routes, service orchestration, and multi-module behavior with mocked network, auth, email, or storage boundaries.
- `tests/ui/**`
  Use for interactive React component behavior. Add a per-file jsdom environment when needed.

## Delivery Workflow For Every New Requirement

1. Turn the requirement into concrete acceptance criteria.
2. Decide which layer should own the proof:
   - unit for isolated rules,
   - integration for request-to-response behavior,
   - ui for user interactions.
3. Add or update the automated test first when practical.
4. Implement the feature.
5. Run the smallest relevant test command locally.
6. Let CI run the full `pnpm test` workflow.

## Naming And Placement

- Keep tests close to their responsibility, using names like `feature-name.test.ts`.
- Prefer one primary module or route per test file.
- Prefer reusable helpers in `tests/utils/**` over copy-pasted mock code.

## Commands

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## Examples For Upcoming Interview Scheduler Work

- Unit tests:
  availability normalization, timezone conversion, slot ranking, conflict detection.
- Integration tests:
  scheduling draft routes, invite generation routes, email dispatch orchestration.
- UI tests:
  intake form validation, scheduling summary cards, confirmation and reschedule flows.
