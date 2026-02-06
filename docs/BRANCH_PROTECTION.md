# Branch Protection Rules (Manual)

Apply these rules in GitHub for the `master` branch.

- Require status checks to pass before merge (CI workflow: lint-and-typecheck, unit-tests, build, integration-tests).
- Require at least 1 approving review.
- Require linear history.
- Disallow force pushes.
