interface TriggerProps {
  label: string
  active: boolean
  onToggle: () => void
  onClear: (e: React.MouseEvent) => void
}

export function FilterTrigger({ label, active, onToggle, onClear }: TriggerProps) {
  return (
    <div className="log-filter__facet-trigger-wrap">
      <button
        className={`log-filter__facet-trigger${active ? ' log-filter__facet-trigger--active' : ''}`}
        onClick={onToggle}
        type="button"
      >
        {label}
      </button>
      {active && (
        <button className="log-filter__clear-btn" onClick={onClear} type="button">
          ×
        </button>
      )}
    </div>
  )
}

export function TextOpOptions() {
  return (
    <>
      <option value="contains">contains (~)</option>
      <option value="equals">exact (=)</option>
      <option value="regex">regex (.*)</option>
    </>
  )
}
