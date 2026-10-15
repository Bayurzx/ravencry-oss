export function LoadingSpinner({
  label,
  className = 'h-8 w-8',
}: {
  label?: string
  className?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-2">
      <div
        className={`rounded-full border-2 border-border border-t-primary ${className}`}
        style={{ animation: 'ravencry-spin 0.8s linear infinite' }}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  )
}

export default LoadingSpinner
