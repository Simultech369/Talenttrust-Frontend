# Milestone Creation Form: Schema Validation & Live Regions

## Overview

Issue #1101 resolves accessibility and data integrity gaps in the milestone creation flow by introducing declarative schema validation, inline per-field error tracking, an aria-live summary region, and automated first-invalid focus management.

## Key Components & Architecture

### 1. Declarative Field Schema (`src/lib/milestoneFormSchema.ts`)
Instead of imperative ad-hoc validation rules, fields are defined declaratively in `MILESTONE_FORM_SCHEMA`:
- `name`: Property key matching form state (`title`, `payout`, `currency`, `dueDate`, `status`).
- `fieldId`: DOM ID used for label pairing and error IDs (`milestone-title`, etc.).
- `type`: Input type definition.
- `required`: Boolean flag for assistive technology.
- `validators`: Composable validator pipeline executing in sequence with first-error short-circuiting.

Reuses central domain constants from `validateMilestone.ts`:
- `MAX_MILESTONE_TITLE_LENGTH` (200 characters)
- `MAX_PAYOUT_VALUE` (10,000,000)
- `MAX_PAYOUT_DECIMAL_PLACES` (2)
- `ALLOWED_CURRENCIES` (`['USD', 'EUR', 'GBP', 'XLM']`)
- `ALLOWED_STATUSES` (`['Pending', 'Active', 'Completed', 'Paid', 'Disputed']`)

### 2. Pure Schema Engine (`src/lib/schemaValidator.ts`)
- `validateFormBySchema(schema, values)`: Side-effect free validator returning `ValidationError[]` (`{ fieldId, message }`).
- `getFieldError(errors, fieldId)`: Fast constant-time lookup for field errors.

### 3. Reactive Form Hook (`src/hooks/useSchemaForm.ts`)
- Bridges declarative schema validation with React component state.
- Tracks `values`, `errors`, `touched`, and derived `isValid`.
- `setValue(field, value)`: Updates value and automatically clears the error for that specific field as the user types/fixes it.
- `getFieldProps(fieldName)`: Returns `{ value, error, validate }` ready to spread directly onto `FormField`.
- `firstInvalidFieldId`: Computes the first field ID with an active error for immediate focus handling.

### 4. Accessible Live Region (`src/components/milestones/MilestoneFormLiveRegion.tsx`)
- Renders screen-reader-only `aria-live` announcement region (`role="status"`).
- Uses `aria-live="polite"` during inline typing / fixes to avoid interrupting the user.
- Promotes to `aria-live="assertive"` on submission attempts with active errors to immediately inform screen reader users.
- Includes a visual error count badge (`data-testid="error-count-badge"`).

### 5. Dual Error Affordance
- Integrates both `MilestoneFormLiveRegion` (for screen reader live updates) and `ErrorSummary` (for visual linking to anchor IDs `#milestone-title`, etc.).
- On submit failure, moves focus to the first invalid field (`titleInputRef` or DOM lookup).

## Accessibility (WCAG 2.1 AA) Guarantees
- Every input associates with its inline error via `aria-describedby` and sets `aria-invalid="true"` when invalid.
- Focus trap and Escape handling are preserved via `useDialogFocusTrap`.
- Screen readers receive non-intrusive polite updates while typing and assertive announcements upon submit failure.
