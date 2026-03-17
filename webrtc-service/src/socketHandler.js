/**
 * Socket.io Event Handler
 *
 * ── Client → Server Events ──────────────────────────────────────
 *   "join-room"      { roomId, userId, peerId }
 *   "toggle-media"   { roomId, userId, type: 'audio'|'video', enabled: boolean }
 *   "disconnect"     (automatic on socket close)
 *
 * ── Server → Client Events ──────────────────────────────────────
 *   "room-joined"        { roomId, participants }
 *   "user-connected"     { peerId, userId, participants }
 *   "user-disconnected"  { peerId, userId }
 *   "media-toggled"      { userId, type, enabled }
 *   "room-full"          { message }
 *   "error"              { message }
 */

export function registerSocketHandlers(io, roomStore) {
    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // ─── JOIN ROOM ──────────────────────────────────────────
        socket.on('join-room', async ({ roomId, userId, peerId, displayName }) => {
            try {
                // Validate payload
                if (!roomId || !userId || !peerId) {
                    socket.emit('error', {
                        message: 'roomId, userId, and peerId are required.',
                    });
                    return;
                }

                // Prevent duplicate joins
                const alreadyIn = await roomStore.isUserInRoom(roomId, userId);
                if (alreadyIn) {
                    socket.emit('error', { message: 'You are already in this room.' });
                    return;
                }

                // Attempt to add user (enforces MAX_ROOM_SIZE)
                const result = await roomStore.addUserToRoom(
                    roomId,
                    socket.id,
                    userId,
                    peerId,
                    displayName || userId
                );

                if (!result.success) {
                    socket.emit('room-full', { message: result.error });
                    return;
                }

                // Join the Socket.io room (for broadcasting)
                socket.join(roomId);

                // Notify OTHER user(s) in the room that a new peer joined
                socket.to(roomId).emit('user-connected', {
                    peerId,
                    userId,
                    displayName: displayName || userId,
                    participants: result.participants,
                });

                // Confirm to the joining user
                socket.emit('room-joined', {
                    roomId,
                    participants: result.participants,
                });

                console.log(
                    `[Room ${roomId}] ${userId} joined (peer: ${peerId}) — ` +
                    `${result.participants.length} participant(s)`
                );
            } catch (err) {
                console.error('[join-room] Error:', err);
                socket.emit('error', { message: 'Failed to join room.' });
            }
        });

        // ─── TOGGLE MEDIA (mute/unmute audio or video) ──────────
        socket.on('toggle-media', ({ roomId, userId, type, enabled }) => {
            if (!roomId || !userId || !type) return;

            // Broadcast to the other peer so they can update UI
            socket.to(roomId).emit('media-toggled', {
                userId,
                type,     // 'audio' | 'video'
                enabled,  // true | false
            });
        });

        // ─── DISCONNECT ─────────────────────────────────────────
        socket.on('disconnect', async () => {
            try {
                const { roomId, removedUser, participants } =
                    await roomStore.removeUser(socket.id);

                if (roomId && removedUser) {
                    // Tell the remaining peer to tear down the video stream
                    socket.to(roomId).emit('user-disconnected', {
                        peerId: removedUser.peerId,
                        userId: removedUser.userId,
                        displayName: removedUser.displayName || removedUser.userId,
                    });

                    console.log(
                        `[Room ${roomId}] ${removedUser.userId} disconnected — ` +
                        `${participants.length} remaining`
                    );
                }
            } catch (err) {
                console.error('[disconnect] Error:', err);
            }

            console.log(`[Socket] Disconnected: ${socket.id}`);
        });
    });
}
