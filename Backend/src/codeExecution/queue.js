import { Queue, QueueEvents } from 'bullmq';
import {
    CODE_EXECUTION_QUEUE_NAME,
    EXECUTION_JOB_RETENTION_SECONDS,
} from './constants.js';
import { closeRedisConnection, createRedisConnection } from './redis.js';

let queue;
let queueConnection;
let queueEvents;
let queueEventsConnection;

const defaultJobOptions = {
    attempts: 1,
    removeOnComplete: {
        age: EXECUTION_JOB_RETENTION_SECONDS,
        count: 1000,
    },
    removeOnFail: {
        age: EXECUTION_JOB_RETENTION_SECONDS * 6,
        count: 1000,
    },
};

export const getCodeExecutionQueue = () => {
    if (!queue) {
        queueConnection = createRedisConnection('code-execution-queue');
        queue = new Queue(CODE_EXECUTION_QUEUE_NAME, {
            connection: queueConnection,
            defaultJobOptions,
        });
    }

    return queue;
};

export const getCodeExecutionQueueEvents = () => {
    if (!queueEvents) {
        queueEventsConnection = createRedisConnection('code-execution-events');
        queueEvents = new QueueEvents(CODE_EXECUTION_QUEUE_NAME, {
            connection: queueEventsConnection,
        });
    }

    return queueEvents;
};

export const closeCodeExecutionQueueResources = async () => {
    const resourceClosures = [];

    if (queueEvents) {
        resourceClosures.push(queueEvents.close());
        queueEvents = null;
    }

    if (queue) {
        resourceClosures.push(queue.close());
        queue = null;
    }

    await Promise.allSettled(resourceClosures);
    await Promise.allSettled([
        closeRedisConnection(queueConnection),
        closeRedisConnection(queueEventsConnection),
    ]);

    queueConnection = null;
    queueEventsConnection = null;
};
