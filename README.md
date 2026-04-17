# Log Viewer

A simple, browser-only SPA for analyzing log files. No server required — all parsing happens locally.

**Live:** https://sodik82.github.io/log-viewer/ 

## Features

- Load multiple log files via drag-and-drop or file picker
- Supported formats: **JSON array**, **NDJSON** (one JSON object per line), `.log` files
- Automatically detects the timestamp field (ISO 8601 heuristic) and merges all files into a single chronological view
- Per-column text filtering (AND logic, case-insensitive)
- CSV support coming soon

## Usage

1. Open the app in your browser
2. Drag one or more log files onto the drop zone, or click **browse** to pick files
3. Entries from all files are merged and sorted by detected timestamp
4. Type into the filter boxes below each column header to narrow results
5. Click **×** on a file chip to remove it, or **Clear all** to start over

## Supported log formats

### NDJSON (newline-delimited JSON)
Each line is a separate JSON object:
```
{"timestamp":"2024-01-15T10:00:00Z","level":"INFO","message":"Server started"}
{"timestamp":"2024-01-15T10:00:01Z","level":"WARN","message":"High memory usage"}
```

### JSON array
A single JSON array of objects:
```json
[
  {"timestamp": "2024-01-15T10:00:00Z", "level": "INFO", "message": "Server started"},
  {"timestamp": "2024-01-15T10:00:01Z", "level": "WARN", "message": "High memory usage"}
]
```

### Timestamp detection
The app scans field values and picks the first field where ≥80% of sampled entries contain a valid ISO 8601 timestamp. Common field names (`timestamp`, `time`, `@timestamp`, `ts`, `date`, `datetime`, `created_at`) are preferred. If no timestamp is detected, entries are shown in file order.

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
