# Log Viewer

A simple, browser-only SPA for analyzing log files. No server required — all parsing happens locally.

**Live:** https://sodik82.github.io/log-viewer/ 

## Features

- Load multiple log files via drag-and-drop or file picker
- Supported formats: **JSON array**, **NDJSON** (one JSON object per line), `.log` files, **CSV** (with headers)
- Automatically detects the timestamp field and merges all files into a single chronological view
- Per-column text filtering (AND logic, case-insensitive)

## Usage

1. Open the app in your browser
2. Drag one or more log files onto the drop zone, or click **browse** to pick files
3. Entries from all files are merged and sorted by detected timestamp
4. Type into the filter boxes below each column header to narrow results
5. Click **×** on a file chip to remove it, or **Clear all** to start over

## Supported log formats

### NDJSON (newline-delimited JSON)
Each line is a separate JSON object. Nested objects are flattened to dot-notation (e.g. `mdc.traceId`):
```
{"timestamp":"2024-01-15T10:00:00Z","level":"INFO","message":"Server started"}
{"timestamp":"2024-01-15T10:00:01Z","level":"WARN","message":"High memory","mdc":{"traceId":"abc"}}
```

### JSON array
A single JSON array of objects. Nested objects are flattened to dot-notation:
```json
[
  {"timestamp": "2024-01-15T10:00:00Z", "level": "INFO", "message": "Server started"},
  {"timestamp": "2024-01-15T10:00:01Z", "level": "WARN", "message": "High memory"}
]
```

### CSV
A header row followed by data rows. Dot-notation headers (e.g. `mdc.traceId`) create nested objects; escape a literal dot with a backslash (`kubernetes\.pod_name` → field key `kubernetes.pod_name`).
```
timestamp,level,message,mdc.traceId
2024-01-15T10:00:00Z,INFO,Server started,abc123
```

### Timestamp detection
The app scans field values and picks the first field where ≥80% of sampled entries contain a recognized timestamp. Supported formats: **ISO 8601** and **Kibana human-readable** (`Mar 27, 2026 @ 12:32:30.038`). Common field names (`timestamp`, `time`, `@timestamp`, `ts`, `date`, `datetime`, `created_at`) are preferred. If no timestamp is detected, entries are shown in file order.

## Development

```bash
npm install
npm run dev        # dev server at http://localhost:5173/log-viewer/
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

## Deploying to GitHub Pages

1. Push this repo to GitHub
2. In **Settings → Pages**, set Source to **GitHub Actions**
3. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically
4. Your app will be available at `https://<your-username>.github.io/log-viewer/`
