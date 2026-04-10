import { getExecutionStateLabel, getExecutionOutcomeLabel, getLanguageLabel } from './utils'

export default function ExecutionOutput({
  executionState = 'idle',
  executionResult = null,
  executionError = '',
  executionJobId = '',
  language = 'javascript',
  stdinValue = '',
  onStdinChange,
}) {
  const stateLabel = getExecutionStateLabel(executionState)
  const outcomeLabel = executionResult ? getExecutionOutcomeLabel(executionResult) : null
  const selectedLanguageLabel = getLanguageLabel(language)
  const isOutputEmpty =
    executionResult &&
    executionResult.outcome === 'success' &&
    !executionResult.stdout &&
    !executionResult.stderr

  return (
    <div className="cw-execution-output">
      <div className="cw-run-header">
        <div>
          <strong>Sandbox Output</strong>
          <p className="cw-run-subtitle">
            Submit the current {selectedLanguageLabel} solution to the backend execution worker.
          </p>
        </div>
        <span className={`cw-run-pill ${executionState === 'failed' ? 'is-error' : ''}`}>
          {stateLabel}
        </span>
      </div>

      {onStdinChange && (
        <label className="cw-stdin-field">
          <span>stdin</span>
          <textarea
            className="cw-stdin-textarea"
            value={stdinValue}
            onChange={(e) => onStdinChange(e.target.value)}
            placeholder="Optional standard input passed to the program"
          />
        </label>
      )}

      {executionJobId && (
        <div className="cw-run-meta">Job ID: {executionJobId}</div>
      )}

      {executionError && (
        <div className="cw-run-error">{executionError}</div>
      )}

      {executionResult ? (
        <div className="cw-run-results">
          <div className="cw-run-summary">
            <span className="cw-pill">{outcomeLabel}</span>
            <span className="cw-pill">{selectedLanguageLabel}</span>
            <span className="cw-pill">{executionResult.durationMs ?? 0} ms</span>
            {executionResult.exitCode !== null && executionResult.exitCode !== undefined && (
              <span className="cw-pill">Exit {executionResult.exitCode}</span>
            )}
          </div>

          {isOutputEmpty && (
            <div className="cw-run-note">
              The program finished successfully, but it did not print anything. This runner only shows
              stdout/stderr, so function-only solutions need a small wrapper to produce visible output.
            </div>
          )}

          <div className="cw-terminal">
            <strong>stdout</strong>
            <pre>{executionResult.stdout || '(empty)'}</pre>
          </div>

          <div className="cw-terminal">
            <strong>stderr</strong>
            <pre>{executionResult.stderr || '(empty)'}</pre>
          </div>
        </div>
      ) : (
        <p className="cw-run-placeholder">
          No sandbox output yet. Run the editor contents to surface compilation errors, runtime errors, or program output.
        </p>
      )}
    </div>
  )
}
