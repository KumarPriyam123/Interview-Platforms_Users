import {
    EXECUTION_SOCKET_EVENTS,
    EXECUTION_SOCKET_ROOM_PREFIX,
} from './constants.js';

const toIsoTimestamp = (value) => (
    typeof value === 'number' && value > 0 ? new Date(value).toISOString() : null
);

const buildFailedResult = (job) => ({
    jobId: String(job.id),
    language: job.data?.language ?? null,
    outcome: 'system_error',
    errorType: 'SYSTEM_ERROR',
    message: job.failedReason || 'Execution worker failed unexpectedly.',
    stdout: '',
    stderr: Array.isArray(job.stacktrace) ? job.stacktrace.join('\n') : '',
    exitCode: null,
    signal: null,
    timedOut: false,
    durationMs: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : null,
    startedAt: toIsoTimestamp(job.processedOn),
    completedAt: toIsoTimestamp(job.finishedOn),
    limits: null,
});

export const serializeExecutionJob = async (job) => {
    const state = await job.getState();
    let result = null;

    if (state === 'completed') {
        result = job.returnvalue ?? null;
    } else if (state === 'failed') {
        result = buildFailedResult(job);
    }

    return {
        jobId: String(job.id),
        state,
        language: job.data?.language ?? null,
        createdAt: toIsoTimestamp(job.timestamp),
        startedAt: toIsoTimestamp(job.processedOn),
        completedAt: toIsoTimestamp(job.finishedOn),
        result,
        socket: {
            room: `${EXECUTION_SOCKET_ROOM_PREFIX}${job.id}`,
            subscribeEvent: EXECUTION_SOCKET_EVENTS.subscribe,
            unsubscribeEvent: EXECUTION_SOCKET_EVENTS.unsubscribe,
            completedEvent: EXECUTION_SOCKET_EVENTS.completed,
            failedEvent: EXECUTION_SOCKET_EVENTS.failed,
        },
    };
};
