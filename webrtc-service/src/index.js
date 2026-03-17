import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { ExpressPeerServer } from 'peer';

import { createRoomStore, createMemoryRoomStore } from './utils/roomStore.js';
import { registerSocketHandlers } from './socketHandler.js';
import iceServers from './config/iceServers.js';

// ─── Config ──────────────────────────────────────────────────────
const PORT = parseInt(process.env.SIGNALING_PORT) || 9000;
const PEER_PORT = parseInt(process.env.PEERJS_PORT) || 9001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PEERJS_PATH = process.env.PEERJS_PATH || '/peerjs';

// ─── Main Express + HTTP Server (Socket.io) ─────────────────────
const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, etc.)
        if (!origin) return callback(null, true);
        // In development, allow any localhost port
        if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        // In production, check against FRONTEND_URL
        if (origin === FRONTEND_URL) return callback(null, true);
        callback(new Error('CORS not allowed'));
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ─── Separate PeerJS Server (own port — avoids WebSocket conflict) ─
const peerApp = express();
const peerHttpServer = http.createServer(peerApp);
peerApp.use(cors(corsOptions));

const peerServer = ExpressPeerServer(peerHttpServer, {
    debug: process.env.NODE_ENV === 'development',
    path: '/',
    allow_discovery: false,
});
peerApp.use(PEERJS_PATH, peerServer);

peerServer.on('connection', (client) => {
    console.log(`[PeerJS] Peer connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
    console.log(`[PeerJS] Peer disconnected: ${client.getId()}`);
});

// ─── Redis (optional — falls back to in-memory) ─────────────────
let pubClient = null;
let subClient = null;
let redisClient = null;
let useRedis = false;

async function tryRedis() {
    try {
        const Redis = (await import('ioredis')).default;

        const redisOptions = {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
            retryStrategy: (times) => {
                if (times > 3) return null;  // stop retrying after 3 attempts
                return Math.min(times * 200, 2000);
            },
            maxRetriesPerRequest: null,
            lazyConnect: true,
        };

        const testClient = new Redis(redisOptions);
        testClient.on('error', () => {});
        await testClient.connect();
        await testClient.ping();
        await testClient.quit();

        // Redis is reachable — create production clients
        pubClient = new Redis({ ...redisOptions, lazyConnect: false });
        subClient = pubClient.duplicate();
        redisClient = pubClient.duplicate();

        console.log('✅ Redis connected — using Redis for room state & Socket.io adapter');
        return true;
    } catch {
        console.log('⚠️  Redis not available — using in-memory room store (single-instance dev mode)');
        return false;
    }
}

// ─── Bootstrap ───────────────────────────────────────────────────
async function start() {
    useRedis = await tryRedis();

    // Room store: Redis-backed or in-memory
    const roomStore = useRedis ? createRoomStore(redisClient) : createMemoryRoomStore();

    // Socket.io
    const io = new SocketIOServer(server, {
        cors: {
            origin: corsOptions.origin,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingInterval: 25000,
        pingTimeout: 20000,
    });

    // Attach Redis adapter only if Redis is available
    if (useRedis) {
        const { createAdapter } = await import('@socket.io/redis-adapter');
        io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Socket.io Redis adapter attached');
    }

    // Register socket event handlers
    registerSocketHandlers(io, roomStore);

    // ─── REST Endpoints ──────────────────────────────────────────

    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            service: 'webrtc-signaling',
            redis: useRedis ? 'connected' : 'in-memory-fallback',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    });

    app.get('/api/ice-servers', (req, res) => {
        res.json({ iceServers });
    });

    app.get('/api/rooms/:roomId', async (req, res) => {
        try {
            const participants = await roomStore.getUsersInRoom(req.params.roomId);
            res.json({
                roomId: req.params.roomId,
                participants,
                count: participants.length,
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── Start ───────────────────────────────────────────────────
    server.listen(PORT, () => {
        console.log(`\n🎥 WebRTC Signaling Service`);
        console.log(`   Socket.io:  ws://localhost:${PORT}`);
        console.log(`   Health:     http://localhost:${PORT}/health`);
        console.log(`   Redis:      ${useRedis ? 'connected' : 'off (in-memory)'}`);
        console.log(`   Env:        ${process.env.NODE_ENV}`);
    });

    peerHttpServer.listen(PEER_PORT, () => {
        console.log(`   PeerJS:     http://localhost:${PEER_PORT}${PEERJS_PATH}`);
        console.log('');
    });

    // ─── Graceful Shutdown ───────────────────────────────────────
    const shutdown = async (signal) => {
        console.log(`\n${signal} received — shutting down...`);
        io.close();
        if (useRedis) {
            await pubClient?.quit();
            await subClient?.quit();
            await redisClient?.quit();
        }
        peerHttpServer.close();
        server.close(() => {
            console.log('Goodbye!');
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
