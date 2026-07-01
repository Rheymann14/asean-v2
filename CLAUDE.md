# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

ASEAN event/registration management system: programmes, venues/sections, participants,
table & vehicle assignments, ID card issuance, QR scanning, feedback, and dynamic
registration forms.

**Stack**
- Backend: Laravel 12 (PHP 8.2+), Inertia.js 2, Fortify (auth), Pest (tests), MySQL
- Frontend: React 19 + TypeScript, Inertia React adapter, Tailwind CSS 4, Radix UI /
  shadcn-style components (`resources/js/components/ui`), Vite 7
- Structure: `app/Http/Controllers` (one per resource, e.g. `ProgrammeController`,
  `ParticipantController`) → Inertia::render → `resources/js/pages/*.tsx` (kebab-case,
  flat, e.g. `event-management-participants.tsx`)

## How to Work in This Codebase

**Default mode: targeted fixes, not rewrites.** Update only what the task requires and
leave everything else working exactly as it does today. Before changing a file, understand
why it's structured the way it is — these are event-ops features (assignments, issuance,
attendance) with real data dependencies, so a "cleaner" rewrite that silently changes
behavior is worse than a small correct patch. No drive-by refactors, no renaming things
"while you're in there," no removing code you haven't confirmed is unused.

Act with the judgment of a senior engineer who also owns UI/UX and frontend quality:
- Backend: correct, normalized data model; explicit relationships and constraints; thin
  controllers, fat models/services where logic belongs (`app/Services`, `app/Actions`).
- Frontend: accessible, consistent with existing Radix/shadcn patterns already in
  `components/ui`; reuse existing components/hooks before adding new ones; keep
  interactions predictable (loading/error/empty states handled, not just the happy path).
- Don't introduce a new pattern, library, or abstraction when an existing one in this repo
  already solves the problem.

## Commands

```bash
composer dev          # serve + queue listener + vite, concurrently (primary dev loop)
npm run dev            # vite only
npm run build          # production build
npm run build:ssr      # SSR build
npm run lint           # eslint --fix
npm run format         # prettier --write resources/
npm run format:check
npm run types          # tsc --noEmit
composer test          # config:clear + php artisan test (Pest)
php artisan migrate
```

Run `npm run types`, `npm run lint`, and relevant Pest tests after non-trivial changes —
don't declare a change done without checking it compiles/lints/tests clean.

## Code Style

- Formatting is enforced by Prettier (`.prettierrc`) and ESLint (`eslint.config.js`) —
  run `npm run format` / `npm run lint` rather than hand-formatting.
- Indent: 4 spaces, LF line endings, final newline (`.editorconfig`). PHP follows Laravel
  Pint defaults.
- Imports auto-organized via `prettier-plugin-organize-imports`; Tailwind classes
  auto-sorted via `prettier-plugin-tailwindcss` — don't manually reorder either.
- Single quotes, semicolons, in TS/TSX.
- PHP: typed properties/params/returns, `Eloquent` relationship methods with explicit
  return types (`BelongsTo`, `HasMany`, `BelongsToMany`), as already used in
  `app/Models/*`.
- React: function components, hooks in `resources/js/hooks`, shared layout in
  `resources/js/layouts/{app,auth,settings}`, Inertia `usePage`/`router` over manual fetch.

## Database

- MySQL via Laravel migrations in `database/migrations`. Keep schema changes normalized:
  - Avoid repeating-group / multi-valued columns; use a join or child table instead
    (e.g. `participant_programmes`, `participant_table_assignments` pattern already used).
  - One fact per column, no derived/duplicate data unless it's an explicit, justified
    denormalization (e.g. a cached count) — and note why in the migration if so.
  - Foreign keys with proper constraints/cascades, not just a bare `unsignedBigInteger`.
  - Add indexes for columns used in lookups/joins/sorts (see
    `add_admin_participant_performance_indexes` migration for the existing pattern).
- New migrations are additive (`add_x_to_y_table`) — don't edit old migrations that have
  already shipped; write a new one.
- Prefer query scoping/eager-loading (`with()`) over N+1 patterns in controllers.

## Git

- Current branch: `revision-branch`; PRs target `main`.
- Don't amend or force-push without being asked. Create new commits for fixes.
