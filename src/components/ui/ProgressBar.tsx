interface ProgressBarProps {
  value: number         // 0-100
  label?: string
  showPercentage?: boolean
  variant?: 'primary' | 'accent' | 'success'
  height?: number
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  variant = 'primary',
  height = 10,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="progress-wrapper">
      {(label || showPercentage) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showPercentage && <span className="progress-value">{pct}%</span>}
        </div>
      )}
      <div className="progress-track" style={{ height }}>
        <div
          className={`progress-fill${variant !== 'primary' ? ` progress-fill-${variant}` : ''}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
