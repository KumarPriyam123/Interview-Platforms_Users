import { useWebRTC } from '../hooks/useWebRTC';
import './VideoRoom.css';

export default function VideoRoom({ roomId, userId, onLeave }) {
    const {
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
    } = useWebRTC(roomId, userId);

    const handleLeave = () => {
        leaveRoom();
        onLeave();
    };

    return (
        <div className="video-room">
            <div className="room-header">
                <div className="room-info">
                    <span className="room-badge">Room: {roomId}</span>
                    <span className="user-badge">You: {userId}</span>
                    <span className={`status-badge ${isConnected ? 'connected' : 'waiting'}`}>
                        {isConnected ? `Connected with ${remoteUserId}` : 'Waiting for peer...'}
                    </span>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            )}

            <div className="video-grid">
                <div className="video-container local">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                    />
                    <span className="video-label">You ({userId})</span>
                    {!videoEnabled && <div className="video-off-overlay">Camera Off</div>}
                </div>

                <div className="video-container remote">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                    />
                    {isConnected ? (
                        <span className="video-label">{remoteUserId}</span>
                    ) : (
                        <div className="waiting-overlay">
                            <div className="pulse-ring"></div>
                            <p>Waiting for peer to join...</p>
                            <p className="hint">Open this page in another tab with the same Room ID</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="controls">
                <button
                    className={`control-btn ${!audioEnabled ? 'off' : ''}`}
                    onClick={toggleAudio}
                    title={audioEnabled ? 'Mute' : 'Unmute'}
                >
                    {audioEnabled ? '🎤' : '🔇'}
                    <span>{audioEnabled ? 'Mute' : 'Unmute'}</span>
                </button>

                <button
                    className={`control-btn ${!videoEnabled ? 'off' : ''}`}
                    onClick={toggleVideo}
                    title={videoEnabled ? 'Camera Off' : 'Camera On'}
                >
                    {videoEnabled ? '📹' : '📷'}
                    <span>{videoEnabled ? 'Cam Off' : 'Cam On'}</span>
                </button>

                <button
                    className="control-btn leave"
                    onClick={handleLeave}
                    title="Leave Room"
                >
                    📞
                    <span>Leave</span>
                </button>
            </div>
        </div>
    );
}
