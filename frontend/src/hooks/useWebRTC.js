import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:9000';
const PEERJS_URL = import.meta.env.VITE_PEERJS_URL || 'http://localhost:9001';

/**
 * useWebRTC — manages the full lifecycle of a WebRTC video call.
 *
 * @param {string} roomId   - Interview room ID
 * @param {string} userId   - Current user's ID
 * @returns {object}        - refs, state, and controls for the call
 *
 * Usage:
 *   const {
 *     localVideoRef, remoteVideoRef,
 *     isConnected, audioEnabled, videoEnabled,
 *     toggleAudio, toggleVideo, leaveRoom, error
 *   } = useWebRTC('room-123', 'user-456');
 *
 *   <video ref={localVideoRef} autoPlay muted playsInline />
 *   <video ref={remoteVideoRef} autoPlay playsInline />
 */
export function useWebRTC(roomId, userId) {
    const [isConnected, setIsConnected] = useState(false);
    const [remoteUserId, setRemoteUserId] = useState(null);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [error, setError] = useState(null);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerRef = useRef(null);
    const socketRef = useRef(null);
    const localStreamRef = useRef(null);
    const currentCallRef = useRef(null);

    // ── Get local media stream ──────────────────────────────────
    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            setError('Camera/microphone access denied.');
            console.error('getUserMedia error:', err);
            return null;
        }
    }, []);

    // ── Call a remote peer ──────────────────────────────────────
    const callPeer = useCallback((remotePeerId, stream) => {
        if (!peerRef.current || !stream) return;

        console.log(`Calling peer: ${remotePeerId}`);
        const call = peerRef.current.call(remotePeerId, stream);
        currentCallRef.current = call;

        call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsConnected(true);
        });

        call.on('close', () => {
            setIsConnected(false);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
        });

        call.on('error', (err) => {
            console.error('Call error:', err);
            setError('Call failed.');
        });
    }, []);

    // ── Answer an incoming call ─────────────────────────────────
    const answerCall = useCallback((call, stream) => {
        console.log('Answering incoming call...');
        call.answer(stream);
        currentCallRef.current = call;

        call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsConnected(true);
        });

        call.on('close', () => {
            setIsConnected(false);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
        });
    }, []);

    // ── Main effect: init Peer + Socket ─────────────────────────
    useEffect(() => {
        if (!roomId || !userId) return;

        let destroyed = false;

        const init = async () => {
            // 1. Get camera/mic
            const stream = await getLocalStream();
            if (!stream || destroyed) return;

            // 2. Fetch ICE server config from signaling service
            let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
            try {
                const res = await fetch(`${SIGNALING_URL}/api/ice-servers`);
                const data = await res.json();
                if (data.iceServers) iceServers = data.iceServers;
            } catch {
                console.warn('Could not fetch ICE servers, using default STUN');
            }

            // 3. Initialize PeerJS (connects to PeerJS server on the signaling service)
            const peer = new Peer(undefined, {
                host: new URL(PEERJS_URL).hostname,
                port: new URL(PEERJS_URL).port,
                path: '/peerjs',
                secure: PEERJS_URL.startsWith('https'),
                config: { iceServers },
            });
            peerRef.current = peer;

            peer.on('open', (peerId) => {
                if (destroyed) return;
                console.log(`PeerJS open — my ID: ${peerId}`);

                // 4. Connect to Socket.io signaling
                const socket = io(SIGNALING_URL, {
                    transports: ['websocket'],
                    withCredentials: true,
                });
                socketRef.current = socket;

                socket.on('connect', () => {
                    console.log('Socket connected, joining room...');
                    socket.emit('join-room', { roomId, userId, peerId });
                });

                // When another user joins → WE call THEM
                socket.on('user-connected', ({ peerId: remotePeerId, userId: remoteUid }) => {
                    console.log(`User connected: ${remoteUid} (peer: ${remotePeerId})`);
                    setRemoteUserId(remoteUid);
                    callPeer(remotePeerId, stream);
                });

                // When the other user leaves
                socket.on('user-disconnected', ({ userId: remoteUid }) => {
                    console.log(`User disconnected: ${remoteUid}`);
                    setIsConnected(false);
                    setRemoteUserId(null);
                    if (currentCallRef.current) {
                        currentCallRef.current.close();
                        currentCallRef.current = null;
                    }
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }
                });

                // Media toggle from remote peer
                socket.on('media-toggled', ({ userId: uid, type, enabled }) => {
                    console.log(`${uid} toggled ${type}: ${enabled}`);
                    // Surface this in state for UI indicators if needed
                });

                // Room full
                socket.on('room-full', ({ message }) => {
                    setError(message);
                });

                // Generic error
                socket.on('error', ({ message }) => {
                    setError(message);
                });
            });

            // 5. Listen for incoming calls (the OTHER peer calls US)
            peer.on('call', (call) => {
                answerCall(call, stream);
            });

            peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                setError(`PeerJS: ${err.type}`);
            });
        };

        init();

        // ── Cleanup ───────────────────────────────────────────────
        return () => {
            destroyed = true;
            if (currentCallRef.current) currentCallRef.current.close();
            if (socketRef.current) socketRef.current.disconnect();
            if (peerRef.current) peerRef.current.destroy();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => t.stop());
            }
            setIsConnected(false);
            setRemoteUserId(null);
        };
    }, [roomId, userId, getLocalStream, callPeer, answerCall]);

    // ── Controls ────────────────────────────────────────────────
    const toggleAudio = useCallback(() => {
        if (!localStreamRef.current) return;
        const track = localStreamRef.current.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setAudioEnabled(track.enabled);
            socketRef.current?.emit('toggle-media', {
                roomId,
                userId,
                type: 'audio',
                enabled: track.enabled,
            });
        }
    }, [roomId, userId]);

    const toggleVideo = useCallback(() => {
        if (!localStreamRef.current) return;
        const track = localStreamRef.current.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setVideoEnabled(track.enabled);
            socketRef.current?.emit('toggle-media', {
                roomId,
                userId,
                type: 'video',
                enabled: track.enabled,
            });
        }
    }, [roomId, userId]);

    const leaveRoom = useCallback(() => {
        if (currentCallRef.current) currentCallRef.current.close();
        if (socketRef.current) socketRef.current.disconnect();
        if (peerRef.current) peerRef.current.destroy();
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        setIsConnected(false);
        setRemoteUserId(null);
    }, []);

    return {
        localVideoRef,
        remoteVideoRef,
        isConnected,
        remoteUserId,
        audioEnabled,
        videoEnabled,
        error,
        toggleAudio,
        toggleVideo,
        leaveRoom,
    };
}
