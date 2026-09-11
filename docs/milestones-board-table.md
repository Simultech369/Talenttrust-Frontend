# Milestones Board Data Table with URL-Synced State

Issue #1098 provides a data table view for the milestones board featuring multi-column sorting, text search, status filtering, pagination, and bidirectional URL query synchronization.

## Architecture & Data Flow

The feature is built on a clean separation of pure data models, state synchronization hooks, and accessible presentation components:

1. **Pure Data Model (`src/lib/milestonesTableModel.ts`)**:
   - `applyMilestonesTableView(milestones, options)`: Pure, deterministic pipeline that applies search matching, status filtering, stable multi-key sorting, and pagination clamping.
   - Stable tie-breaking: Whenever comparing records with equal primary sort values (e.g. identical payout or due date), tie-breaking falls back to deterministic identifier ordering (`a.id.localeCompare(b.id)`).
   - URL State Parsers: `parseMilestonesTableUrlState`, `buildMilestonesTableQueryString`, and `isMilestonesTableUrlInSync`.

2. **State Synchronization Hook (`src/hooks/useMilestonesTableViewState.ts`)**:
   - Manages interactive filter, sort, and pagination state with Next.js router integration (`useSearchParams`, `useRouter`).
   - Debounces free-text search queries (200ms) to prevent URL spam and unnecessary re-renders while typing.
   - Synchronizes URL parameters (`q`, `status`, `sort`, `dir`, `page`) as the single source of truth while keeping keyboard typing responsive.

3. **Accessible Data Table (`src/components/milestones/MilestonesBoardTable.tsx`)**:
   - Standard HTML table markup with `role="table"`, `<caption className="sr-only">`, and accessible `<th>` sort controls.
   - Column sorting reflects WCAG-compliant `aria-sort="ascending"`, `aria-sort="descending"`, or `aria-sort="none"`.
   - Distinct empty states: Clear differentiation between "No milestones tracked" (zero total records) and "No milestones match this filter" (filters yielded zero matches, offering a "Reset filters" action).

4. **Page Integration (`src/app/milestones/page.tsx`)**:
   - Introduces a view switcher (`[ Cards | Table ]`) on the milestones page header.
   - URL-aware: View mode is controlled via `?view=table` query param.
   - Default cards view ensures full backward compatibility with existing tests and workflows, while table view activates the full data table experience.

## Edge Case Coverage

| Edge Case | Description | Tested Surface |
|---|---|---|
| Column sort updates rows & URL | Clicking column header cycles `asc` -> `desc` -> `none`, reorders rows, and calls `router.replace` | Unit & Integration |
| Filter narrows rows & URL updates | Debounced search narrows rows and reflects `q` in URL | Unit & Integration |
| Reload with query params | Initial render parses query parameters and restores exact filter, sort, and pagination state | Unit & Integration |
| Filtered to empty state | Distinct empty state displayed with reset button when filters match zero items | Component & Integration |
| Stable tie-breaking | Deterministic secondary sorting on `id` ensures identical keys produce identical row ordering | Pure Model & Integration |

## Accessibility & Keyboard Navigation

- All column sort headers are accessible interactive buttons with visible focus rings and accessible labels.
- Pagination controls provide clear disabled states, `aria-label` descriptors, and keyboard navigation support.
- Filter toolbar includes accessible labels and search inputs.
