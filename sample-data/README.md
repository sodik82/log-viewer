# Sample Data

All files cover the same fictional scenario — an order processing system with three services (`auth-service`, `order-service`, `payment-service`) handling a purchase flow, a cache miss, a payment gateway failure with a stack trace, and a token refresh. This lets you compare how each format looks when loaded.

---

## Files

### `app-logs.ndjson` — Newline-delimited JSON
One JSON object per line. Nested objects (e.g. `mdc`) are flattened to dot-notation columns (`mdc.traceId`, `mdc.spanId`) by the loader.

**Try:** Filter `level` = `ERROR` to jump straight to the connection failure. Then filter `mdc.traceId` = `3fa85f64573c1d80` to trace the full order flow across services.

---

### `app-logs.json` — JSON array
The same ten entries as `app-logs.ndjson`, wrapped in `[...]`. Load both at once — the viewer merges and sorts them chronologically. Good for testing multi-file merge behaviour.

**Try:** Drop both `app-logs.json` and `app-logs.ndjson` onto the viewer together and confirm entries interleave correctly.

---

### `app.log` — Java / Logback plain text
Free-text `.log` format. The loader handles two common Logback patterns in the same file:
- `YYYY-MM-DD HH:mm:ss.SSS [thread] [traceId] LEVEL logger - message` — request-scoped entries with a trace ID in the MDC bracket
- `YYYY-MM-DD HH:mm:ss.SSS [thread] LEVEL logger - message` — startup and background-worker entries with no MDC bracket

The stack trace after the ERROR entry is folded into that entry's `message` field rather than becoming a separate row.

**Try:** Expand the ERROR row to see the full stack trace. Filter `mdc` = `3fa85f64573c1d80` to trace the full order flow across services (only request-scoped entries carry this field).

---

### `standard.csv` — Plain CSV with dot-notation headers
Standard CSV export from a logging pipeline. The `mdc.traceId` and `mdc.spanId` column names use dot-notation — the loader flattens them to `mdc.traceId` / `mdc.spanId` keys (same result as the JSON loader).

**Try:** Filter `service` = `payment-service` to see the timeout, authorisation, and failure events. Notice the `exception` column on the ERROR row.

---

### `kibana-discover.csv` — Kibana Discover export (human-readable timestamps, escaped-dot headers)
Exported from the Kibana Discover view. Timestamps use Kibana's human-readable format (`Apr 16, 2026 @ 14:05:13.001`). Column names with literal dots (e.g. `kubernetes.pod_name`) are escaped as `kubernetes\.pod_name` — the loader preserves the dot as part of the column name rather than treating it as nesting.

**Try:** Filter `kubernetes.pod_name` = `payment` (substring match) to see only payment-service pods.

---

### `kibana-export.csv` — Kibana CSV export with embedded `_source` JSON
Two-column format: `@timestamp` + `_source`. The `_source` cell contains a JSON object — the loader expands it and promotes its fields to top-level columns. Nested keys inside the JSON (e.g. `kubernetes.pod_name`) are preserved as dot-notation column names.

**Try:** Filter `level` = `WARN` or `ERROR`. Notice `@timestamp` is detected as the timestamp field and drives the histogram.

---

### `kibana-export.txt` — Kibana CSV export saved as `.txt`
Same Kibana quoted-CSV format as `kibana-export.csv`, but with a `.txt` extension — the format that results when a browser saves a Kibana export without renaming. The loader detects CSV content from the quoted header line rather than relying on the extension.

**Try:** Drop `kibana-export.txt` onto the viewer (or pick it via the file browser) and confirm it loads with `@timestamp` driving the histogram. Then drop it together with `app-logs.ndjson` to see both sources merged chronologically.

---

### `kibana-flat-columns.csv` — Kibana Discover export with `_source.` column prefix
A wider Kibana export where every data column is prefixed with `_source.` (e.g. `_source.level`, `_source.mdc.traceId`, `_source.kubernetes.pod_name`). The loader flattens these to direct dot-notation keys. Timestamp is detected from `_source.@timestamp`.

**Try:** After loading, notice that `_source.level`, `_source.service`, `_source.mdc.traceId` etc. each appear as separate filterable columns. Filter `_source.mdc.traceId` = `3fa85f64573c1d80` to see the order flow.

---

## Timestamp formats supported

| Format | Example |
|---|---|
| ISO 8601 | `2026-04-16T14:05:13.224Z` |
| Kibana human-readable | `Apr 16, 2026 @ 14:05:13.224` |
| Java local datetime | `2026-04-16 14:05:13.224` |
