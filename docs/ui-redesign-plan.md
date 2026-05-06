# UI/UX Audit and Redesign Plan

## Phase 1 - Audit Findings

### Visual System
- Current palette is bright/cyan-heavy with decorative radial gradients that add noise.
- Typography hierarchy is inconsistent between public and dashboard pages.
- Components (button/input/select/card/table/alert/badge) are functional but visually generic and not cohesive.

### Layout & Hierarchy
- Dashboard shell has weak structure (header, nav, content rhythm not clearly separated).
- Page headers/actions/filters are inconsistent across admin, doctor, and patient pages.
- Panels are often stacked as independent cards without strong information architecture.

### Workflow Screens
- Booking is functionally complete but reads as one long form; lacks strong multi-step guidance.
- Admin table/actions are dense but visually ungrouped and harder to scan quickly.
- Doctor/patient workspaces need clearer priority and calmer composition.
- CRM detail page lacks workspace-like grouping between profile, tags, notes, and timeline.

### States
- Skeletons/errors/empty states exist but are basic and inconsistent in tone.

## Redesign Strategy

### Phase 2 - Design System Upgrade
- Move to neutral soft-light palette with one restrained accent.
- Introduce cleaner typography scale, tighter spacing rhythm, softer borders, subtle shadows.
- Refine shared components: button, input, select, textarea, card, badge, alert, table, skeleton.

### Phase 3 - Core Layout Refactor
- Redesign dashboard shell into intentional product workspace (compact topbar + stable sidebar + focused content column).
- Standardize page container widths and header/action pattern.

### Phase 4 - High-Value Screens
- Recompose booking page into clear step-based flow sections.
- Rebuild admin dashboard hierarchy (overview -> controls -> table -> secondary operations).
- Improve doctor workspace (today focus + schedule + note tools).
- Improve patient portal composition (upcoming/history/preferences).
- Redesign CRM detail as cohesive profile workspace.
- Refine homepage to product-company tone (less promo aesthetic).

### Phase 5 - Final Polish
- Harmonize responsive behavior and spacing.
- Improve hover/focus/disabled/success/error states.
- Reduce visual clutter and ensure cross-page consistency.
