import {
    CODE_EXECUTION_JOB_NAME,
    EXECUTION_MAX_SOURCE_BYTES,
    EXECUTION_MAX_STDIN_BYTES,
    EXECUTION_SOCKET_EVENTS,
    EXECUTION_SOCKET_ROOM_PREFIX,
} from '../codeExecution/constants.js';
import { serializeExecutionJob } from '../codeExecution/jobSerializer.js';
import { getLanguageHandler, normalizeLanguage, SUPPORTED_LANGUAGES } from '../codeExecution/languageHandlers/index.js';
import { getCodeExecutionQueue } from '../codeExecution/queue.js';
import { ApiError } from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const assertByteLimit = (value, maxBytes, fieldName) => {
    if (Buffer.byteLength(value, 'utf8') > maxBytes) {
        throw new ApiError(413, `${fieldName} exceeds the ${maxBytes} byte limit.`);
    }
};

const withQueueUnavailableGuard = async (operation) => {
    try {
        return await operation();
    } catch (error) {
        const message = String(error?.message ?? '');

        if (
            error?.code === 'ECONNREFUSED'
            || /connect\s+econnrefused/i.test(message)
            || /connection is closed/i.test(message)
            || /redis/i.test(message)
        ) {
            throw new ApiError(
                503,
                'Code execution queue is unavailable. Start Redis and the execution worker, then try again.',
            );
        }

        throw error;
    }
};

export const listSupportedExecutionLanguages = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, 'Supported execution languages retrieved.', {
        languages: SUPPORTED_LANGUAGES,
    }));
});

export const createCodeExecutionJob = asyncHandler(async (req, res) => {
    const language = normalizeLanguage(req.body?.language);
    const sourceCode = req.body?.sourceCode;
    const stdin = req.body?.stdin ?? '';

    if (!language || !getLanguageHandler(language)) {
        throw new ApiError(
            400,
            `Unsupported language. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}.`,
        );
    }

    if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
        throw new ApiError(400, 'sourceCode is required and must be a non-empty string.');
    }

    if (typeof stdin !== 'string') {
        throw new ApiError(400, 'stdin must be a string when provided.');
    }

    assertByteLimit(sourceCode, EXECUTION_MAX_SOURCE_BYTES, 'sourceCode');
    assertByteLimit(stdin, EXECUTION_MAX_STDIN_BYTES, 'stdin');

    const job = await withQueueUnavailableGuard(async () => {
        const queue = getCodeExecutionQueue();
        await queue.waitUntilReady();
        return queue.add(CODE_EXECUTION_JOB_NAME, {
            language,
            sourceCode,
            stdin,
        });
    });

    res.status(202).json(new ApiResponse(202, 'Execution job accepted.', {
        jobId: String(job.id),
        language,
        status: 'queued',
        pollUrl: `/api/code-execution/jobs/${job.id}`,
        socket: {
            room: `${EXECUTION_SOCKET_ROOM_PREFIX}${job.id}`,
            subscribeEvent: EXECUTION_SOCKET_EVENTS.subscribe,
            completedEvent: EXECUTION_SOCKET_EVENTS.completed,
            failedEvent: EXECUTION_SOCKET_EVENTS.failed,
        },
    }));
});

export const getCodeExecutionJobStatus = asyncHandler(async (req, res) => {
    const job = await withQueueUnavailableGuard(async () => {
        const queue = getCodeExecutionQueue();
        await queue.waitUntilReady();
        return queue.getJob(req.params.jobId);
    });

    if (!job) {
        throw new ApiError(404, 'Execution job not found.');
    }

    const payload = await serializeExecutionJob(job);

    res.status(200).json(new ApiResponse(200, 'Execution job status retrieved.', payload));
});
