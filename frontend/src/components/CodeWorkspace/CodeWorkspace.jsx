import { useState, useCallback, useRef, useEffect } from 'react'
import MonacoEditor from './MonacoEditor'
import LanguageSelector from './LanguageSelector'
import TestCasePanel from './TestCasePanel'
import ExecutionOutput from './ExecutionOutput'
import RunButton from './RunButton'
import { createExecutionJob, pollExecutionJob } from '../../services/codeExecution'
import { createDefaultTestCases } from './utils'
import './CodeWorkspace.css'

/**
 * CodeWorkspace — reusable code editor + execution component.
 *
 * Supports three modes:
 *  - "ai"        : Monaco editor + test case panel (structured / stdin)
 *  - "p2p"       : Monaco editor + raw stdin/stdout execution output
 *  - "industry"  : Monaco editor + raw stdin/stdout execution output
 *
 * Props:
 *  mode             – "ai" | "p2p" | "industry"
 *  language         – current language id
 *  onLanguageChange – (langId) => void
 *  code             – current source code
 *  onCodeChange     – (code) => void
 *  readOnly         – editor read-only
 *  languageDisabled – disable language dropdown (e.g. leetcode mode)
 *
 *  — AI mode test-case props (optional) —
 *  testCases / onTestCasesChange / isStructuredCoding
 *
 *  — P2P / Industry raw execution props (optional) —
 *  stdinValue / onStdinChange
 *  executionState / executionResult / executionError / executionJobId
 *  onRunCode        – override run handler (P2P manages its own execution flow)
 *
 *  — Extra slots —
 *  headerExtra      – ReactNode inserted after LanguageSelector in header
 */
export default function CodeWorkspace({
  mode = 'ai',
  language = 'javascript',
  onLanguageChange,
  code = '',
  onCodeChange,
  readOnly = false,
  languageDisabled = false,
  // AI test-case props
  testCases: externalTestCases,
  onTestCasesChange,
  isStructuredCoding = false,
  // P2P / Industry raw execution props
  stdinValue,
  onStdinChange,
  executionState: extExecutionState,
  executionResult: extExecutionResult,
  executionError: extExecutionError,
  executionJobId: extExecutionJobId,
  onRunCode: externalRunCode,
  // Extra
  headerExtra,
}) {
  const isTestCaseMode = mode === 'ai'

  // Internal test case state if not externally controlled
  const [internalTestCases, setInternalTestCases] = useState(createDefaultTestCases)
  const testCases = externalTestCases ?? internalTestCases
  const setTestCases = onTestCasesChange ?? setInternalTestCases

  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0)
  const [activeCodeTab, setActiveCodeTab] = useState('testcase')
  const [caseResults, setCaseResults] = useState([])
  const [codeOutput, setCodeOutput] = useState('')
  const [runningCode, setRunningCode] = useState(false)
  const executionRequestIdRef = useRef(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => { executionRequestIdRef.current += 1 }
  }, [])

  const updateTestCaseField = useCallback((field, value) => {
    setTestCases((prev) => prev.map((tc, i) => i === activeTestCaseIndex ? { ...tc, [field]: value } : tc))
  }, [activeTestCaseIndex, setTestCases])

  const addTestCase = useCallback(() => {
    setTestCases((prev) => {
      const next = [...prev, { id: Date.now(), name: `Case ${prev.length + 1}`, input: '', expectedOutput: '', actualOutput: '', status: 'idle', passed: null }]
      setActiveTestCaseIndex(next.length - 1)
      return next
    })
  }, [setTestCases])

  // AI mode: run each test case individually through Docker pipeline
  const handleRunCodeAI = useCallback(async () => {
    if (!code.trim() || runningCode) return
    setRunningCode(true)
    setCodeOutput('Running...')
    setActiveCodeTab('results')
    const requestId = ++executionRequestIdRef.current
    try {
      const lang = language
      const results = []
      for (const tc of testCases) {
        if (executionRequestIdRef.current !== requestId) return
        const stdin = tc.structured ? tc.input : (tc.input || '')
        const job = await createExecutionJob({ language: lang, sourceCode: code, stdin })
        const result = await pollExecutionJob(job.jobId, { timeoutMs: 15000 })
        const actualOutput = (result.stdout || '').trim()
        const passed = actualOutput === (tc.expectedOutput || '').trim()
        results.push({
          status: result.state === 'completed' ? (result.stderr ? 'Runtime Error' : passed ? 'Accepted' : 'Wrong Answer') : 'Error',
          actualOutput: result.stderr ? result.stderr.trim() : actualOutput,
          passed: !result.stderr && passed,
        })
      }
      if (executionRequestIdRef.current !== requestId) return
      setTestCases((prev) => prev.map((tc, i) => {
        const r = results[i]
        return r ? { ...tc, actualOutput: r.actualOutput || '', status: r.status || 'Unknown', passed: Boolean(r.passed) } : tc
      }))
      setCaseResults(results)
      const passed = results.filter((r) => r.passed).length
      setCodeOutput(`${passed}/${results.length} test cases passed`)
    } catch (err) {
      if (executionRequestIdRef.current !== requestId) return
      setCodeOutput(err.message || 'Unable to run code.')
    } finally {
      if (executionRequestIdRef.current === requestId) setRunningCode(false)
    }
  }, [code, language, isStructuredCoding, testCases, runningCode, setTestCases])

  const handleRunCode = externalRunCode || handleRunCodeAI
  const isRunning = externalRunCode ? ['queueing', 'queued', 'waiting', 'active'].includes(extExecutionState) : runningCode

  return (
    <div className="cw-workspace">
      {/* Header bar */}
      <div className="cw-header">
        <div className="cw-header-left">
          <LanguageSelector
            language={language}
            onChange={onLanguageChange}
            disabled={languageDisabled}
          />
        </div>
        <div className="cw-header-right">
          {headerExtra}
          <RunButton onClick={handleRunCode} isRunning={isRunning} />
        </div>
      </div>

      {/* Editor + bottom panel */}
      <div className="cw-body">
        <div className="cw-editor-area">
          <MonacoEditor
            language={language}
            value={code}
            onChange={onCodeChange}
            readOnly={readOnly}
          />
        </div>

        {/* AI mode: test case panel */}
        {isTestCaseMode && (
          <TestCasePanel
            testCases={testCases}
            activeIndex={activeTestCaseIndex}
            onActiveIndexChange={setActiveTestCaseIndex}
            onFieldChange={updateTestCaseField}
            onAddTestCase={addTestCase}
            caseResults={caseResults}
            activeTab={activeCodeTab}
            onTabChange={setActiveCodeTab}
            isStructured={isStructuredCoding}
          />
        )}

        {/* P2P / Industry mode: raw execution output */}
        {!isTestCaseMode && (
          <ExecutionOutput
            executionState={extExecutionState}
            executionResult={extExecutionResult}
            executionError={extExecutionError}
            executionJobId={extExecutionJobId}
            language={language}
            stdinValue={stdinValue}
            onStdinChange={onStdinChange}
          />
        )}
      </div>
    </div>
  )
}
