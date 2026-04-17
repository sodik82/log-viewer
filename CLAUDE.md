# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server at http://localhost:5173/log-viewer/
npm run build      # TypeScript check + production build → dist/
npm run lint       # ESLint with zero-warning tolerance
npm run lint:fix   # Prettier format + ESLint auto-fix
npm run preview    # Preview production build locally
npm test           # Run Vitest unit tests (vitest run)
```

CI runs `lint` and `build` on every push; `deploy` auto-publishes to GitHub Pages on push to `main`.

## Architecture

**Log Viewer** is a browser-only SPA for analyzing log files. No server — all parsing, merging, and filtering happens in the browser via the FileReader API.

### Data Flow

1. User drops/selects files → `DropZone` → `useLoadedFiles` hook reads them as text
2. Each file is dispatched to the appropriate loader (`JsonLogLoader` or `CsvLogLoader`) based on extension
3. Loader parses entries and calls `timestampDetector` to identify the timestamp field (ISO 8601 regex + priority names: `timestamp`, `time`, `@timestamp`, `ts`, `date`, `datetime`, `created_at`, `updated_at`; requires ≥80% hit rate across first 20 entries)
4. Entries are enriched with internal fields: `_timestamp` (Date), `_sourceFile`, `_rawIndex`
5. `useLogTable` derives columns, sorts all entries from all files chronologically, and applies case-insensitive AND filters
6. `LogTable` renders the merged result as an HTML table with per-column filter inputs

### Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Top-level composition: DropZone + FileList + LogTable |
| `src/hooks/useLoadedFiles.ts` | File state, FileReader orchestration |
| `src/hooks/useLogTable.ts` | Memoized column derivation, sort, filter |
| `src/loaders/JsonLogLoader.ts` | Parses JSON arrays and NDJSON; runs timestamp detection |
| `src/loaders/CsvLogLoader.ts` | Stubbed — returns empty array (not yet implemented) |
| `src/utils/timestampDetector.ts` | ISO 8601 heuristic for identifying the timestamp field |
| `src/utils/columnDeriver.ts` | Scans all entries; emits column list with priority ordering |
| `src/types/log.ts` | Core interfaces: `LogEntry`, `ParseResult`, `LoadedFile`, `ILogLoader` |
| `src/loaders/__tests__/JsonLogLoader.test.ts` | Unit tests for JSON/NDJSON loader |
| `src/loaders/__tests__/CsvLogLoader.test.ts` | Unit tests for CSV loader |
| `src/utils/__tests__/timestampDetector.test.ts` | Unit tests for timestamp field detection |

### Conventions

- **Internal fields** use `_` prefix (`_timestamp`, `_sourceFile`, `_rawIndex`) and are excluded from column derivation.
- **Column priority**: `level`, `severity`, `message`, `msg`, `error`, `service`, `logger` always appear first (defined in `columnDeriver.ts`).
- **Pluggable loaders**: New formats implement `ILogLoader`; file extension drives dispatch in `useLoadedFiles`.
- **No runtime dependencies**: Only `react` and `react-dom` — no UI libraries, no utility packages.
- **Prettier style**: No semicolons, single quotes, 100-char line width, ES5 trailing commas.
- Unused variables must be prefixed with `_` to satisfy ESLint (`no-unused-vars` is an error).

### Memory

Update CLAUDE.md whenever significant architecture change is done or new npm scripts are added