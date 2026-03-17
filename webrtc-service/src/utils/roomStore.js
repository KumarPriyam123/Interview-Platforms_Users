/**
 * Room State Management
 *
 * Uses Redis when available, falls back to in-memory Map for development.
 *
 * Redis data model per room:
 *   Hash  "room:{roomId}:users"     → { socketId: JSON({ userId, peerId, joinedAt }) }
 *   Set   "room:{roomId}:sockets"   → { socketId1, socketId2 }
 *   Hash  "socket:map"              → { socketId: roomId }   (reverse lookup for disconnect)
 */

const MAX_ROOM_SIZE = parseInt(process.env.MAX_ROOM_SIZE) || 2;
const ROOM_TTL = 60 * 60 * 24;

// ─── In-Memory Store (dev fallback) ─────────────────────────────
export function createMemoryRoomStore() {
    // rooms: Map<roomId, Map<socketId, { userId, peerId, joinedAt }>>
    const rooms = new Map();
    // socketToRoom: Map<socketId, roomId>
    const socketToRoom = new Map();

    return {
        async addUserToRoom(roomId, socketId, userId, peerId, displayName = userId) {
            if (!rooms.has(roomId)) rooms.set(roomId, new Map());
            const room = rooms.get(roomId);

            if (room.size >= MAX_ROOM_SIZE) {
                return {
                    success: false,
                    error: `Room ${roomId} is full (max ${MAX_ROOM_SIZE} participants).`,
                };
            }

            room.set(socketId, { userId, displayName, peerId, joinedAt: Date.now() });
            socketToRoom.set(socketId, roomId);

            const participants = await this.getUsersInRoom(roomId);
            return { success: true, participants };
        },

        async removeUser(socketId) {
            const roomId = socketToRoom.get(socketId);
            if (!roomId) return { roomId: null, removedUser: null, participants: [] };

            const room = rooms.get(roomId);
            const removedUser = room?.get(socketId) || null;

            room?.delete(socketId);
            socketToRoom.delete(socketId);

            if (room && room.size === 0) rooms.delete(roomId);

            const participants = await this.getUsersInRoom(roomId);
            return { roomId, removedUser, participants };
        },

        async getUsersInRoom(roomId) {
            const room = rooms.get(roomId);
            if (!room) return [];
            return Array.from(room.entries()).map(([socketId, data]) => ({
                socketId,
                ...data,
            }));
        },

        async isUserInRoom(roomId, userId) {
            const users = await this.getUsersInRoom(roomId);
            return users.some((u) => u.userId === userId);
        },
    };
}

// ─── Redis Store (production) ────────────────────────────────────
export function createRedisRoomStore(redis) {
    const roomUsersKey = (roomId) => `room:${roomId}:users`;
    const roomSocketsKey = (roomId) => `room:${roomId}:sockets`;
    const socketMapKey = 'socket:map';

    return {
        async addUserToRoom(roomId, socketId, userId, peerId, displayName = userId) {
            const currentSize = await redis.scard(roomSocketsKey(roomId));

            if (currentSize >= MAX_ROOM_SIZE) {
                return {
                    success: false,
                    error: `Room ${roomId} is full (max ${MAX_ROOM_SIZE} participants).`,
                };
            }

            const userData = JSON.stringify({ userId, displayName, peerId, joinedAt: Date.now() });

            const pipeline = redis.pipeline();
            pipeline.hset(roomUsersKey(roomId), socketId, userData);
            pipeline.sadd(roomSocketsKey(roomId), socketId);
            pipeline.hset(socketMapKey, socketId, roomId);
            pipeline.expire(roomUsersKey(roomId), ROOM_TTL);
            pipeline.expire(roomSocketsKey(roomId), ROOM_TTL);
            await pipeline.exec();

            const participants = await this.getUsersInRoom(roomId);
            return { success: true, participants };
        },

        async removeUser(socketId) {
            const roomId = await redis.hget(socketMapKey, socketId);
            if (!roomId) return { roomId: null, removedUser: null, participants: [] };

            const userData = await redis.hget(roomUsersKey(roomId), socketId);
            const parsed = userData ? JSON.parse(userData) : null;

            const pipeline = redis.pipeline();
            pipeline.hdel(roomUsersKey(roomId), socketId);
            pipeline.srem(roomSocketsKey(roomId), socketId);
            pipeline.hdel(socketMapKey, socketId);
            await pipeline.exec();

            const remaining = await redis.scard(roomSocketsKey(roomId));
            if (remaining === 0) {
                await redis.del(roomUsersKey(roomId), roomSocketsKey(roomId));
            }

            const participants = await this.getUsersInRoom(roomId);
            return { roomId, removedUser: parsed, participants };
        },

        async getUsersInRoom(roomId) {
            const usersHash = await redis.hgetall(roomUsersKey(roomId));
            return Object.entries(usersHash).map(([socketId, data]) => ({
                socketId,
                ...JSON.parse(data),
            }));
        },

        async isUserInRoom(roomId, userId) {
            const users = await this.getUsersInRoom(roomId);
            return users.some((u) => u.userId === userId);
        },
    };
}

// ─── Factory (backward compat) ──────────────────────────────────
export function createRoomStore(redisOrNull) {
    if (redisOrNull) return createRedisRoomStore(redisOrNull);
    return createMemoryRoomStore();
}
