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
2. Each file is dispatched to the appropriate loader (`JsonLogLoader`, `CsvLogLoader`, or `FreeTextLogLoader`) based on extension (`.json`/`.ndjson` → JSON, `.csv` → CSV, `.log` → freetext)
3. Loader parses entries and calls `timestampDetector` to identify the timestamp field (ISO 8601 and Kibana human-readable format; priority names: `timestamp`, `time`, `@timestamp`, `ts`, `date`, `datetime`, `created_at`, `updated_at`; requires ≥80% hit rate across first 20 entries)
4. Entries are enriched with internal fields: `_timestamp` (Date), `_sourceFile`, `_rawIndex`
5. `useLogTable` derives columns, sorts all entries from all files chronologically, and applies case-insensitive AND filters
6. `LogTable` renders the merged result as an HTML table with per-column filter inputs

### Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Top-level composition: DropZone + FileList + LogTable |
| `src/hooks/useLoadedFiles.ts` | File state, FileReader orchestration |
| `src/hooks/useLogTable.ts` | Memoized column derivation, sort, filter |
| `src/loaders/JsonLogLoader.ts` | Parses JSON arrays and NDJSON; flattens nested objects to dot-notation; runs timestamp detection |
| `src/loaders/CsvLogLoader.ts` | Parses CSV with headers; dot-notation headers create nested objects; `\.` escapes a literal dot |
| `src/loaders/FreeTextLogLoader.ts` | Parses Java/Logback plain-text `.log` files; handles multiline entries (stack traces, toString dumps) |
| `src/utils/timestampDetector.ts` | Heuristic for identifying the timestamp field; supports ISO 8601 and Kibana format (`Mar 27, 2026 @ 12:32:30.038`) |
| `src/utils/columnDeriver.ts` | Scans all entries; emits column list with priority ordering |
| `src/types/log.ts` | Core interfaces: `LogEntry`, `ParseResult`, `LoadedFile`, `ILogLoader` |
| `src/loaders/__tests__/JsonLogLoader.test.ts` | Unit tests for JSON/NDJSON loader |
| `src/loaders/__tests__/CsvLogLoader.test.ts` | Unit tests for CSV loader |
| `src/loaders/__tests__/FreeTextLogLoader.test.ts` | Unit tests for Java freetext loader |
| `src/utils/__tests__/timestampDetector.test.ts` | Unit tests for timestamp field detection |

### Conventions

- **Internal fields** use `_` prefix (`_timestamp`, `_sourceFile`, `_rawIndex`) and are excluded from column derivation.
- **Column priority**: `level`, `severity`, `message`, `msg`, `error`, `service`, `logger` always appear first (defined in `columnDeriver.ts`).
- **Pluggable loaders**: New formats implement `ILogLoader`; file extension drives dispatch in `useLoadedFiles`.
- **Browser-native**: All dependencies must run natively in the browser without a server.
- **Prettier style**: No semicolons, single quotes, 100-char line width, ES5 trailing commas.
- Unused variables must be prefixed with `_` to satisfy ESLint (`no-unused-vars` is an error).

### ESLint / React Compiler rules (enforced, zero-warning tolerance)

The project uses `eslint-plugin-react-hooks@7` which includes React Compiler lint rules. These are strict:

- **`react-hooks/refs`** — Do NOT read or write `ref.current` during render. Only access refs in event handlers and effects. Writing `timerRef.current = x` during render is also forbidden.
- **`react-hooks/set-state-in-effect`** — Do NOT call `setState` inside a `useEffect` body. This rule flags cascading-render patterns. Use render-phase state updates instead (see below).
- **`react-hooks/incompatible-library`** — TanStack Table (`useReactTable`) and TanStack Virtual (`useVirtualizer`) return objects with functions that can't be safely memoized by the React Compiler. Suppress with `// eslint-disable-next-line react-hooks/incompatible-library` on that one line.
- **`prettier/prettier`** — ES5 `trailingComma` means trailing commas are allowed in arrays/objects but **not** in function call arguments. Avoid multi-line `useEffect(fn, [])` with a trailing comma after `[]`.

### Deriving state from prop changes (no useEffect sync)

When local component state must reset in response to a prop/external value change, use React's render-phase state update pattern instead of `useEffect`:

```tsx
const [prevCommitted, setPrevCommitted] = useState(externalValue)
if (prevCommitted !== externalValue) {
  setPrevCommitted(externalValue)
  if (!externalValue) {
    setLocalValue('')   // setState during render is intentional here
  }
}
```

React re-renders immediately without painting. The guard (`prevCommitted !== externalValue`) prevents infinite loops. For timer cancellation on external reset, use a separate `useEffect` that only calls `clearTimeout` (no setState).

### Virtual scrolling

`LogTable` uses `@tanstack/react-virtual` (`useVirtualizer`) with the **padding-rows** approach: two sentinel `<tr>` elements above and below the visible rows carry the missing height, so sticky `<thead>` and `overflow: auto` on `.log-table__scroll` continue to work without changes.

### Filter performance

- `TextFilterValue` carries a `compiledRegex?: RegExp` field. The regex is compiled once when the debounce fires in `TextFilter`, stored on the filter value object, and reused by `textFilterFn` — never compiled per row.
- Text filters debounce 150 ms. Operator/negate changes cancel any in-flight debounce before applying immediately.
- `isReDoSRisk(pattern)` in `filterFunctions.ts` detects nested quantifiers (`(a+)+` etc.) and blocks application of dangerous patterns.

### Memory

Update CLAUDE.md whenever significant architecture change is done or new npm scripts are added

## Testing

Always anonymize data/samples provided in prompt when preparing test data for tests.