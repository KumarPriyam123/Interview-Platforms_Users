import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useWebRTC } from '../hooks/useWebRTC'
import { createExecutionJob, pollExecutionJob } from '../services/codeExecution'
import {
  createExecutionStarterCodeByLanguage,
  getExecutionStarterCode,
  mockInterviewPrompt,
} from '../services/mockInterviewData'
import { SIGNALING_URL } from '../utils/realtimeConfig'

const ROOM_POLL_INTERVAL = 5000
const EXECUTION_POLL_TIMEOUT = 120000
const MIN_CENTER_WIDTH = 28
const EXECUTION_LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
]
const SUPPORTED_EXECUTION_LANGUAGES = new Set(
  EXECUTION_LANGUAGE_OPTIONS.map((option) => option.value),
)

const defaultProblemTitle = 'Invert Binary Tree'
const defaultProblemBody = [
  mockInterviewPrompt,
  '',
  'Discuss the recursive approach first, then compare it with the iterative BFS version.',
  '',
  'Follow ups:',
  '1. What is the time complexity?',
  '2. What is the auxiliary space complexity?',
  '3. How would you solve this iteratively?',
].join('\n')

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function generateCallId() {
  return `p2p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function generateParticipantId(displayName) {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'participant'}-${Math.random().toString(36).slice(2, 8)}`
}

function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function buildInviteLink(roomId) {
  if (typeof window === 'undefined') {
    return roomId
  }

  return `${window.location.origin}/p2p-interview?room=${encodeURIComponent(roomId)}`
}

