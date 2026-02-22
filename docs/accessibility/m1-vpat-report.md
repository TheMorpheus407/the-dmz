# M1 Accessibility VPAT Report

**Milestone:** M1: Foundation  
**Report Date:** 2026-02-22  
**WCAG Version:** WCAG 2.1  
**Conformance Level:** AA

---

## 1. Executive Summary

This report documents the accessibility conformance status of the M1 (Foundation) release of "The DMZ: Archive Gate". The automated accessibility smoke suite covers all four route groups: `(public)`, `(auth)`, `(game)`, and `(admin)`.

### Conformance Statement

| Criterion                    | Status                              |
| ---------------------------- | ----------------------------------- |
| WCAG 2.1 Level A             | Passed                              |
| WCAG 2.1 Level AA            | Passed (with automated smoke tests) |
| Manual Screen Reader Testing | Pending                             |

---

## 2. Scope of Testing

### 2.1 Tested Routes

| Route Group | Path        | Theme       | Status    |
| ----------- | ----------- | ----------- | --------- |
| (public)    | `/`         | enterprise  | ✅ Tested |
| (auth)      | `/login`    | enterprise  | ✅ Tested |
| (auth)      | `/register` | enterprise  | ✅ Tested |
| (game)      | `/game`     | green/amber | ✅ Tested |
| (admin)     | `/admin`    | enterprise  | ✅ Tested |

### 2.2 Tested Themes

- **green** - Phosphor green terminal aesthetic (default for game)
- **amber** - Alternative terminal aesthetic
- **high-contrast** - Disables CRT effects, maximum contrast
- **enterprise** - Clean SaaS dashboard (default for admin, auth, public)

---

## 3. Automated Test Coverage

### 3.1 Test File Location

`e2e/smoke/accessibility-m1.spec.ts`

### 3.2 Test Categories

| Category                      | Tests | Description                                  |
| ----------------------------- | ----- | -------------------------------------------- |
| Route Group Accessibility     | 8     | WCAG 2.1 AA smoke tests for all route groups |
| Keyboard Navigation           | 4     | Tab order, focus indicators, visible focus   |
| Focus Management              | 2     | Focus order verification                     |
| Form Accessibility            | 2     | Label associations                           |
| ARIA Live Regions             | 2     | Error announcements, session expiry          |
| Theme Accessibility Contracts | 10    | Contrast, focus indicators per theme         |
| Reduced Motion                | 2     | prefers-reduced-motion handling              |
| CRT Effects                   | 1     | High-contrast disables effects               |

### 3.3 Running the Tests

```bash
# Run all accessibility tests
pnpm test:a11y

# Run with UI
pnpm test:a11y --ui

# Run headed (visible browser)
pnpm test:a11y --headed
```

---

## 4. Manual Screen-Reader Audit Checklist

### 4.1 NVDA + Firefox (Windows)

| Step | Flow                            | Checkpoint                                  | Status |
| ---- | ------------------------------- | ------------------------------------------- | ------ |
| 1    | Navigate to `/`                 | Home page loads, heading announced          | ⬜     |
| 2    | Tab through page                | Focus visible on all interactive elements   | ⬜     |
| 3    | Navigate to `/login`            | Login form loads, all fields announced      | ⬜     |
| 4    | Enter invalid credentials       | Error message announced via aria-live       | ⬜     |
| 5    | Login with valid user           | Redirect to `/game`, heading announced      | ⬜     |
| 6    | Navigate to `/admin` (as admin) | Admin dashboard loads, navigation announced | ⬜     |

### 4.2 VoiceOver + Safari (macOS)

| Step | Flow                            | Checkpoint                         | Status |
| ---- | ------------------------------- | ---------------------------------- | ------ |
| 1    | Navigate to `/`                 | Home page loads, heading announced | ⬜     |
| 2    | Use Rotor (VO+U)                | All headings listed                | ⬜     |
| 3    | Navigate to `/login`            | Login form announced with fields   | ⬜     |
| 4    | Enter invalid credentials       | Error announced via live region    | ⬜     |
| 5    | Login with valid user           | Redirect announced                 | ⬜     |
| 6    | Navigate to `/admin` (as admin) | Admin page announced               | ⬜     |

---

## 5. Known Issues

### 5.1 Open Defects

None identified by automated smoke tests at this time.

### 5.2 Known Limitations

- Automated tests do not cover all WCAG 2.1 AA success criteria (smoke-level only)
- Manual screen-reader testing pending execution
- Visual contrast ratios verified programmatically; manual verification recommended

---

## 6. Future Milestones

| Milestone | Accessibility Focus                                 |
| --------- | --------------------------------------------------- |
| M2        | Game flow keyboard navigation, modal focus trapping |
| M3        | Enhanced ARIA for dynamic game states               |
| M4        | Full manual audit completion                        |

---

## 7. References

- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- axe-core: https://www.deque.com/axe/
- Playwright Accessibility: https://playwright.dev/docs/accessibility-testing

---

## 8. Appendix: Test Command Reference

```bash
# Run accessibility smoke suite
pnpm test:a11y

# Run specific route group tests
pnpm test:a11y --grep "(public)"

# Run theme tests only
pnpm test:a11y --grep "theme"

# Run with detailed output
pnpm test:a11y --reporter=list
```
