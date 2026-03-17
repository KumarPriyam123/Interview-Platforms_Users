import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import Peer from 'peerjs'

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:9000'
const PEERJS_URL = import.meta.env.VITE_PEERJS_URL || 'http://localhost:9001'
const DEFAULT_REMOTE_MEDIA_STATE = { audio: true, video: true }
const SERVICE_RETRY_DELAY = 3000

function getPeerConfig() {
  const peerUrl = new URL(PEERJS_URL)

  return {
    host: peerUrl.hostname,
    port: peerUrl.port,
    path: '/peerjs',
    secure: peerUrl.protocol === 'https:',
  }
}

export function useWebRTC(roomId, userId, displayName = userId) {
  const [isConnected, setIsConnected] = useState(false)
  const [remoteUserId, setRemoteUserId] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [remoteMediaState, setRemoteMediaState] = useState(DEFAULT_REMOTE_MEDIA_STATE)
  const [participantCount, setParticipantCount] = useState(1)
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false)
  const [lastPeerEvent, setLastPeerEvent] = useState(null)
  const [error, setError] = useState(null)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerRef = useRef(null)
  const socketRef = useRef(null)
  const localStreamRef = useRef(null)
  const currentCallRef = useRef(null)
  const dataConnectionRef = useRef(null)
  const peerEventIdRef = useRef(0)
  const retryTimeoutRef = useRef(null)
  const [retryNonce, setRetryNonce] = useState(0)

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      return
    }

    retryTimeoutRef.current = window.setTimeout(() => {
      retryTimeoutRef.current = null
      setRetryNonce((currentValue) => currentValue + 1)
    }, SERVICE_RETRY_DELAY)
  }, [])

  const setServiceOfflineError = useCallback(() => {
    setError(`WebRTC service is offline. Start webrtc-service on ${SIGNALING_URL} and ${PEERJS_URL}.`)
    scheduleRetry()
  }, [scheduleRetry])

  const publishPeerEvent = useCallback((message) => {
    peerEventIdRef.current += 1

    setLastPeerEvent({
      id: peerEventIdRef.current,
      ...message,
    })
  }, [])

  const clearRemoteMedia = useCallback(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    setIsConnected(false)
    setIsDataChannelOpen(false)
    setRemoteUserId(null)
    setParticipantCount(1)
    setAudioEnabled(true)
    setVideoEnabled(true)
    setRemoteMediaState(DEFAULT_REMOTE_MEDIA_STATE)
    setError(null)
  }, [])

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      return stream
    } catch {
      setError('Camera or microphone access was denied.')
      return null
    }
  }, [])

  const attachRemoteStream = useCallback((remoteStream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }

    setIsConnected(true)
  }, [])

  const bindCallEvents = useCallback(
    (call) => {
      currentCallRef.current = call

      call.on('stream', attachRemoteStream)

      call.on('close', () => {
        if (currentCallRef.current === call) {
          currentCallRef.current = null
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null
        }

        setIsConnected(false)
      })

      call.on('error', () => {
        setError('The video connection failed.')
      })
    },
    [attachRemoteStream],
  )

  const bindDataConnection = useCallback(
    (connection) => {
      if (!connection) {
        return
      }

      if (dataConnectionRef.current && dataConnectionRef.current !== connection) {
        dataConnectionRef.current.close()
      }

      dataConnectionRef.current = connection

      connection.on('open', () => {
        setIsDataChannelOpen(true)
      })

      connection.on('data', (message) => {
        if (!message || typeof message !== 'object' || !message.type) {
          return
        }

        publishPeerEvent(message)
      })

      connection.on('close', () => {
        if (dataConnectionRef.current === connection) {
          dataConnectionRef.current = null
        }

        setIsDataChannelOpen(false)
      })

      connection.on('error', () => {
        setError('The peer sync channel failed.')
      })
    },
    [publishPeerEvent],
  )

  const callPeer = useCallback(
    (remotePeerId, stream) => {
      if (!peerRef.current || !stream) {
        return
      }

      if (currentCallRef.current) {
        currentCallRef.current.close()
      }

      const call = peerRef.current.call(remotePeerId, stream)
      bindCallEvents(call)
    },
    [bindCallEvents],
  )

  const connectDataChannel = useCallback(
    (remotePeerId) => {
      if (!peerRef.current) {
        return
      }

      if (dataConnectionRef.current?.peer === remotePeerId && dataConnectionRef.current.open) {
        return
      }

      const connection = peerRef.current.connect(remotePeerId, {
        reliable: true,
      })

      bindDataConnection(connection)
    },
    [bindDataConnection],
  )

  const answerCall = useCallback(
    (call, stream) => {
      call.answer(stream)
      bindCallEvents(call)
    },
    [bindCallEvents],
  )

  useEffect(() => {
    if (!roomId || !userId) {
      return undefined
    }

    let destroyed = false

    const init = async () => {
      try {
        const healthResponse = await fetch(`${SIGNALING_URL}/health`)

        if (!healthResponse.ok) {
          setServiceOfflineError()
          return
        }
      } catch {
        setServiceOfflineError()
        return
      }

      clearRetryTimeout()
      setError(null)

      const stream = await getLocalStream()

      if (!stream || destroyed) {
        return
      }

      let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]

      try {
        const response = await fetch(`${SIGNALING_URL}/api/ice-servers`)
        const data = await response.json()

        if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          iceServers = data.iceServers
        }
      } catch {
        // Default STUN is enough for local development.
      }

      const peer = new Peer(undefined, {
        ...getPeerConfig(),
        config: { iceServers },
      })

      peerRef.current = peer

      peer.on('open', (peerId) => {
        if (destroyed) {
          return
        }

        const socket = io(SIGNALING_URL, {
          transports: ['websocket'],
          withCredentials: true,
        })

        socketRef.current = socket

        socket.on('connect', () => {
          socket.emit('join-room', { roomId, userId, peerId, displayName })
        })

        socket.on('room-joined', ({ participants = [] }) => {
          setParticipantCount(Math.max(participants.length, 1))

          const remoteParticipant = participants.find((participant) => participant.userId !== userId)

          if (remoteParticipant?.userId) {
            setRemoteUserId(remoteParticipant.displayName || remoteParticipant.userId)
          }
        })

        socket.on('user-connected', ({ peerId: remotePeerId, userId: remoteUid, displayName: remoteDisplayName, participants = [] }) => {
          setRemoteUserId(remoteDisplayName || remoteUid)
          setParticipantCount(Math.max(participants.length, 2))
          callPeer(remotePeerId, stream)
          connectDataChannel(remotePeerId)
        })

        socket.on('user-disconnected', ({ userId: remoteUid, displayName: remoteDisplayName }) => {
          if (currentCallRef.current) {
            currentCallRef.current.close()
          }

          if (dataConnectionRef.current) {
            dataConnectionRef.current.close()
          }

          clearRemoteMedia()

          publishPeerEvent({
            type: 'peer-disconnected',
            senderId: remoteDisplayName || remoteUid,
            timestamp: Date.now(),
          })
        })

        socket.on('media-toggled', ({ type, enabled }) => {
          if (!type) {
            return
          }

          setRemoteMediaState((currentState) => ({
            ...currentState,
            [type]: enabled,
          }))
        })

        socket.on('room-full', ({ message }) => {
          setError(message)
        })

        socket.on('error', ({ message }) => {
          setError(message)
        })
      })

      peer.on('call', (call) => {
        answerCall(call, stream)
      })

      peer.on('connection', (connection) => {
        bindDataConnection(connection)
      })

      peer.on('error', (peerError) => {
        if (peerError.type === 'server-error') {
          setServiceOfflineError()
          return
        }

        setError(`PeerJS: ${peerError.type}`)
      })
    }

    init()

    return () => {
      destroyed = true

      if (currentCallRef.current) {
        currentCallRef.current.close()
        currentCallRef.current = null
      }

      if (dataConnectionRef.current) {
        dataConnectionRef.current.close()
        dataConnectionRef.current = null
      }

      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }

      if (peerRef.current) {
        peerRef.current.destroy()
        peerRef.current = null
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null
      }

      clearRetryTimeout()
      clearRemoteMedia()
    }
  }, [
    answerCall,
    bindDataConnection,
    callPeer,
    clearRetryTimeout,
    clearRemoteMedia,
    connectDataChannel,
    getLocalStream,
    publishPeerEvent,
    retryNonce,
    setServiceOfflineError,
    displayName,
    roomId,
    userId,
  ])

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) {
      return
    }

    const track = localStreamRef.current.getAudioTracks()[0]

    if (!track) {
      return
    }

    track.enabled = !track.enabled
    setAudioEnabled(track.enabled)

    socketRef.current?.emit('toggle-media', {
      roomId,
      userId,
      type: 'audio',
      enabled: track.enabled,
    })
  }, [roomId, userId])

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) {
      return
    }

    const track = localStreamRef.current.getVideoTracks()[0]

    if (!track) {
      return
    }

    track.enabled = !track.enabled
    setVideoEnabled(track.enabled)

    socketRef.current?.emit('toggle-media', {
      roomId,
      userId,
      type: 'video',
      enabled: track.enabled,
    })
  }, [roomId, userId])

  const sendPeerEvent = useCallback(
    (type, payload = {}) => {
      if (!type || !dataConnectionRef.current?.open) {
        return false
      }

      dataConnectionRef.current.send({
        type,
        payload,
        senderId: userId,
        timestamp: Date.now(),
      })

      return true
    },
    [userId],
  )

  const leaveRoom = useCallback(() => {
    if (currentCallRef.current) {
      currentCallRef.current.close()
      currentCallRef.current = null
    }

    if (dataConnectionRef.current) {
      dataConnectionRef.current.close()
      dataConnectionRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    clearRetryTimeout()
    clearRemoteMedia()
  }, [clearRetryTimeout, clearRemoteMedia])

  return {
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
  }
}