function buildMessage({ authorId, authorName, text, kind = 'peer' }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    authorId,
    authorName,
    text,
    kind,
    time: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

function mergeMessages(currentMessages, incomingMessages) {
  const merged = [...currentMessages]

  incomingMessages.forEach((message) => {
    if (!message?.id || merged.some((currentMessage) => currentMessage.id === message.id)) {
      return
    }

    merged.push(message)
  })

  return merged
}

function getExecutionStateLabel(executionState) {
  switch (executionState) {
    case 'queueing':
      return 'Submitting job'
    case 'queued':
    case 'waiting':
      return 'Queued'
    case 'active':
      return 'Running'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    default:
      return 'Ready to run'
  }
}

function getExecutionOutcomeLabel(result) {
  switch (result?.outcome) {
    case 'success':
      return 'Success'
    case 'compilation_error':
      return 'Compilation Error'
    case 'runtime_error':
      return 'Runtime Error'
    case 'timeout':
      return 'Timeout'
    case 'system_error':
      return 'System Error'
    default:
      return 'No result yet'
  }
}

function getLanguageLabel(language) {
  return EXECUTION_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label || language
}

function normalizeExecutionLanguage(language) {
  return SUPPORTED_EXECUTION_LANGUAGES.has(language) ? language : 'javascript'
}

export default function P2PInterviewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialRoomId = searchParams.get('room')?.trim() || generateCallId()
  const initialRole = searchParams.get('role')?.trim() || (searchParams.get('room') ? 'interviewee' : 'interviewer')

  const [draftRoomId, setDraftRoomId] = useState(initialRoomId)
  const [draftName, setDraftName] = useState(searchParams.get('name')?.trim() || '')
  const [draftRole, setDraftRole] = useState(initialRole)
  const [sessionConfig, setSessionConfig] = useState(null)
  const [currentRole, setCurrentRole] = useState(initialRole)
  const [problemTitle, setProblemTitle] = useState(defaultProblemTitle)
  const [problemBody, setProblemBody] = useState(defaultProblemBody)
  const [codeByLanguage, setCodeByLanguage] = useState(() => createExecutionStarterCodeByLanguage())
  const [code, setCode] = useState(() => getExecutionStarterCode('javascript'))
  const [executionLanguage, setExecutionLanguage] = useState('javascript')
  const [executionInput, setExecutionInput] = useState('')
  const [executionJobId, setExecutionJobId] = useState('')
  const [executionState, setExecutionState] = useState('idle')
  const [executionResult, setExecutionResult] = useState(null)
  const [executionError, setExecutionError] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatDraft, setChatDraft] = useState('')
  const [sessionNotice, setSessionNotice] = useState('')
  const [pendingSwapRequest, setPendingSwapRequest] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [roomOccupancy, setRoomOccupancy] = useState(1)
  const [leftPaneWidth, setLeftPaneWidth] = useState(28)
  const [rightPaneWidth, setRightPaneWidth] = useState(31)

  const workspaceRef = useRef(null)
  const dragTargetRef = useRef(null)
  const hasSeenPeerRef = useRef(false)
  const hasExitedSessionRef = useRef(false)
  const executionRequestIdRef = useRef(0)

  const roomId = sessionConfig?.roomId ?? ''
  const participantId = sessionConfig?.userId ?? ''
  const displayName = sessionConfig?.displayName ?? ''
  const isSessionActive = Boolean(sessionConfig)
  const isInterviewer = currentRole === 'interviewer'

  const {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    remoteUserId,
    audioEnabled,
    videoEnabled,
    remoteMediaState,
    participantCount,
    isDataChannelOpen,
    lastPeerEvent,
    error,
    toggleAudio,
    toggleVideo,
    sendPeerEvent,
    leaveRoom,
  } = useWebRTC(roomId, participantId, displayName)

  const liveParticipantCount = Math.max(participantCount, roomOccupancy)
  const isExecutionBusy = ['queueing', 'queued', 'waiting', 'active'].includes(executionState)
  const executionStateLabel = getExecutionStateLabel(executionState)
  const executionOutcomeLabel = executionResult ? getExecutionOutcomeLabel(executionResult) : null
  const selectedLanguageLabel = getLanguageLabel(executionLanguage)
  const isExecutionOutputEmpty = executionResult
    && executionResult.outcome === 'success'
    && !executionResult.stdout
    && !executionResult.stderr
  const inviteLink = useMemo(
    () => buildInviteLink(isSessionActive ? roomId : draftRoomId),
    [draftRoomId, isSessionActive, roomId],
  )

  const sendSessionSnapshot = useCallback(() => {
    if (!isSessionActive || !isInterviewer) {
      return
    }

    sendPeerEvent('session-sync', {
      problemTitle,
      problemBody,
      language: executionLanguage,
      code,
      codeSnapshots: codeByLanguage,
      chatMessages,
    })
  }, [
    chatMessages,
    code,
    codeByLanguage,
    executionLanguage,
    isInterviewer,
    isSessionActive,
    problemBody,
    problemTitle,
    sendPeerEvent,
  ])

  const exitToFeedback = useCallback(
    (reason, endedBy = remoteUserId || 'Peer') => {
      if (hasExitedSessionRef.current || !isSessionActive) {
        return
      }

      hasExitedSessionRef.current = true
      leaveRoom()

      navigate('/feedback', {
        state: {
          sessionType: 'p2p',
          roomId,
          userId: displayName,
          interviewer: {
            name: endedBy,
          },
          peerName: endedBy,
          role: currentRole,
          duration: formatElapsedTime(elapsedSeconds),
          reason,
        },
      })
    },
    [currentRole, displayName, elapsedSeconds, isSessionActive, leaveRoom, navigate, remoteUserId, roomId],
  )

  useEffect(() => {
    return () => {
      executionRequestIdRef.current += 1
    }
  }, [])

  useEffect(() => {
    if (!isSessionActive) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((currentValue) => currentValue + 1)
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isSessionActive])

  useEffect(() => {
    if (!sessionNotice) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSessionNotice('')
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [sessionNotice])

  useEffect(() => {
    if (liveParticipantCount > 1 || remoteUserId || isConnected) {
      hasSeenPeerRef.current = true
    }
  }, [isConnected, liveParticipantCount, remoteUserId])

  useEffect(() => {
    if (!isSessionActive) {
      hasSeenPeerRef.current = false
      hasExitedSessionRef.current = false
      return
    }

    let ignore = false
    let intervalId

    const pollRoomState = async () => {
      try {
        const response = await fetch(`${SIGNALING_URL}/api/rooms/${roomId}`)

        if (!response.ok) {
          return
        }

        const data = await response.json()

        if (ignore) {
          return
        }

        const nextCount = data.count ?? data.participants?.length ?? 1
        setRoomOccupancy(nextCount)

        if (hasSeenPeerRef.current && nextCount < 2) {
          exitToFeedback('The other peer is no longer active in this room.')
        }
      } catch {
        if (!ignore) {
          setSessionNotice((currentNotice) => (
            currentNotice || 'WebRTC signaling service is offline. Start webrtc-service and wait a few seconds.'
          ))
        }
      }
    }

    pollRoomState()

    intervalId = window.setInterval(pollRoomState, ROOM_POLL_INTERVAL)

    return () => {
      ignore = true
      window.clearInterval(intervalId)
    }
  }, [exitToFeedback, isSessionActive, roomId])

  useEffect(() => {
    if (isDataChannelOpen && isInterviewer) {
      sendSessionSnapshot()
    }
  }, [isDataChannelOpen, isInterviewer, sendSessionSnapshot])

  const handlePeerEvent = useEffectEvent((peerEvent) => {
    const { type, payload, senderId } = peerEvent

    if (type === 'session-sync') {
      const nextLanguage = normalizeExecutionLanguage(payload?.language)

      if (typeof payload?.problemTitle === 'string') {
        setProblemTitle(payload.problemTitle)
      }

      if (typeof payload?.problemBody === 'string') {
        setProblemBody(payload.problemBody)
      }

      if (payload?.codeSnapshots && typeof payload.codeSnapshots === 'object') {
        setCodeByLanguage({
          ...createExecutionStarterCodeByLanguage(),
          ...payload.codeSnapshots,
        })
      }

      setExecutionLanguage(nextLanguage)

      if (typeof payload?.code === 'string') {
        setCode(payload.code)
        setCodeByLanguage((currentCodeByLanguage) => ({
          ...currentCodeByLanguage,
          [nextLanguage]: payload.code,
        }))
      } else {
        setCode(getExecutionStarterCode(nextLanguage))
      }

      if (Array.isArray(payload?.chatMessages) && payload.chatMessages.length > 0) {
        setChatMessages((currentMessages) => mergeMessages(currentMessages, payload.chatMessages))
      }

      return
    }

    if (type === 'problem-update') {
      if (typeof payload?.problemTitle === 'string') {
        setProblemTitle(payload.problemTitle)
      }

      if (typeof payload?.problemBody === 'string') {
        setProblemBody(payload.problemBody)
      }

      return
    }

    if (type === 'code-update' && typeof payload?.code === 'string') {
      const nextLanguage = normalizeExecutionLanguage(payload?.language)
      setExecutionLanguage(nextLanguage)
      setCode(payload.code)
      setCodeByLanguage((currentCodeByLanguage) => ({
        ...currentCodeByLanguage,
        [nextLanguage]: payload.code,
      }))
      return
    }

    if (type === 'chat-message' && payload?.message) {
      setChatMessages((currentMessages) => mergeMessages(currentMessages, [payload.message]))
      return
    }

    if (type === 'role-swap-request') {
      setPendingSwapRequest({
        senderId,
      })
      setSessionNotice('Role swap requested.')
      return
    }

    if (type === 'role-swap-response') {
      if (payload?.accepted) {
        setCurrentRole((role) => (role === 'interviewer' ? 'interviewee' : 'interviewer'))
        setSessionNotice('Role swap accepted.')
      } else {
        setSessionNotice('Role swap declined.')
      }

      return
    }

    if (type === 'session-ended') {
      exitToFeedback(payload?.reason || 'Your peer ended the session.', senderId)
      return
    }

    if (type === 'peer-disconnected') {
      exitToFeedback('Your peer disconnected from the room.', senderId)
    }
  })

  useEffect(() => {
    if (!lastPeerEvent) {
      return
    }

    handlePeerEvent(lastPeerEvent)
  }, [lastPeerEvent])

  useEffect(() => {
    if (!workspaceRef.current) {
      return undefined
    }

    const handlePointerMove = (event) => {
      if (!dragTargetRef.current || !workspaceRef.current) {
        return
      }

      const bounds = workspaceRef.current.getBoundingClientRect()

      if (dragTargetRef.current === 'left') {
        const maxLeftWidth = 100 - rightPaneWidth - MIN_CENTER_WIDTH
        const nextLeftWidth = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 20, maxLeftWidth)
        setLeftPaneWidth(nextLeftWidth)
      }

      if (dragTargetRef.current === 'right') {
        const maxRightWidth = 100 - leftPaneWidth - MIN_CENTER_WIDTH
        const nextRightWidth = clamp(((bounds.right - event.clientX) / bounds.width) * 100, 24, maxRightWidth)
        setRightPaneWidth(nextRightWidth)
      }
    }

    const handlePointerUp = () => {
      dragTargetRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [leftPaneWidth, rightPaneWidth])

  const handleCreateOrJoin = () => {
    const nextRoomId = draftRoomId.trim() || generateCallId()
    const nextRole = draftRole === 'interviewee' ? 'interviewee' : 'interviewer'
    const nextDisplayName = draftName.trim() || (nextRole === 'interviewer' ? 'Interviewer' : 'Interviewee')
    const nextUserId = generateParticipantId(nextDisplayName)
    const nextCodeByLanguage = createExecutionStarterCodeByLanguage()

    setDraftRoomId(nextRoomId)
    setCurrentRole(nextRole)
    setProblemTitle(defaultProblemTitle)
    setProblemBody(defaultProblemBody)
    setCodeByLanguage(nextCodeByLanguage)
    setCode(nextCodeByLanguage.javascript)
    setExecutionLanguage('javascript')
    setExecutionInput('')
    setExecutionJobId('')
    setExecutionState('idle')
    setExecutionResult(null)
    setExecutionError('')
    executionRequestIdRef.current += 1
    setChatMessages([
      buildMessage({
        authorId: 'system',
        authorName: 'System',
        text: 'Invite your peer and start once both participants are connected.',
        kind: 'system',
      }),
    ])
    setChatDraft('')
    setPendingSwapRequest(null)
    setElapsedSeconds(0)
    setRoomOccupancy(1)
    hasExitedSessionRef.current = false
    hasSeenPeerRef.current = false

    setSessionConfig({
      roomId: nextRoomId,
      userId: nextUserId,
      displayName: nextDisplayName,
    })

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('room', nextRoomId)
    nextParams.set('role', nextRole)
    setSearchParams(nextParams, { replace: true })
  }

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setSessionNotice('Invite link copied.')
    } catch {
      setSessionNotice('Clipboard is unavailable. Share the room ID manually.')
    }
  }

  const handleProblemTitleChange = (event) => {
    const nextTitle = event.target.value
    setProblemTitle(nextTitle)
    sendPeerEvent('problem-update', {
      problemTitle: nextTitle,
      problemBody,
    })
  }

  const handleProblemBodyChange = (event) => {
    const nextBody = event.target.value
    setProblemBody(nextBody)
    sendPeerEvent('problem-update', {
      problemTitle,
      problemBody: nextBody,
    })
  }

  const handleCodeChange = (event) => {
    const nextCode = event.target.value
    setCode(nextCode)
    setCodeByLanguage((currentCodeByLanguage) => ({
      ...currentCodeByLanguage,
      [executionLanguage]: nextCode,
    }))
    sendPeerEvent('code-update', {
      language: executionLanguage,
      code: nextCode,
    })
  }

  const handleExecutionLanguageChange = (event) => {
    const nextLanguage = normalizeExecutionLanguage(event.target.value)
    const nextCode = codeByLanguage[nextLanguage] || getExecutionStarterCode(nextLanguage)

    setExecutionLanguage(nextLanguage)
    setCode(nextCode)
    setExecutionJobId('')
    setExecutionState('idle')
    setExecutionResult(null)
    setExecutionError('')

    sendPeerEvent('code-update', {
      language: nextLanguage,
      code: nextCode,
    })
  }

  const handleSendMessage = (event) => {
    event.preventDefault()

    const trimmedDraft = chatDraft.trim()

    if (!trimmedDraft) {
      return
    }

    const message = buildMessage({
      authorId: participantId,
      authorName: displayName,
      text: trimmedDraft,
      kind: 'self',
    })

    setChatMessages((currentMessages) => [...currentMessages, message])
    setChatDraft('')
    sendPeerEvent('chat-message', { message })
  }

  const handleRequestRoleSwap = () => {
    if (!sendPeerEvent('role-swap-request')) {
      setSessionNotice('Role swap needs the other peer to connect first.')
      return
    }

    setSessionNotice('Role swap request sent.')
  }

  const handleRoleSwapDecision = (accepted) => {
    if (!pendingSwapRequest) {
      return
    }

    sendPeerEvent('role-swap-response', { accepted })

    if (accepted) {
      setCurrentRole((role) => (role === 'interviewer' ? 'interviewee' : 'interviewer'))
      setSessionNotice('Roles swapped.')
    } else {
      setSessionNotice('Role swap declined.')
    }

    setPendingSwapRequest(null)
  }

  const handleResetWorkspace = () => {
    const nextCodeByLanguage = createExecutionStarterCodeByLanguage()
    const nextCode = nextCodeByLanguage[executionLanguage] || getExecutionStarterCode(executionLanguage)

    setProblemTitle(defaultProblemTitle)
    setProblemBody(defaultProblemBody)
    setCodeByLanguage(nextCodeByLanguage)
    setCode(nextCode)
    setExecutionJobId('')
    setExecutionState('idle')
    setExecutionResult(null)
    setExecutionError('')
    executionRequestIdRef.current += 1

    sendPeerEvent('session-sync', {
      problemTitle: defaultProblemTitle,
      problemBody: defaultProblemBody,
      language: executionLanguage,
      code: nextCode,
      codeSnapshots: nextCodeByLanguage,
      chatMessages,
    })
  }

  const handleRunCode = async () => {
    if (!code.trim()) {
      setExecutionState('failed')
      setExecutionResult(null)
      setExecutionError('Write some code before running it.')
      return
    }

    const requestId = executionRequestIdRef.current + 1
    executionRequestIdRef.current = requestId

    setExecutionState('queueing')
    setExecutionError('')
    setExecutionResult(null)
    setExecutionJobId('')

    try {
      const queuedJob = await createExecutionJob({
        language: executionLanguage,
        sourceCode: code,
        stdin: executionInput,
      })

      if (executionRequestIdRef.current !== requestId) {
        return
      }

      setExecutionJobId(queuedJob.jobId)
      setExecutionState('queued')

      const resolvedJob = await pollExecutionJob(queuedJob.jobId, {
        timeoutMs: EXECUTION_POLL_TIMEOUT,
        onUpdate: (job) => {
          if (executionRequestIdRef.current !== requestId) {
            return
          }

          setExecutionState(job.state || 'queued')
        },
      })

      if (executionRequestIdRef.current !== requestId) {
        return
      }

      setExecutionState(resolvedJob.state || 'completed')
      setExecutionResult(resolvedJob.result ?? null)

      if (!resolvedJob.result && resolvedJob.state === 'failed') {
        setExecutionError('Execution failed before the worker returned a result.')
      }
    } catch (runError) {
      if (executionRequestIdRef.current !== requestId) {
        return
      }

      setExecutionState('failed')
      setExecutionResult(null)
      setExecutionError(runError.message || 'Unable to run code right now.')
    }
  }

  const handleLeaveSession = () => {
    executionRequestIdRef.current += 1
    sendPeerEvent('session-ended', {
      reason: `${displayName} ended the session.`,
    })

    exitToFeedback('You ended the P2P interview.', displayName)
  }

  const summaryStatus = error
    ? error
    : liveParticipantCount > 1
      ? isDataChannelOpen
        ? 'Both peers connected'
        : 'Peer joined, syncing state'
      : 'Waiting for a peer to join'

  if (!isSessionActive) {
    return (
      <div className="page">
        <div className="container p2p-lobby-shell">
          <header className="top-nav">
            <div className="brand">
              <span className="brand-dot" />
              <span>Talent IQ</span>
            </div>

            <nav className="nav-links">
              <Link to="/" className="btn btn-ghost">Dashboard</Link>
            </nav>
          </header>

          <section className="p2p-lobby-grid">
            <article className="card p2p-lobby-card">
              <span className="badge">P2P Interview Workspace</span>
              <h1 className="p2p-lobby-title">Start or join a live peer interview</h1>
              <p className="p2p-lobby-copy">
                Share one room link, connect over WebRTC, and collaborate on the same coding round.
              </p>

              <div className="p2p-form-grid">
                <label className="p2p-field">
                  <span>Your display name</span>
                  <input
                    className="input"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="Enter the name your peer should see"
                  />
                </label>

                <label className="p2p-field">
                  <span>Room ID</span>
                  <div className="p2p-inline-input">
                    <input
                      className="input"
                      value={draftRoomId}
                      onChange={(event) => setDraftRoomId(event.target.value)}
                      placeholder="Share this with your peer"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setDraftRoomId(generateCallId())}
                    >
                      Regenerate
                    </button>
                  </div>
                </label>
              </div>

              <div className="p2p-role-grid">
                <button
                  type="button"
                  className={`p2p-role-card ${draftRole === 'interviewer' ? 'active' : ''}`}
                  onClick={() => setDraftRole('interviewer')}
                >
                  <strong>Interviewer</strong>
                  <span>Controls the prompt and can end the round.</span>
                </button>

                <button
                  type="button"
                  className={`p2p-role-card ${draftRole === 'interviewee' ? 'active' : ''}`}
                  onClick={() => setDraftRole('interviewee')}
                >
                  <strong>Interviewee</strong>
                  <span>Codes live and can request a role swap at any time.</span>
                </button>
              </div>

              <div className="hero-actions p2p-lobby-actions">
                <button type="button" className="btn btn-primary" onClick={handleCreateOrJoin}>
                  Enter Room
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleCopyInviteLink}>
                  Copy Invite Link
                </button>
              </div>
            </article>

            <article className="card p2p-lobby-card p2p-lobby-card--secondary">
              <h2>How the room works</h2>
              <div className="structure-list">
                <div className="structure-item">
                  <span className="structure-dot" />
                  <div>
                    <p className="structure-phase">One invite link</p>
                    <p className="structure-meta">Use the generated room ID to bring a second peer into the session.</p>
                  </div>
                </div>

                <div className="structure-item">
                  <span className="structure-dot" />
                  <div>
                    <p className="structure-phase">Shared editor</p>
                    <p className="structure-meta">Code, problem notes, and chat sync over the peer data channel.</p>
                  </div>
                </div>

                <div className="structure-item">
                  <span className="structure-dot" />
                  <div>
                    <p className="structure-phase">Role swap</p>
                    <p className="structure-meta">Switch interviewer and interviewee without leaving the room.</p>
                  </div>
                </div>
              </div>

              <div className="challenge-box p2p-problem-preview">
                <strong>Preview problem</strong>
                <p>{defaultProblemTitle}</p>
                <p className="prompt-copy">{mockInterviewPrompt}</p>
              </div>
            </article>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container p2p-container">
        <header className="top-nav p2p-top-nav">
          <div className="brand">
            <span className="brand-dot" />
            <span>Talent IQ</span>
          </div>

          <nav className="nav-links p2p-top-actions">
            <span className="session-pill">Room: {roomId}</span>
            <span className="timer-pill">{formatElapsedTime(elapsedSeconds)}</span>
            <span className={`p2p-status-pill ${error ? 'error' : ''}`}>{summaryStatus}</span>
            <button type="button" className="btn btn-ghost" onClick={handleCopyInviteLink}>
              Copy Invite
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleRequestRoleSwap}>
              Request Role Swap
            </button>
            <button type="button" className="btn btn-danger" onClick={handleLeaveSession}>
              {isInterviewer ? 'End Session' : 'Leave Session'}
            </button>
          </nav>
        </header>

        {sessionNotice ? (
          <div className="challenge-box p2p-banner">
            <strong>Session update</strong>
            <p>{sessionNotice}</p>
          </div>
        ) : null}

        {pendingSwapRequest ? (
          <div className="challenge-box p2p-banner p2p-banner--interactive">
            <div>
              <strong>Role swap request</strong>
              <p>{remoteUserId || 'Your peer'} wants to switch roles for the remainder of the round.</p>
            </div>

            <div className="nav-links">
              <button type="button" className="btn btn-ghost" onClick={() => handleRoleSwapDecision(false)}>
                Decline
              </button>
              <button type="button" className="btn btn-primary" onClick={() => handleRoleSwapDecision(true)}>
                Accept
              </button>
            </div>
          </div>
        ) : null}

        <section className="p2p-workspace" ref={workspaceRef}>
          <aside className="panel p2p-pane p2p-pane--left" style={{ width: `${leftPaneWidth}%` }}>
            <div className="panel-header p2p-pane-header">
              <div>
                <p className="header-title">Problem Brief</p>
                <p className="header-status">{isInterviewer ? 'INTERVIEWER CONTROLS' : 'READ ONLY'}</p>
              </div>
              <span className="session-pill">{currentRole}</span>
            </div>

            <div className="panel-body stack p2p-pane-body">
              <div className="challenge-box">
                <strong>Session Roles</strong>
                <div className="p2p-role-summary">
                  <span>You: {displayName}</span>
                  <span>{isInterviewer ? 'Interviewer' : 'Interviewee'}</span>
                </div>
                <div className="p2p-role-summary">
                  <span>Peer: {remoteUserId || 'Waiting...'}</span>
                  <span>{isInterviewer ? 'Interviewee' : 'Interviewer'}</span>
                </div>
              </div>

              <label className="p2p-field">
                <span>Problem title</span>
                <input
                  className="input"
                  value={problemTitle}
                  onChange={handleProblemTitleChange}
                  readOnly={!isInterviewer}
                />
              </label>

              <label className="p2p-field">
                <span>Prompt and follow ups</span>
                <textarea
                  className="p2p-problem-textarea"
                  value={problemBody}
                  onChange={handleProblemBodyChange}
                  readOnly={!isInterviewer}
                />
              </label>

              <div className="challenge-box">
                <strong>Live session checklist</strong>
                <div className="structure-list">
                  <div className="structure-item">
                    <span className="structure-dot" />
                    <div>
                      <p className="structure-phase">Pair connection</p>
                      <p className="structure-meta">{liveParticipantCount}/2 participant(s) currently in the room.</p>
                    </div>
                  </div>
                  <div className="structure-item">
                    <span className="structure-dot" />
                    <div>
                      <p className="structure-phase">Editor sync</p>
                      <p className="structure-meta">{isDataChannelOpen ? 'Peer data channel is live.' : 'Waiting for peer data channel.'}</p>
                    </div>
                  </div>
                  <div className="structure-item">
                    <span className="structure-dot" />
                    <div>
                      <p className="structure-phase">Room policy</p>
                      <p className="structure-meta">Only the interviewer can change the prompt or end the round.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <button
            type="button"
            className="p2p-divider"
            aria-label="Resize problem panel"
            onPointerDown={() => {
              dragTargetRef.current = 'left'
            }}
          />

          <main className="panel p2p-pane p2p-pane--center">
            <div className="panel-header p2p-pane-header">
              <div>
                <p className="header-title">Collaborative Editor</p>
                <p className="header-status">{isDataChannelOpen ? 'LIVE SYNC' : 'LOCAL DRAFT'}</p>
              </div>

              <div className="nav-links">
                <label className="p2p-language-picker">
                  <span className="p2p-language-label">Language</span>
                  <select
                    className="p2p-language-select"
                    value={executionLanguage}
                    onChange={handleExecutionLanguageChange}
                    disabled={isExecutionBusy}
                  >
                    {EXECUTION_LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRunCode}
                  disabled={isExecutionBusy}
                >
                  {isExecutionBusy ? 'Running...' : 'Run Code'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleResetWorkspace}
                  disabled={!isInterviewer}
                >
                  Reset Round
                </button>
              </div>
            </div>

            <div className="p2p-editor-shell">
              <textarea
                className="p2p-editor"
                value={code}
                onChange={handleCodeChange}
                spellCheck={false}
              />
            </div>

            <div className="panel-body stack">
              <div className="challenge-box p2p-run-shell">
                <div className="p2p-run-header">
                  <div>
                    <strong>Sandbox Output</strong>
                    <p className="prompt-copy">
                      Submit the current {selectedLanguageLabel} solution to the backend execution worker.
                    </p>
                  </div>
                  <span className={`session-pill p2p-run-pill ${executionState === 'failed' ? 'is-error' : ''}`}>
                    {executionStateLabel}
                  </span>
                </div>

                <label className="p2p-field">
                  <span>stdin</span>
                  <textarea
                    className="p2p-stdin-textarea"
                    value={executionInput}
                    onChange={(event) => setExecutionInput(event.target.value)}
                    placeholder="Optional standard input passed to the program"
                  />
                </label>

                {executionJobId ? (
                  <div className="p2p-run-meta">Job ID: {executionJobId}</div>
                ) : null}

                {executionError ? (
                  <div className="p2p-run-error">{executionError}</div>
                ) : null}

                {executionResult ? (
                  <div className="p2p-run-results">
                    <div className="p2p-run-summary">
                      <span className="session-pill">{executionOutcomeLabel}</span>
                      <span className="session-pill">{selectedLanguageLabel}</span>
                      <span className="session-pill">{executionResult.durationMs ?? 0} ms</span>
                      {executionResult.exitCode !== null && executionResult.exitCode !== undefined ? (
                        <span className="session-pill">Exit {executionResult.exitCode}</span>
                      ) : null}
                    </div>

                    {isExecutionOutputEmpty ? (
                      <div className="p2p-run-note">
                        The program finished successfully, but it did not print anything. This runner only shows
                        stdout/stderr, so function-only solutions need a small `console.log`/`print` wrapper to
                        produce visible output.
                      </div>
                    ) : null}

                    <div className="p2p-terminal">
                      <strong>stdout</strong>
                      <pre>{executionResult.stdout || '(empty)'}</pre>
                    </div>

                    <div className="p2p-terminal">
                      <strong>stderr</strong>
                      <pre>{executionResult.stderr || '(empty)'}</pre>
                    </div>
                  </div>
                ) : (
                  <p className="prompt-copy">
                    No sandbox output yet. Run the editor contents to surface compilation errors, runtime errors, or program output.
                  </p>
                )}
              </div>

              <div className="challenge-box">
                <strong>Interview flow</strong>
                <p className="prompt-copy">
                  Use chat for hints and clarifications, keep the camera open, and use role swap when you want to switch who drives the round.
                </p>
              </div>
            </div>
          </main>

          <button
            type="button"
            className="p2p-divider"
            aria-label="Resize collaboration panel"
            onPointerDown={() => {
              dragTargetRef.current = 'right'
            }}
          />

          <aside className="panel p2p-pane p2p-pane--right" style={{ width: `${rightPaneWidth}%` }}>
            <div className="panel-header p2p-pane-header">
              <div>
                <p className="header-title">Video and Chat</p>
                <p className="header-status">{remoteUserId ? `Connected to ${remoteUserId}` : 'WAITING FOR PEER'}</p>
              </div>
            </div>

            <div className="panel-body stack p2p-pane-body">
              <div className="p2p-video-grid">
                <div className="p2p-video-card">
                  <video ref={localVideoRef} autoPlay muted playsInline />
                  <div className="p2p-video-meta">
                    <span>{displayName}</span>
                    <span>{videoEnabled ? 'Camera on' : 'Camera off'}</span>
                  </div>
                </div>

                <div className="p2p-video-card">
                  <video ref={remoteVideoRef} autoPlay playsInline />
                  <div className="p2p-video-meta">
                    <span>{remoteUserId || 'Waiting for peer'}</span>
                    <span>{remoteMediaState.video ? 'Camera on' : 'Camera off'}</span>
                  </div>
                  {!remoteUserId ? (
                    <div className="p2p-video-placeholder">Share the invite link and have your peer join this room.</div>
                  ) : null}
                </div>
              </div>

              <div className="nav-links p2p-control-row">
                <button type="button" className={`btn btn-ghost ${audioEnabled ? '' : 'p2p-control-off'}`} onClick={toggleAudio}>
                  {audioEnabled ? 'Mute mic' : 'Unmute mic'}
                </button>
                <button type="button" className={`btn btn-ghost ${videoEnabled ? '' : 'p2p-control-off'}`} onClick={toggleVideo}>
                  {videoEnabled ? 'Stop camera' : 'Start camera'}
                </button>
              </div>

              <div className="challenge-box p2p-chat-shell">
                <div className="p2p-chat-header">
                  <strong>Chat</strong>
                  <span>{isDataChannelOpen ? 'Live' : 'Offline'}</span>
                </div>

                <div className="chat-list p2p-chat-list">
                  {chatMessages.map((message) => (
                    <article
                      key={message.id}
                      className={`chat-msg ${message.authorId === participantId ? 'me' : ''} ${message.kind === 'system' ? 'p2p-chat-system' : ''}`}
                    >
                      <div className="p2p-chat-author">{message.authorName}</div>
                      <p className="chat-copy">{message.text}</p>
                      <div className="chat-time">{message.time}</div>
                    </article>
                  ))}
                </div>

                <form className="p2p-chat-form" onSubmit={handleSendMessage}>
                  <input
                    className="input"
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder="Send a question, hint, or follow up"
                  />
                  <button type="submit" className="btn btn-primary">
                    Send
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
