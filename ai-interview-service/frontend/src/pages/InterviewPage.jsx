import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAllQuestions,
  getCurrentQuestion,
  submitAnswer,
  submitCounterAnswer,
  moveToNext,
  askDoubt,
  endInterview,
  runCode,
  cleanQuestionText,
} from '../services/api'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../styles/InterviewPage.css'

function InterviewPage() {
  const { id: sessionId } = useParams()
  const navigate = useNavigate()

  const [sections, setSections] = useState([])
  const [currentQ, setCurrentQ] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [counterQuestion, setCounterQuestion] = useState(null)
  const [counterAnswer, setCounterAnswer] = useState('')
  const [counterMessages, setCounterMessages] = useState([])
  const [activeCounterIndex, setActiveCounterIndex] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittingCounter, setSubmittingCounter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const synthRef = useRef(window.speechSynthesis)
  const [doubtOpen, setDoubtOpen] = useState(false)
  const [doubtText, setDoubtText] = useState('')
  const [doubtMessages, setDoubtMessages] = useState([])
  const [sendingDoubt, setSendingDoubt] = useState(false)
  const doubtEndRef = useRef(null)

  // Code Execution State
  const [codeOutput, setCodeOutput] = useState('')
  const [runningCode, setRunningCode] = useState(false)
  const [ideLanguage, setIdeLanguage] = useState('javascript')
  const [activeCodeTab, setActiveCodeTab] = useState('testcase')
  const [testCases, setTestCases] = useState([])
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0)
  const [caseResults, setCaseResults] = useState([])
  const [customInput, setCustomInput] = useState('')
  const [customOutput, setCustomOutput] = useState('')
  const [customRunStatus, setCustomRunStatus] = useState('idle')
  const [doubtHighlight, setDoubtHighlight] = useState(false)
  const [codingJsonDrafts, setCodingJsonDrafts] = useState({ examples: '[]', hiddenTestCases: '[]' })
  const [cleanedQuestion, setCleanedQuestion] = useState(null)
  const [cleaningQuestion, setCleaningQuestion] = useState(false)

  // Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTarget, setRecordingTarget] = useState(null) // 'answer', 'counter', 'doubt'
  const [speechSupported, setSpeechSupported] = useState(true)
  const [recordingError, setRecordingError] = useState('')
  const [soundPulse, setSoundPulse] = useState(0)
  const recognitionRef = useRef(null)
  const audioPulseRef = useRef(null)
  const recordingBaseTextRef = useRef('')
  const recordingFinalTextRef = useRef('')

  const formatExampleInput = useCallback((input) => {
    if (!input) return ''
    // If it's already a readable string like "nums = [2,7,11,15], target = 9", keep it
    if (typeof input === 'string') {
      // Try to parse as JSON object and format fields separately
      try {
        const parsed = JSON.parse(input)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return Object.entries(parsed)
            .filter(([k]) => k !== 'output' && k !== 'hidden')
            .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
            .join(', ')
        }
      } catch { /* not JSON, return as-is */ }
      return input
    }
    // If it's an object, format each key separately
    if (typeof input === 'object' && !Array.isArray(input)) {
      return Object.entries(input)
        .filter(([k]) => k !== 'output' && k !== 'hidden')
        .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
        .join(', ')
    }
    return JSON.stringify(input)
  }, [])

  const formatTestCaseDisplay = useCallback((inputJson) => {
    // Parse JSON input and return array of {key, value} for separate display
    try {
      const parsed = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed)
          .filter(([k]) => k !== 'output' && k !== 'hidden')
          .map(([k, v]) => ({ key: k, value: JSON.stringify(v) }))
      }
    } catch { /* not valid JSON */ }
    return null // null means show as raw text
  }, [])

  const createDefaultTestCases = useCallback(() => ([
    { id: 1, name: 'Case 1', input: '', expectedOutput: '', actualOutput: '', status: 'idle', passed: null },
    { id: 2, name: 'Case 2', input: '', expectedOutput: '', actualOutput: '', status: 'idle', passed: null },
  ]), [])

  const formatStructuredCaseInput = useCallback((testCase) => {
    const entries = Object.entries(testCase || {}).filter(([key]) => key !== 'output' && key !== 'hidden')
    return JSON.stringify(Object.fromEntries(entries), null, 2)
  }, [])

  const prettyJson = useCallback((value, fallback = '[]') => {
    try {
      return JSON.stringify(value ?? JSON.parse(fallback), null, 2)
    } catch (_error) {
      return fallback
    }
  }, [])

  const buildStructuredStarterCode = useCallback((_questionText, cppSignature = 'string solve(const string& rawInput)') => (
    `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    ${cppSignature} {\n        // TODO: write your solution\n    }\n};\n`
  ), [])

  const buildCodingTestCases = useCallback((codingMeta) => {
    if (codingMeta?.executionStyle === 'leetcode' && Array.isArray(codingMeta.visibleTestCases) && codingMeta.visibleTestCases.length > 0) {
      return codingMeta.visibleTestCases.map((testCase, index) => ({
        id: index + 1,
        name: `Case ${index + 1}`,
        input: formatStructuredCaseInput(testCase),
        expectedOutput: String(testCase.output || ''),
        actualOutput: '',
        status: 'idle',
        passed: null,
        structured: true,
      }))
    }

    return createDefaultTestCases()
  }, [createDefaultTestCases, formatStructuredCaseInput])

  const parseStructuredCase = useCallback((inputText, expectedOutput, hidden = false) => {
    const parsed = JSON.parse(inputText || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Structured coding input must be a JSON object.')
    }

    return {
      ...parsed,
      output: String(expectedOutput || ''),
      hidden,
    }
  }, [])

  const buildCodingStarter = useCallback((language, questionText, codingMeta = null) => {
    if (codingMeta?.executionStyle === 'leetcode' && language === 'cpp') {
      const starter = buildStructuredStarterCode(questionText, codingMeta.cppSignature || 'string solve(const string& rawInput)')
      return {
        code: starter,
        examples: Array.isArray(codingMeta.examples) && codingMeta.examples.length > 0
          ? codingMeta.examples.map((example) => `Input: ${example.input}\nOutput: ${example.output}${example.explanation ? `\nWhy: ${example.explanation}` : ''}`)
          : [
              'Implement only the Solution::solve(...) function.',
              'The backend injects wrapper code and test cases automatically.',
              'Use the sample input/output shown in the problem panel.',
            ],
      }
    }

    if (language === 'python') {
      return {
        code: `# Read from stdin and print the final answer.\n\nimport sys\n\n\ndef solve(raw_input):\n    # TODO: write your solution\n    return raw_input.strip()\n\n\nif __name__ == "__main__":\n    data = sys.stdin.read()\n    print(solve(data))\n`,
        examples: [
          'Each test case sends data through standard input.',
          'Parse `raw_input` into the structure your solution needs.',
          'Return the final answer and print it once.',
        ],
      }
    }

    if (language === 'java') {
      return {
        code: `// Read from stdin and print the final answer.\n\nimport java.io.BufferedReader;\nimport java.io.InputStreamReader;\n\npublic class Main {\n    public static String solve(String rawInput) {\n        // TODO: write your solution\n        return rawInput.trim();\n    }\n\n    public static void main(String[] args) throws Exception {\n        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n        StringBuilder builder = new StringBuilder();\n        String line;\n\n        while ((line = reader.readLine()) != null) {\n            if (builder.length() > 0) builder.append(\"\\n\");\n            builder.append(line);\n        }\n\n        System.out.print(solve(builder.toString()));\n    }\n}\n`,
        examples: [
          'Each test case sends data through standard input.',
          'Parse the full stdin string inside `solve(...)`.',
          'Return the final answer and print it once.',
        ],
      }
    }

    if (language === 'cpp') {
      return {
        code: `// Read from stdin and print the final answer.\n\n#include <bits/stdc++.h>\nusing namespace std;\n\nstring solve(const string& rawInput) {\n    // TODO: write your solution\n    return rawInput;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n    cout << solve(input);\n    return 0;\n}\n`,
        examples: [
          'Each test case sends data through standard input.',
          'Parse the raw stdin text in `solve(...)`.',
          'Return the final answer and print it once.',
        ],
      }
    }

    return {
      code: `// Read from stdin and print the final answer.\n\nconst fs = require('fs')\n\nfunction solve(rawInput) {\n  // TODO: write your solution\n  return rawInput.trim()\n}\n\nconst input = fs.readFileSync(0, 'utf8')\nprocess.stdout.write(String(solve(input)))\n`,
      examples: [
        'Each test case sends data through standard input.',
        'Parse `rawInput` into arrays, graphs, or strings as needed.',
        'Return the final answer and print it once.',
      ],
    }
  }, [buildStructuredStarterCode])

  const syncCodingDrafts = useCallback((codingMeta) => {
    setCodingJsonDrafts({
      examples: prettyJson(codingMeta?.examples || [], '[]'),
      hiddenTestCases: prettyJson(codingMeta?.hiddenTestCases || [], '[]'),
    })
  }, [prettyJson])

  const loadSidebar = useCallback(async () => {
    try {
      const res = await getAllQuestions(sessionId)
      setSections(res.data.sections || [])
      if (res.data.status === 'completed') setCompleted(true)
    } catch (err) {
      console.error('Failed to load sidebar:', err)
    }
  }, [sessionId])

  const loadCurrentQuestion = useCallback(async () => {
    try {
      const res = await getCurrentQuestion(sessionId)
      if (res.data.status === 'completed') { setCompleted(true); return }
      setCurrentQ(res.data)
      setAnswer('')
      setFeedback(null)
      setCounterQuestion(null)
      setCounterAnswer('')
      setCounterMessages([])
      setActiveCounterIndex(null)
      setCodeOutput('')
      setTestCases(buildCodingTestCases(res.data.coding))
      setCaseResults([])
      setActiveTestCaseIndex(0)
      setCustomInput('')
      setCustomOutput('')
      setCustomRunStatus('idle')
      setActiveCodeTab('testcase')
      syncCodingDrafts(res.data.coding)
      setCleanedQuestion(null)
      setCleaningQuestion(false)
      setDoubtMessages([])
      setDoubtOpen(false)
      
      // Stop any active recording when the question context changes.
      recognitionRef.current?.stop()
      setIsRecording(false)
      setRecordingTarget(null)
      setSoundPulse(0)
    } catch (err) {
      setError('Failed to load question')
    }
  }, [sessionId, buildCodingTestCases, syncCodingDrafts])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadSidebar()
      await loadCurrentQuestion()
      setLoading(false)
    }
    init()
  }, [loadSidebar, loadCurrentQuestion])

  // --- Speech-to-Text Initialization ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'
      setSpeechSupported(true)

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        let interimTranscriptLength = 0
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0]?.transcript || ''
          interimTranscriptLength += transcript.length
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        setSoundPulse(Math.min(1, Math.max(0.15, interimTranscriptLength / 60)))
        if (finalTranscript) recordingFinalTextRef.current += finalTranscript + ' '

        const text = (recordingBaseTextRef.current + recordingFinalTextRef.current + interimTranscript).trimStart()

        setRecordingTarget((prevTarget) => {
          if (prevTarget === 'answer') setAnswer(text)
          else if (prevTarget === 'counter') setCounterAnswer(text)
          else if (prevTarget === 'doubt') setDoubtText(text)
          return prevTarget
        })
      }

      recognitionRef.current.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.error('Speech recognition error:', event.error)
          setRecordingError('Microphone error: ' + event.error)
          setIsRecording(false)
          setRecordingTarget(null)
          setSoundPulse(0)
        }
      }

      recognitionRef.current.onend = () => {
        setIsRecording((prev) => {
          if (!prev) setSoundPulse(0)
          if (prev && recognitionRef.current) {
            try { recognitionRef.current.start() } catch (e) {}
          }
          return prev
        })
      }
    } else {
      setSpeechSupported(false)
    }
    return () => recognitionRef.current?.stop()
  }, [])

  const toggleRecording = (target) => {
    if (!recognitionRef.current) {
      alert("Speech recognition isn't supported in this browser. Try Chrome or Edge.")
      return
    }
    if (isRecording && recordingTarget === target) {
      // Stop current recording
      recognitionRef.current.stop()
      setIsRecording(false)
      setRecordingTarget(null)
      setRecordingError('')
      setSoundPulse(0)
    } else {
      // Start recording new target
      if (isRecording) {
        recognitionRef.current.stop()
      }
      recordingBaseTextRef.current =
        target === 'answer' ? answer : target === 'counter' ? counterAnswer : doubtText
      recordingFinalTextRef.current = ''
      setRecordingTarget(target)
      setIsRecording(true)
      setRecordingError('')
      try {
        recognitionRef.current.start()
      } catch (_error) {
        setIsRecording(false)
        setRecordingTarget(null)
        setRecordingError('Unable to start microphone. Please allow mic permission and try again.')
        setSoundPulse(0)
      }
    }
  }
  // ------------------------------------

  const speak = useCallback((text) => {
    const synth = synthRef.current
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.pitch = 1
    u.volume = 1
    const voices = synth.getVoices()
    const v = voices.find(x => x.lang.startsWith('en') && x.name.includes('Google'))
      || voices.find(x => x.lang.startsWith('en-US'))
      || voices.find(x => x.lang.startsWith('en'))
    if (v) u.voice = v
    u.onstart = () => setIsSpeaking(true)
    u.onend = () => setIsSpeaking(false)
    u.onerror = () => setIsSpeaking(false)
    synth.speak(u)
  }, [])

  const toggleTTS = () => {
    const synth = synthRef.current
    if (synth.speaking) { synth.cancel(); setIsSpeaking(false) }
    else if (currentQ) speak(currentQ.question)
  }

  useEffect(() => {
    if (currentQ && currentQ.question && currentQ.type !== 'coding' && !feedback && !isRecording) {
      const t = setTimeout(() => speak(currentQ.question), 500)
      return () => clearTimeout(t)
    }
  }, [currentQ?.question_number])

  useEffect(() => { return () => synthRef.current.cancel() }, [])

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || submitting) return
    if (isRecording) toggleRecording('answer') // Stop recording on submit
    setSubmitting(true)
    setError('')
    try {
      const res = await submitAnswer(sessionId, answer.trim())
      setFeedback(res.data)
      if (res.data.has_counter_question && res.data.counter_question) {
        setCounterQuestion(res.data.counter_question)
        setCounterMessages([{ role: 'assistant', content: res.data.counter_question }])
        setActiveCounterIndex(res.data.counter_index ?? 0)
        setTimeout(() => speak(res.data.counter_question), 800)
      }
      await loadSidebar()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitCounterAnswer = async () => {
    if (!counterAnswer.trim() || submittingCounter) return
    if (isRecording) toggleRecording('counter')
    setSubmittingCounter(true)
    try {
      const answerText = counterAnswer.trim()
      setCounterMessages((prev) => [...prev, { role: 'user', content: answerText }])
      const res = await submitCounterAnswer(
        sessionId,
        answerText,
        currentQ?.question_number,
        activeCounterIndex,
        counterQuestion
      )
      setCounterMessages((prev) => [...prev, { role: 'assistant', content: res.data.feedback, type: 'feedback' }])
      setFeedback(prev => ({ ...prev, counter_feedback: res.data.feedback, score_adjustment: res.data.score_adjustment }))
      setCounterQuestion(null)
      setActiveCounterIndex(null)
      setCounterAnswer('')
    } catch (err) {
      setError('Failed to submit follow-up answer')
    } finally {
      setSubmittingCounter(false)
    }
  }

  const handleNext = async () => {
    try {
      if (isRecording) toggleRecording(recordingTarget)
      const res = await moveToNext(sessionId)
      if (res.data.status === 'completed') { setCompleted(true); return }
      setCurrentQ(res.data)
      setAnswer('')
      setFeedback(null)
      setCounterQuestion(null)
      setCounterAnswer('')
      setCounterMessages([])
      setActiveCounterIndex(null)
      setCodeOutput('')
      setTestCases(buildCodingTestCases(res.data.coding))
      setCaseResults([])
      setActiveTestCaseIndex(0)
      setActiveCodeTab('testcase')
      syncCodingDrafts(res.data.coding)
      setDoubtMessages([])
      setDoubtOpen(false)
      await loadSidebar()
    } catch (err) {
      setError('Failed to load next question')
    }
  }

  const handleSkip = async () => {
    if (isRecording) toggleRecording(recordingTarget)
    try {
      // Just immediately advance the front end and back end without waiting for a full evaluation
      submitAnswer(sessionId, '(Skipped)').catch(e => console.error(e)); 
      await handleNext()
    } catch (err) { 
      setError('Failed to skip question')
    }
  }

  const handleEndInterview = async () => {
    if (!window.confirm('Are you sure you want to end the interview?')) return
    if (isRecording) toggleRecording(recordingTarget)
    try { await endInterview(sessionId); setCompleted(true) }
    catch (err) { setError('Failed to end interview') }
  }

  const handleSendDoubt = async () => {
    if (!doubtText.trim() || sendingDoubt) return
    if (isRecording && recordingTarget === 'doubt') toggleRecording('doubt')
    const text = doubtText.trim()
    setDoubtText('')
    setDoubtMessages(prev => [...prev, { role: 'user', content: text }])
    setSendingDoubt(true)
    try {
      const res = await askDoubt(sessionId, text, activeDoubtContext)
      const compactResponse = (res.data.response || '')
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .slice(0, 4)
        .join(' ')
      const shortResponse = compactResponse.length > 420
        ? compactResponse.slice(0, 417).trimEnd() + '...'
        : compactResponse
      setDoubtMessages(prev => [...prev, { role: 'assistant', content: shortResponse || 'Try focusing on the key requirement and your approach.', hint: res.data.hint }])
      speak(shortResponse || 'Try focusing on the key requirement and your approach.') // Read doubt answer aloud
    } catch (err) {
      setDoubtMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process your question.' }])
    } finally {
      setSendingDoubt(false)
    }
  }

  const handleDoubtKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDoubt() }
  }

  useEffect(() => { doubtEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [doubtMessages])

  useEffect(() => {
    if (!isRecording) {
      setSoundPulse(0)
      if (audioPulseRef.current) {
        window.clearInterval(audioPulseRef.current)
        audioPulseRef.current = null
      }
      return undefined
    }

    audioPulseRef.current = window.setInterval(() => {
      setSoundPulse((prev) => {
        const next = prev > 0.2 ? prev - 0.08 : 0.18
        return Number(next.toFixed(2))
      })
    }, 180)

    return () => {
      if (audioPulseRef.current) {
        window.clearInterval(audioPulseRef.current)
        audioPulseRef.current = null
      }
    }
  }, [isRecording])

  useEffect(() => {
    if (currentQ?.type === 'coding') {
      const nextLanguage = currentQ?.coding?.executionStyle === 'leetcode' ? 'cpp' : ideLanguage
      if (currentQ?.coding?.executionStyle === 'leetcode') {
        setIdeLanguage('cpp')
      }
      setAnswer(buildCodingStarter(nextLanguage, currentQ.question, currentQ.coding).code)
      setCodeOutput('')

      // Use MongoDB visibleTestCases directly (1-3 cases) if available
      const mongoTestCases = currentQ?.coding?.visibleTestCases
      const hasMongoTestCases = Array.isArray(mongoTestCases) && mongoTestCases.length > 0
      if (hasMongoTestCases) {
        setTestCases(mongoTestCases.slice(0, 3).map((tc, i) => ({
          id: i + 1,
          name: `Case ${i + 1}`,
          input: JSON.stringify(
            Object.fromEntries(Object.entries(tc).filter(([k]) => k !== 'output' && k !== 'hidden')),
            null, 2
          ),
          expectedOutput: String(tc.output || ''),
          actualOutput: '',
          status: 'idle',
          passed: null,
          structured: true,
        })))
      } else {
        setTestCases(buildCodingTestCases(currentQ.coding))
      }

      setCaseResults([])
      setActiveTestCaseIndex(0)
      setCustomInput('')
      setCustomOutput('')
      setCustomRunStatus('idle')

      // LLM clean the question for display only (don't overwrite test cases)
      setCleanedQuestion(null)
      setCleaningQuestion(true)
      cleanQuestionText(currentQ.question, currentQ?.coding?.source?.title || '')
        .then((res) => {
          setCleanedQuestion(res.data)
          // Only populate test cases from LLM if MongoDB didn't provide them
          if (!hasMongoTestCases) {
            const data = res.data
            if (Array.isArray(data.testCases) && data.testCases.length > 0) {
              setTestCases(data.testCases.slice(0, 3).map((tc, i) => {
                let inputStr = ''
                if (typeof tc.input === 'object' && tc.input !== null) {
                  inputStr = JSON.stringify(tc.input, null, 2)
                } else if (typeof tc.input === 'string') {
                  try { inputStr = JSON.stringify(JSON.parse(tc.input), null, 2) }
                  catch { inputStr = tc.input }
                }
                return {
                  id: i + 1,
                  name: `Case ${i + 1}`,
                  input: inputStr,
                  expectedOutput: typeof tc.expectedOutput === 'object' ? JSON.stringify(tc.expectedOutput) : String(tc.expectedOutput || ''),
                  actualOutput: '',
                  status: 'idle',
                  passed: null,
                  structured: currentQ?.coding?.executionStyle === 'leetcode',
                }
              }))
            }
          }
        })
        .catch(() => setCleanedQuestion(null))
        .finally(() => setCleaningQuestion(false))
    }
  }, [currentQ?.question_number, currentQ?.type, ideLanguage, buildCodingStarter, buildCodingTestCases])

  const executeCode = async (inputCases = testCases, mode = 'run') => {
    const payloadCases = currentQ?.coding?.executionStyle === 'leetcode'
      ? inputCases.map((testCase) => parseStructuredCase(testCase.input, testCase.expectedOutput, false))
      : inputCases.map((testCase) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
        }))

    const res = await runCode(
      currentQ?.coding?.executionStyle === 'leetcode' ? 'cpp' : ideLanguage,
      answer,
      payloadCases,
      mode
    )
    return res.data
  }

  const handleRunCode = async () => {
    if (!answer.trim() || runningCode) return
    setRunningCode(true)
    setCodeOutput('Running...')
    setActiveCodeTab('results')

    try {
      const execution = await executeCode(testCases, 'run')
      const results = execution.results || []
      const updatedCases = testCases.map((testCase, index) => {
        const result = results[index]
        if (!result) return testCase

        return {
          ...testCase,
          actualOutput: result.actualOutput || '',
          status: result.status || 'Unknown',
          passed: Boolean(result.passed),
        }
      })

      setTestCases(updatedCases)
      setCaseResults(results)
      const passedCount = results.filter((result) => result.passed).length
      setCodeOutput(`${passedCount}/${results.length} test cases passed`)
    } catch (err) {
      setCodeOutput(err.response?.data?.detail || err.message || 'Unable to run code right now. Please try again in a moment.')
    } finally {
      setRunningCode(false)
    }
  }

  const handleRunCustomInput = async () => {
    if (!answer.trim() || runningCode) return
    setRunningCode(true)
    setActiveCodeTab('results')
    setCustomRunStatus('running')
    setCustomOutput('Running custom input...')

    try {
      const execution = currentQ?.coding?.executionStyle === 'leetcode'
        ? (await runCode(
            'cpp',
            answer,
            [parseStructuredCase(customInput, '', false)],
            'run'
          )).data
        : await executeCode([
            {
              input: customInput,
              expectedOutput: '',
            },
          ], 'run')
      const result = execution.results?.[0]
      setCustomOutput(result?.actualOutput || 'No output')
      setCustomRunStatus(result?.status || 'Completed')
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Unable to run custom input right now. Please try again in a moment.'
      setCustomOutput(message)
      setCustomRunStatus('error')
    } finally {
      setRunningCode(false)
    }
  }

  const getScoreClass = (score) => score >= 8 ? 'high' : score >= 5 ? 'mid' : 'low'
  const isStructuredCoding = currentQ?.coding?.executionStyle === 'leetcode'
  const codingSource = currentQ?.coding?.source || null
  const cqn = currentQ?.current_index ?? 0
  const tq = currentQ?.total_questions ?? 0
  const ac = sections.reduce((s, sec) => s + sec.questions.filter(q => q.answered).length, 0)
  const tc = sections.reduce((s, sec) => s + sec.questions.length, 0)
  const pct = tq > 0 ? ((cqn + (feedback ? 1 : 0)) / tq) * 100 : 0
  const activeDoubtContext = counterQuestion || currentQ?.question || ''
  const activeTestCase = testCases[activeTestCaseIndex] || testCases[0]

  const updateTestCaseField = (field, value) => {
    setTestCases((prev) => prev.map((testCase, index) => (
      index === activeTestCaseIndex
        ? { ...testCase, [field]: value }
        : testCase
    )))
  }

  const addTestCase = () => {
    setTestCases((prev) => {
      const next = [
        ...prev,
        {
          id: Date.now(),
          name: `Case ${prev.length + 1}`,
          input: '',
          expectedOutput: '',
          actualOutput: '',
          status: 'idle',
          passed: null,
        },
      ]
      setActiveTestCaseIndex(next.length - 1)
      return next
    })
  }

  const updateCodingQuestion = (value) => {
    setCurrentQ((prev) => prev ? ({ ...prev, question: value }) : prev)
  }

  const updateCodingField = (field, value) => {
    setCurrentQ((prev) => (
      prev?.coding
        ? { ...prev, coding: { ...prev.coding, [field]: value } }
        : prev
    ))
  }

  const updateConstraintLines = (value) => {
    updateCodingField('constraints', value.split('\n').map((item) => item.trim()).filter(Boolean))
  }

  const updateJsonDraft = (field, value) => {
    setCodingJsonDrafts((prev) => ({ ...prev, [field]: value }))
  }

  const applyJsonDraft = (field) => {
    try {
      const parsed = JSON.parse(codingJsonDrafts[field] || '[]')
      if (!Array.isArray(parsed)) {
        throw new Error('Value must be a JSON array.')
      }
      updateCodingField(field, parsed)
      setError('')
    } catch (err) {
      setError(err.message || 'Invalid JSON data')
    }
  }

  const syncEditorWithMetadata = () => {
    if (!isStructuredCoding) return
    const starter = buildStructuredStarterCode(
      currentQ?.question || '',
      currentQ?.coding?.cppSignature || 'string solve(const string& rawInput)'
    )
    updateCodingField('starterCode', starter)
    setAnswer(starter)
  }

  useEffect(() => {
    if (!doubtOpen) return undefined
    setDoubtHighlight(true)
    const timeout = setTimeout(() => setDoubtHighlight(false), 1200)
    return () => clearTimeout(timeout)
  }, [doubtMessages.length, doubtOpen])

  if (loading) {
    return (
      <div className="interview-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem' }}>
          <div className="inline-spinner" style={{ width: 32, height: 32 }} />
          <span style={{ color: 'var(--text-secondary)' }}>Loading interview...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="interview-page">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Questions</h2>
          <span className="sidebar-progress">{ac}/{tc}</span>
        </div>
        <div className="sidebar-sections">
          {sections.map((section, si) => (
            <div key={si} className="sidebar-section">
              <div className={'section-header' + (si === (currentQ?.section_index ?? 0) ? ' active' : '')}>
                <span className="section-icon" />
                {section.title}
              </div>
              <div className="section-questions">
                {section.questions.map((q) => {
                  const isCur = q.questionNumber === cqn && !completed
                  return (
                    <div key={q.questionNumber}
                      className={'sidebar-question' + (isCur ? ' current' : '') + (q.answered ? ' answered' : '')}>
                      <span className={'q-status ' + (isCur ? 'active' : q.answered ? 'done' : 'pending')}>
                        {q.answered ? '\u2713' : isCur ? '\u25B8' : ''}
                      </span>
                      <span className="q-text">{q.question}</span>
                      <span className={'difficulty-badge ' + q.difficulty}>{q.difficulty}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {!completed && (
          <button className="end-interview-btn" onClick={handleEndInterview}>End Interview</button>
        )}
      </aside>

      <div className="main-content">
        <div className="interview-topbar">
          <div className="topbar-left">
            <span className="topbar-section-title">
              <strong>{currentQ?.section_title || 'Interview'}</strong>
              {currentQ && (' - Q' + (cqn + 1) + ' of ' + tq)}
            </span>
          </div>
          <div className="topbar-right">
            {currentQ?.type !== 'coding' && (
              <button className={'tts-btn' + (isSpeaking ? ' speaking' : '')} onClick={toggleTTS}>
                {isSpeaking ? 'Speaking...' : 'Read Aloud'}
              </button>
            )}
            <button className={'doubt-toggle-btn' + (doubtOpen ? ' active' : '')}
              onClick={() => setDoubtOpen(!doubtOpen)}>
              {doubtOpen ? 'Close Doubt' : 'Ask Doubt'}
            </button>
          </div>
        </div>

          <div className={'question-area' + (doubtOpen ? ' with-doubt-panel' : '')}>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: pct + '%' }} />
            </div>
            <span className="progress-text">{Math.round(pct)}%</span>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {completed ? (
            <div className="completion-card">
              <div className="completion-icon" style={{ fontSize: '3rem' }}>&#127881;</div>
              <h2>Interview Complete!</h2>
              <p>Great job! Your responses have been evaluated.</p>
              <button className="view-report-btn" onClick={() => navigate('/report/' + sessionId)}>
                View Detailed Report
              </button>
            </div>
          ) : currentQ ? (
            <>
              <div className="question-card" key={currentQ.question_number}>
                <div className="question-meta">
                  <span className="question-label">Question {cqn + 1}</span>
                  <span className={'difficulty-badge ' + currentQ.difficulty}>{currentQ.difficulty}</span>
                  {currentQ.type === 'coding' && <span className="coding-mode-badge">Code Round</span>}
                </div>
                {currentQ.type !== 'coding' && <p className="question-text">{currentQ.question}</p>}
              </div>

              {!feedback && (
                <div className="answer-area animate-fade-in">
                  
                  {currentQ.type === 'coding' ? (
                    <div className="leetcode-workspace">
                      <div className="leetcode-problem-panel">
                        <div className="leetcode-tabs">
                          <button
                            type="button"
                            className="leetcode-tab active"
                          >
                            Description
                          </button>
                        </div>

                          <div className="leetcode-description">
                            <div className="leetcode-problem-header">
                              <h3 className="leetcode-problem-title">
                                {currentQ?.coding?.source?.questionId ? `${currentQ.coding.source.questionId}. ` : ''}
                                {cleanedQuestion?.title || currentQ?.coding?.source?.title || 'Coding Challenge'}
                              </h3>
                              <span className={'lc-difficulty-pill ' + currentQ.difficulty}>{currentQ.difficulty}</span>
                            </div>

                            {codingSource?.tags?.length > 0 && (
                              <div className="lc-tags">
                                {codingSource.tags.map((tag) => <span key={tag} className="lc-tag">{tag}</span>)}
                              </div>
                            )}

                            {cleaningQuestion && (
                              <div className="lc-loading">
                                <div className="inline-spinner" style={{ width: 18, height: 18 }} />
                                <span>Formatting question...</span>
                              </div>
                            )}

                            <div className="lc-problem-body">
                              {cleanedQuestion ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanedQuestion.description}</ReactMarkdown>
                              ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentQ.question}</ReactMarkdown>
                              )}

                              {(() => {
                                const examples = currentQ?.coding?.examples?.length > 0
                                  ? currentQ.coding.examples
                                  : cleanedQuestion?.examples;
                                return examples?.length > 0 && examples.map((ex, i) => (
                                  <div key={i} className="lc-example">
                                    <p className="lc-example-title"><strong>Example {i + 1}:</strong></p>
                                    <div className="lc-example-block">
                                      <div><strong>Input:</strong> <code>{formatExampleInput(ex.input)}</code></div>
                                      <div><strong>Output:</strong> <code>{typeof ex.output === 'object' ? JSON.stringify(ex.output) : ex.output}</code></div>
                                      {ex.explanation && <div><strong>Explanation:</strong> {ex.explanation}</div>}
                                    </div>
                                  </div>
                                ));
                              })()}

                              {(() => {
                                const constraints = currentQ?.coding?.constraints?.length > 0
                                  ? currentQ.coding.constraints
                                  : cleanedQuestion?.constraints;
                                return constraints?.length > 0 && (
                                  <div className="lc-constraints">
                                    <p><strong>Constraints:</strong></p>
                                    <ul>
                                      {constraints.map((c, i) => <li key={i}><code>{c}</code></li>)}
                                    </ul>
                                  </div>
                                );
                              })()}
                            </div>

                            {isStructuredCoding && (
                              <div className="lc-info-section">
                                <div className="lc-info-label">Implementation Notes</div>
                                <ul className="lc-info-list">
                                  <li>Implement only the <code>solve(...)</code> function body in C++.</li>
                                  <li>The backend injects wrappers and test cases automatically.</li>
                                  <li>Run your code to validate, then submit when ready.</li>
                                </ul>
                              </div>
                            )}
                          </div>
                      </div>

                      <div className="leetcode-editor-panel">
                        <div className="ide-toolbar">
                            <div className="ide-toolbar-left">
                              <div className="ide-chip">Code</div>
                          </div>
                          <div className="ide-toolbar-right">
                            <select
                              value={ideLanguage}
                              onChange={(e) => setIdeLanguage(e.target.value)}
                              className="ide-language-select"
                              disabled={isStructuredCoding}
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                            </select>
                            <button
                              type="button"
                              className={'mic-btn ide-mic-btn ' + (isRecording && recordingTarget === 'answer' ? 'recording' : '')}
                              onClick={() => toggleRecording('answer')}
                              title={speechSupported ? 'Dictate Code/Answer' : 'Speech not supported'}
                              disabled={!speechSupported}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                            </button>
                            <button className="run-code-btn" onClick={handleRunCode} disabled={runningCode}>
                              {runningCode ? 'Running...' : 'Run'}
                            </button>
                          </div>
                        </div>

                    <div className="mic-status-row">
                      {!speechSupported && <span className="mic-status error">Speech input is not supported in this browser.</span>}
                      {speechSupported && isRecording && recordingTarget === 'answer' && <span className="mic-status listening">Listening for coding answer...</span>}
                      {recordingError && <span className="mic-status error">{recordingError}</span>}
                    </div>
                    {isRecording && recordingTarget === 'answer' && (
                      <div className="mic-visualizer" aria-hidden="true">
                        <span style={{ transform: `scaleY(${0.45 + soundPulse})` }} />
                        <span style={{ transform: `scaleY(${0.65 + soundPulse / 1.4})` }} />
                        <span style={{ transform: `scaleY(${0.35 + soundPulse / 1.8})` }} />
                        <span style={{ transform: `scaleY(${0.8 + soundPulse / 1.2})` }} />
                      </div>
                    )}

                        <div className="ide-editor-wrapper leetcode-editor-wrapper">
                          <Editor
                            height="100%"
                            language={ideLanguage}
                            theme="vs-dark"
                            value={answer}
                            onChange={(val) => setAnswer(val || '')}
                            options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              lineNumbersMinChars: 3,
                              scrollBeyondLastLine: false,
                              padding: { top: 14 },
                            }}
                          />
                        </div>

                        {/* ── Testcase panel (below editor, like LeetCode) ── */}
                        <div className="leetcode-testcase-panel">
                          <div className="leetcode-testcase-tabs">
                            <button
                              type="button"
                              className={'leetcode-tab' + (activeCodeTab !== 'results' ? ' active' : '')}
                              onClick={() => setActiveCodeTab('testcase')}
                            >
                              Testcase
                            </button>
                            <button
                              type="button"
                              className={'leetcode-tab' + (activeCodeTab === 'results' ? ' active' : '')}
                              onClick={() => setActiveCodeTab('results')}
                            >
                              Test Result
                            </button>
                          </div>

                          {activeCodeTab !== 'results' ? (
                            <div className="leetcode-testcase-body">
                              <div className="test-case-tabs">
                                {testCases.map((testCase, index) => (
                                  <button
                                    key={testCase.id}
                                    type="button"
                                    className={
                                      'test-case-tab'
                                      + (index === activeTestCaseIndex ? ' active' : '')
                                      + (testCase.passed === true ? ' pass' : '')
                                      + (testCase.passed === false ? ' fail' : '')
                                    }
                                    onClick={() => setActiveTestCaseIndex(index)}
                                  >
                                    {testCase.name}
                                  </button>
                                ))}
                                <button type="button" className="test-case-add" onClick={addTestCase}>+</button>
                              </div>

                              {activeTestCase && (
                                <div className="leetcode-testcase-fields">
                                  {(() => {
                                    const fields = isStructuredCoding ? formatTestCaseDisplay(activeTestCase.input) : null
                                    if (fields) {
                                      return (
                                        <>
                                          {fields.map((f) => (
                                            <div key={f.key} className="leetcode-field">
                                              <div className="leetcode-field-label">{f.key}</div>
                                              <textarea
                                                className="leetcode-field-input"
                                                value={f.value}
                                                onChange={(e) => {
                                                  // Update individual field inside the JSON input
                                                  try {
                                                    const parsed = JSON.parse(activeTestCase.input)
                                                    parsed[f.key] = JSON.parse(e.target.value)
                                                    updateTestCaseField('input', JSON.stringify(parsed, null, 2))
                                                  } catch {
                                                    // If parse fails, update raw
                                                    updateTestCaseField('input', e.target.value)
                                                  }
                                                }}
                                                rows={1}
                                              />
                                            </div>
                                          ))}
                                          <div className="leetcode-field">
                                            <div className="leetcode-field-label">Expected Output</div>
                                            <textarea
                                              className="leetcode-field-input"
                                              placeholder="expected output"
                                              value={activeTestCase.expectedOutput}
                                              onChange={(e) => updateTestCaseField('expectedOutput', e.target.value)}
                                              rows={1}
                                            />
                                          </div>
                                        </>
                                      )
                                    }
                                    return (
                                      <>
                                        <div className="leetcode-field">
                                          <div className="leetcode-field-label">Input</div>
                                          <textarea
                                            className="leetcode-field-input"
                                            placeholder={isStructuredCoding ? '{"key": "value"}' : 'stdin input'}
                                            value={activeTestCase.input}
                                            onChange={(e) => updateTestCaseField('input', e.target.value)}
                                            rows={2}
                                          />
                                        </div>
                                        <div className="leetcode-field">
                                          <div className="leetcode-field-label">Expected Output</div>
                                          <textarea
                                            className="leetcode-field-input"
                                            placeholder="expected output"
                                            value={activeTestCase.expectedOutput}
                                            onChange={(e) => updateTestCaseField('expectedOutput', e.target.value)}
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
                            <div className="leetcode-testcase-body">
                              {caseResults.length > 0 ? (
                                <>
                                  <div className="case-results">
                                    {caseResults.map((result, index) => (
                                      <span key={index} className={'case-result ' + (result.passed ? 'pass' : 'fail')}>
                                        {`Case ${index + 1}: ${result.status}`}
                                      </span>
                                    ))}
                                  </div>
                                  {testCases.map((tc, index) => (
                                    tc.actualOutput && (
                                      <div key={tc.id} className="leetcode-result-case">
                                        <div className="leetcode-field-label">Case {index + 1}</div>
                                        {(() => {
                                          const fields = isStructuredCoding ? formatTestCaseDisplay(tc.input) : null
                                          if (fields) {
                                            return fields.map((f) => (
                                              <div key={f.key} className="leetcode-result-row">
                                                <span className="leetcode-result-label">{f.key}:</span>
                                                <code>{f.value}</code>
                                              </div>
                                            ))
                                          }
                                          return (
                                            <div className="leetcode-result-row">
                                              <span className="leetcode-result-label">Input:</span>
                                              <code>{tc.input}</code>
                                            </div>
                                          )
                                        })()}
                                        <div className="leetcode-result-row">
                                          <span className="leetcode-result-label">Expected:</span>
                                          <code>{tc.expectedOutput}</code>
                                        </div>
                                        <div className="leetcode-result-row">
                                          <span className="leetcode-result-label">Output:</span>
                                          <code className={tc.passed ? 'pass' : 'fail'}>{tc.actualOutput}</code>
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </>
                              ) : (
                                <div className="leetcode-no-results">Run your code to see test results.</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                    <div className="input-with-mic">
                      <textarea className="answer-textarea"
                        placeholder="Type your answer here or click the microphone to dictate..."
                        value={answer} onChange={(e) => setAnswer(e.target.value)}
                        disabled={submitting}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSubmitAnswer() }}
                      />
                      <button
                        className={'mic-btn ' + (isRecording && recordingTarget === 'answer' ? 'recording' : '')}
                        onClick={() => toggleRecording('answer')}
                        title={speechSupported ? 'Speak Answer' : 'Speech not supported'}
                        disabled={!speechSupported}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                      </button>
                    </div>
                    <div className="mic-status-row">
                      {!speechSupported && <span className="mic-status error">Speech input is not supported in this browser.</span>}
                      {speechSupported && isRecording && recordingTarget === 'answer' && <span className="mic-status listening">Listening for answer...</span>}
                      {recordingError && <span className="mic-status error">{recordingError}</span>}
                    </div>
                    {isRecording && recordingTarget === 'answer' && (
                      <div className="mic-visualizer" aria-hidden="true">
                        <span style={{ transform: `scaleY(${0.45 + soundPulse})` }} />
                        <span style={{ transform: `scaleY(${0.65 + soundPulse / 1.4})` }} />
                        <span style={{ transform: `scaleY(${0.35 + soundPulse / 1.8})` }} />
                        <span style={{ transform: `scaleY(${0.8 + soundPulse / 1.2})` }} />
                      </div>
                    )}
                    </>
                  )}

                  <div className="answer-actions">
                    <button className="skip-btn" onClick={handleSkip} disabled={submitting}>Skip</button>
                    <button className="answer-btn" onClick={handleSubmitAnswer}
                      disabled={!answer.trim() || submitting}>
                      {submitting ? (<><span className="inline-spinner" /> Evaluating...</>) : 'Submit Answer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Immediate feedback section removed per user request. Feedback is available in the final report. */}

              {counterQuestion && (
                <div className="counter-question-card">
                  <div className="counter-label">Follow-up Question</div>
                  <p className="counter-question-text">{counterQuestion}</p>
                  <div className="answer-area">
                    <div className="input-with-mic">
                      <textarea className="answer-textarea" placeholder="Answer or dictate the follow-up question..."
                        value={counterAnswer} onChange={(e) => setCounterAnswer(e.target.value)}
                        disabled={submittingCounter} style={{ minHeight: '80px' }} />
                      <button 
                        className={'mic-btn ' + (isRecording && recordingTarget === 'counter' ? 'recording' : '')} 
                        onClick={() => toggleRecording('counter')}
                        title={speechSupported ? 'Speak Follow-up Answer' : 'Speech not supported'}
                        disabled={!speechSupported}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                      </button>
                    </div>
                    <div className="mic-status-row">
                      {!speechSupported && <span className="mic-status error">Speech input is not supported in this browser.</span>}
                      {speechSupported && isRecording && recordingTarget === 'counter' && <span className="mic-status listening">Listening for follow-up answer...</span>}
                      {recordingError && <span className="mic-status error">{recordingError}</span>}
                    </div>
                    {isRecording && recordingTarget === 'counter' && (
                      <div className="mic-visualizer" aria-hidden="true">
                        <span style={{ transform: `scaleY(${0.45 + soundPulse})` }} />
                        <span style={{ transform: `scaleY(${0.65 + soundPulse / 1.4})` }} />
                        <span style={{ transform: `scaleY(${0.35 + soundPulse / 1.8})` }} />
                        <span style={{ transform: `scaleY(${0.8 + soundPulse / 1.2})` }} />
                      </div>
                    )}
                    {counterMessages.length > 0 && (
                      <div className="counter-thread">
                        {counterMessages.map((msg, index) => (
                          <div key={index} className={'counter-msg ' + msg.role + (msg.type === 'feedback' ? ' feedback' : '')}>
                            <div className="counter-msg-role">{msg.role === 'user' ? 'You' : 'Interviewer'}</div>
                            <div>{msg.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="answer-actions">
                      <button className="skip-btn" onClick={() => { setCounterQuestion(null); setCounterAnswer(''); setCounterMessages([]); setActiveCounterIndex(null) }}>
                        Close follow-up
                      </button>
                      <button className="answer-btn" onClick={handleSubmitCounterAnswer}
                        disabled={!counterAnswer.trim() || submittingCounter}>
                        {submittingCounter ? (<><span className="inline-spinner" /> Sending...</>) : 'Send Follow-up'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {feedback && !counterQuestion && (
                <div className="post-answer-card">
                  <div>
                    <div className="post-answer-title">Answer saved</div>
                    <div className="post-answer-text">Move ahead when you are ready for the next prompt.</div>
                  </div>
                  <button className="next-btn" onClick={handleNext}>Next Question &#8594;</button>
                </div>
              )}
            </>
          ) : (
            <div className="thinking-indicator">
              <div className="thinking-dots"><span /><span /><span /></div>
              Loading question...
            </div>
          )}
        </div>

        {doubtOpen && (
          <div className={'doubt-panel' + (doubtHighlight ? ' highlight' : '')}>
            <div className="doubt-panel-header">
              <div>
                <h3>Interview Coach</h3>
                <p className="doubt-panel-subtitle">Ask about the current question without getting the answer spoiled.</p>
              </div>
              <button className="close-doubt-btn" onClick={() => setDoubtOpen(false)}>&#10005;</button>
            </div>
            <div className="doubt-messages">
              {doubtMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                  Ask any question about the current interview question. I will help clarify without giving away the answer!
                </div>
              )}
              {doubtMessages.map((msg, i) => (
                <div key={i} className={'doubt-msg ' + msg.role}>
                  <div className="doubt-msg-role">{msg.role === 'user' ? 'You' : 'Coach'}</div>
                  {msg.content}
                  {msg.hint && <div className="hint">Hint: {msg.hint}</div>}
                </div>
              ))}
              {sendingDoubt && (
                <div className="thinking-indicator">
                  <div className="thinking-dots"><span /><span /><span /></div>
                  Thinking...
                </div>
              )}
              <div ref={doubtEndRef} />
            </div>
            <div className="doubt-input-area">
              <div className="input-with-mic" style={{ flex: 1 }}>
                <input className="doubt-input" placeholder="Type or speak doubt..."
                  style={{ width: '100%' }}
                  value={doubtText} onChange={(e) => setDoubtText(e.target.value)}
                  onKeyDown={handleDoubtKeyDown} disabled={sendingDoubt} />
                <button 
                  className={'mic-btn ' + (isRecording && recordingTarget === 'doubt' ? 'recording' : '')} 
                  style={{ right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => toggleRecording('doubt')}
                  title={speechSupported ? 'Speak Doubt' : 'Speech not supported'}
                  disabled={!speechSupported}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                </button>
              </div>
              {isRecording && (
                <div className="mic-visualizer" aria-hidden="true">
                  <span style={{ transform: `scaleY(${0.45 + soundPulse})` }} />
                  <span style={{ transform: `scaleY(${0.65 + soundPulse / 1.4})` }} />
                  <span style={{ transform: `scaleY(${0.35 + soundPulse / 1.8})` }} />
                  <span style={{ transform: `scaleY(${0.8 + soundPulse / 1.2})` }} />
                </div>
              )}
              <div className="mic-status-row" style={{ marginTop: '0.35rem' }}>
                {!speechSupported && <span className="mic-status error">Speech input is not supported in this browser.</span>}
                {speechSupported && isRecording && recordingTarget === 'doubt' && <span className="mic-status listening">Listening for your doubt...</span>}
                {recordingError && <span className="mic-status error">{recordingError}</span>}
              </div>
              <button className="doubt-send-btn" onClick={handleSendDoubt}
                disabled={!doubtText.trim() || sendingDoubt}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InterviewPage
