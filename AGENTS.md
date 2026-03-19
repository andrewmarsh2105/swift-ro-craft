# AGENTS.md

## Project: RO Navigator
RO Navigator is a web app for automotive technicians to track repair orders (ROs), labor lines, hours, pay-period totals, flags, and closeout/reporting artifacts. It also supports scan/import workflows (OCR-assisted RO entry), spreadsheet-style views, and summary dashboards.

### Who this app is for
- Dealership and independent-shop technicians (hourly + flat-rate).
- Users who need reliable, auditable hour/totals tracking for payroll verification and disputes.

## Product priorities (in order)
1. **Calculation accuracy** (hours, totals, period summaries, flags/check counts).
2. **Data reliability** (no silent data loss; preserve user-entered records).
3. **Workflow continuity** (RO entry/editing, scan review/import, pay-period closeout).
4. Visual polish.

Preserve existing behavior unless fixing a confirmed bug.

## Core workflows to protect
- Add/edit/delete/duplicate ROs and line items.
- Mark lines TBD, convert review issues to flags, clear flags.
- Summary/pay-period reporting and closeout behavior.
- Spreadsheet mode filtering/grouping/export paths.
- Scan flow: capture/upload → OCR extraction → review/merge/replace lines.
- Offline queueing + sync recovery.

## Important directories
- `src/pages/`: route-level pages (`Index`, `AddRO`, auth/legal/support/admin, flag inbox).
- `src/components/`: UI by domain (`desktop/`, `mobile/`, `scan/`, `tabs/`, `reports/`, `shared/`, `ui/`).
- `src/hooks/`: data/workflow hooks (`useROStore`, `usePayPeriodReport`, `useScanFlow`, `useOfflineSync`, etc.).
- `src/lib/`: calculation and utility logic (`payPeriodUtils`, `reviewRules`, `scanStateMachine`, exports, status helpers).
- `src/features/ro/`: RO domain/data mapping and Add RO feature modules.
- `src/contexts/`: app-wide providers (auth, RO, flags, offline, subscription).
- `supabase/functions/` + `supabase/migrations/`: backend edge functions and schema migrations.

## Run the app (verified)
- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`

## Lint / tests / build (verified)
- Lint: `npm run lint` (currently reports warnings in this repo; warnings are expected unless your change adds more).
- Tests: `npm run test`
- Build: `npm run build`

## Coding conventions used in this repo
- TypeScript + React function components and hooks.
- Path alias `@/` for `src/*` imports.
- Tailwind utility classes + shadcn-style UI primitives in `src/components/ui`.
- Existing style uses mixed quote styles and semicolon usage; **match the local file style** instead of mass reformatting.
- Keep changes scoped; avoid drive-by refactors in payroll/scan-critical code.
- Do not add broad architectural rewrites unless explicitly requested.

## UI/UX expectations
- Important payroll signals (totals, statuses, warnings, flags, needs-review states) must be visually prominent.
- Keep desktop and mobile behavior conceptually aligned: same business rules/results, platform-appropriate interaction patterns.
- Avoid hiding critical data behind extra taps/clicks when it is needed to verify pay.
- Maintain accessibility basics (labels, keyboard behavior, contrast-aware states).

## Desktop/mobile parity rules
- Any logic change affecting hours/totals/status/flags must be validated in both desktop and mobile experiences.
- Prefer shared domain logic in hooks/lib/features; avoid duplicating business logic separately per viewport.
- If intentional parity differences are introduced, document them clearly in the task summary.

## Payroll/totals safety checklist
When touching totals, summaries, closeouts, or line-hour math:
- Verify line-hour aggregation by labor type.
- Verify date-range/pay-period boundaries.
- Verify flagged/TBD counts remain consistent with displayed totals.
- Verify exports/report snapshots still match on-screen values.
- Call out any assumptions explicitly; do not guess.

## Scan/import safety checklist
When touching scan/OCR/review flows:
- Preserve stale-result protection and multi-page behavior.
- Verify merge/replace/add scanned lines paths.
- Verify duplicate-line and header-conflict handling.
- Verify existing RO data is not overwritten unexpectedly.
- Validate both mobile capture flow and desktop upload/import path if affected.

## Bug-fix expectations
- Reproduce first (or identify concrete failing path).
- Fix root cause with minimal blast radius.
- Add/adjust tests when practical for the changed logic.
- Confirm no regressions in adjacent critical workflows.

## “Done when” criteria
A change is done when:
1. Code is implemented with focused scope.
2. `npm run test` passes.
3. `npm run build` succeeds.
4. `npm run lint` run completed and no new unexpected lint errors were introduced.
5. Manual checks (below) were completed for impacted areas.
6. Any remaining uncertainty is documented explicitly.

## Manual test requirements before finishing
Run the relevant subset for every task; run all for core workflow changes:
1. Create RO with multiple lines and verify totals/hours.
2. Edit RO lines (including TBD/flags path) and verify recalculated totals.
3. Validate Summary tab period totals + flagged/review counts.
4. Validate closeout flow behavior (including warnings/flag interactions).
5. Validate scan/import flow when touched (scan/upload, review, apply).
6. Validate desktop + mobile for changed workflows.
7. Validate export/report output when totals/reporting code changes.

## Do-not rules
- Do not silently change payroll math, period boundary logic, or status rules without explicit justification.
- Do not remove/reduce visibility of critical warnings, flags, or totals.
- Do not break offline queue/sync behavior for RO/flag mutations.
- Do not “clean up” large unrelated files in the same commit.
- Do not guess expected behavior when uncertain—state uncertainty and request/leave guidance.

## Handling uncertainty (important for future Codex tasks)
If behavior is unclear:
- Inspect nearest domain logic (`src/hooks`, `src/lib`, `src/features/ro`) and existing UI usage first.
- Prefer explicit notes like: “I could not verify X from code/tests; assumption: Y.”
- Ship safe, reversible changes over speculative rewrites.
- In summaries, list what was verified vs. what remains uncertain.
