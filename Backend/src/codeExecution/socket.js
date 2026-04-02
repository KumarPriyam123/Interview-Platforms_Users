import { Server } from 'socket.io';
import {
    EXECUTION_SOCKET_EVENTS,
    EXECUTION_SOCKET_ROOM_PREFIX,
} from './constants.js';
import { serializeExecutionJob } from './jobSerializer.js';
import { getCodeExecutionQueue, getCodeExecutionQueueEvents } from './queue.js';

let bridgeRegistered = false;

export const getCodeExecutionRoomName = (jobId) => (
    `${EXECUTION_SOCKET_ROOM_PREFIX}${jobId}`
);

export const createCodeExecutionSocketServer = (httpServer) => (
    new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true,
            methods: ['GET', 'POST'],
        },
    })
);

export const registerCodeExecutionSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        socket.on(EXECUTION_SOCKET_EVENTS.subscribe, ({ jobId } = {}) => {
            if (!jobId) {
                return;
            }

            socket.join(getCodeExecutionRoomName(jobId));
        });

        socket.on(EXECUTION_SOCKET_EVENTS.unsubscribe, ({ jobId } = {}) => {
            if (!jobId) {
                return;
            }

            socket.leave(getCodeExecutionRoomName(jobId));
        });
    });
};

const emitExecutionUpdate = async (io, eventName, jobId) => {
    const queue = getCodeExecutionQueue();
    const job = await queue.getJob(jobId);
    const payload = job
        ? await serializeExecutionJob(job)
        : {
            jobId: String(jobId),
            state: 'missing',
            result: null,
        };

    io.to(getCodeExecutionRoomName(jobId)).emit(eventName, payload);
};

export const initializeCodeExecutionSocketBridge = async (io) => {
    const queueEvents = getCodeExecutionQueueEvents();

    await queueEvents.waitUntilReady();

    if (bridgeRegistered) {
        return;
    }

    queueEvents.on('completed', ({ jobId }) => {
        void emitExecutionUpdate(io, EXECUTION_SOCKET_EVENTS.completed, jobId);
    });

    queueEvents.on('failed', ({ jobId }) => {
        void emitExecutionUpdate(io, EXECUTION_SOCKET_EVENTS.failed, jobId);
    });

    queueEvents.on('error', (error) => {
        console.error('Code execution queue events error:', error);
    });

    bridgeRegistered = true;
};
