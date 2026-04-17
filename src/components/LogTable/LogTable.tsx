import type { LogEntry } from '../../types/log';
import './LogTable.css';

interface Props {
  columns: string[];
  rows: LogEntry[];
  filters: Record<string, string>;
  onFilterChange: (col: string, value: string) => void;
  hasNoTimestamp: boolean;
}

function renderCell(col: string, entry: LogEntry): string {
  if (col === '_timestamp') {
    return entry._timestamp ? entry._timestamp.toISOString() : '';
  }
  const val = entry[col];
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    const s = JSON.stringify(val);
    return s.length > 200 ? s.slice(0, 200) + '…' : s;
  }
  return String(val);
}

export function LogTable({ columns, rows, filters, onFilterChange, hasNoTimestamp }: Props) {
  return (
    <div className="log-table-wrap">
      {hasNoTimestamp && (
        <div className="log-table__notice">
          No timestamp field detected — showing file order.
        </div>
      )}
      <div className="log-table__scroll">
        <table className="log-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} className="log-table__th">
                  {col === '_timestamp' ? 'timestamp' : col}
                </th>
              ))}
            </tr>
            <tr className="log-table__filter-row">
              {columns.map((col) => (
                <th key={col} className="log-table__filter-cell">
                  <input
                    className="log-table__filter-input"
                    type="text"
                    placeholder="filter…"
                    value={filters[col] ?? ''}
                    onChange={(e) => onFilterChange(col, e.target.value)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row._sourceFile}-${row._rawIndex}-${i}`} className="log-table__row">
                {columns.map((col) => (
                  <td key={col} className="log-table__td">
                    {renderCell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="log-table__empty">No rows match the current filters.</div>
        )}
      </div>
      <div className="log-table__footer">
        {rows.length.toLocaleString()} rows
      </div>
    </div>
  );
}
