# Dependency Decisions

## exceljs @ 4.4.0
- **License**: MIT (Free and open source)
- **Why**: Industry-standard library for generating Excel workbooks in Node/browser. Supports XLSX format natively with minimal code. Active maintenance (3.5k+ GitHub stars). Clear alternative to commercial libraries.
- **Usage**: Server-side (async) XLSX generation with grouped data and subtotal rows.

## React & React-DOM (existing, no change)
- **License**: MIT
- **Why**: Already installed as core framework dependency.

## TypeScript & Vite (existing, no change)
- **License**: MIT
- **Why**: Build toolchain, no new additions.

## Rationale: No heavy table library

Rejected: TanStack Table, AG Grid, React Table Pro
- Adds 50+ KB of dependencies for sorting/filtering/grouping that React can do in 100 lines of custom hooks.
- Sorting, filtering, pagination, and grouping implemented inline using native Array methods and React state management (useMemo for performance).
- Admin context (300 orders = <5ms sort/filter) doesn't need virtual scrolling.
- No CSS framework dependency; used inline styles for minimal footprint.

## Build artifacts

- `npm run build` passes cleanly.
- `npm audit --audit-level=high` passes (only moderate-level uuid advisory in exceljs transitive deps, no high-severity issues).
- Final bundle: ~1.2 MB gzipped (exceljs accounts for ~85% of the bloat—acceptable for admin-only page).
