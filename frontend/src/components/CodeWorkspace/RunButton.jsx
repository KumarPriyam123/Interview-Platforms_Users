export default function RunButton({ onClick, isRunning = false, disabled = false }) {
  return (
    <button
      type="button"
      className="cw-run-btn"
      onClick={onClick}
      disabled={disabled || isRunning}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      {isRunning ? 'Running...' : 'Run Code'}
    </button>
  )
}
