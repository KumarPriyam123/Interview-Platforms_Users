import { formatTestCaseDisplay } from './utils'

export default function TestCasePanel({
  testCases,
  activeIndex,
  onActiveIndexChange,
  onFieldChange,
  onAddTestCase,
  caseResults,
  activeTab,
  onTabChange,
  isStructured = false,
}) {
  const activeTestCase = testCases[activeIndex] || testCases[0]
  const passedCount = testCases.filter((t) => t.passed === true).length

  return (
    <div className="cw-bottom-panel">
      <div className="cw-bottom-tabs">
        <button
          type="button"
          className={`cw-bottom-tab ${activeTab !== 'results' ? 'cw-bottom-tab--active' : ''}`}
          onClick={() => onTabChange('testcase')}
        >
          Testcase
        </button>
        <button
          type="button"
          className={`cw-bottom-tab ${activeTab === 'results' ? 'cw-bottom-tab--active' : ''}`}
          onClick={() => onTabChange('results')}
        >
          Test Result <span className="cw-test-count">({passedCount}/{testCases.length})</span>
        </button>
      </div>

      {activeTab !== 'results' ? (
        <div className="cw-test-results">
          <div className="cw-testcase-tabs">
            {testCases.map((tc, i) => (
              <button
                key={tc.id}
                type="button"
                className={`cw-testcase-tab ${i === activeIndex ? 'cw-testcase-tab--active' : ''} ${tc.passed === true ? 'cw-testcase-tab--pass' : ''} ${tc.passed === false ? 'cw-testcase-tab--fail' : ''}`}
                onClick={() => onActiveIndexChange(i)}
              >
                {tc.name}
              </button>
            ))}
            <button
              type="button"
              className="cw-testcase-tab cw-testcase-add"
              onClick={onAddTestCase}
            >
              +
            </button>
          </div>
          {activeTestCase && (
            <div className="cw-testcase-fields">
              {(() => {
                const fields = isStructured ? formatTestCaseDisplay(activeTestCase.input) : null
                if (fields) {
                  return (
                    <>
                      {fields.map((f) => (
                        <div key={f.key} className="cw-testcase-field">
                          <div className="cw-testcase-field-label">{f.key}</div>
                          <textarea
                            className="cw-testcase-input"
                            value={f.value}
                            onChange={(e) => {
                              try {
                                const p = JSON.parse(activeTestCase.input)
                                p[f.key] = JSON.parse(e.target.value)
                                onFieldChange('input', JSON.stringify(p, null, 2))
                              } catch {
                                onFieldChange('input', e.target.value)
                              }
                            }}
                            rows={1}
                          />
                        </div>
                      ))}
                      <div className="cw-testcase-field">
                        <div className="cw-testcase-field-label">Expected Output</div>
                        <textarea
                          className="cw-testcase-input"
                          value={activeTestCase.expectedOutput}
                          onChange={(e) => onFieldChange('expectedOutput', e.target.value)}
                          rows={1}
                        />
                      </div>
                    </>
                  )
                }
                return (
                  <>
                    <div className="cw-testcase-field">
                      <div className="cw-testcase-field-label">Input</div>
                      <textarea
                        className="cw-testcase-input"
                        placeholder="stdin input"
                        value={activeTestCase.input}
                        onChange={(e) => onFieldChange('input', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="cw-testcase-field">
                      <div className="cw-testcase-field-label">Expected Output</div>
                      <textarea
                        className="cw-testcase-input"
                        placeholder="expected"
                        value={activeTestCase.expectedOutput}
                        onChange={(e) => onFieldChange('expectedOutput', e.target.value)}
                        rows={1}
                      />
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      ) : (
        <div className="cw-test-results">
          {caseResults.length > 0 ? (
            caseResults.map((r, i) => (
              <div key={i} className={`cw-test-case ${r.passed ? 'cw-test-case--pass' : 'cw-test-case--fail'}`}>
                <div className={`cw-test-icon ${r.passed ? 'cw-test-icon--pass' : 'cw-test-icon--fail'}`}>
                  {r.passed ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  )}
                </div>
                <div className="cw-test-info">
                  <div className="cw-test-name">Case {i + 1}: <span className={r.passed ? 'cw-test-status--pass' : 'cw-test-status--fail'}>{r.status}</span></div>
                  {testCases[i]?.expectedOutput && (
                    <div className="cw-test-detail"><span className="cw-test-label">Expected:</span> <code>{testCases[i].expectedOutput}</code></div>
                  )}
                  <div className="cw-test-detail"><span className="cw-test-label">Output:</span> <code>{testCases[i]?.actualOutput || '(no output)'}</code></div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '0.75rem', color: '#5a6f7a', fontSize: '0.82rem' }}>
              Run your code to see results.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
