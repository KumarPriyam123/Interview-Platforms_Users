import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseIntegerEnv = (value, fallback) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const CODE_EXECUTION_QUEUE_NAME = 'code-execution';
export const CODE_EXECUTION_JOB_NAME = 'execute-code';

export const EXECUTION_TIMEOUT_MS = parseIntegerEnv(process.env.CODE_EXECUTION_TIMEOUT_MS, 5000);
export const EXECUTION_MEMORY_LIMIT = process.env.CODE_EXECUTION_MEMORY_LIMIT ?? '128m';
export const EXECUTION_CPU_LIMIT = process.env.CODE_EXECUTION_CPU_LIMIT ?? '0.5';
export const EXECUTION_WORKER_CONCURRENCY = parseIntegerEnv(
    process.env.CODE_EXECUTION_WORKER_CONCURRENCY,
    4,
);
export const EXECUTION_MAX_SOURCE_BYTES = parseIntegerEnv(
    process.env.CODE_EXECUTION_MAX_SOURCE_BYTES,
    64 * 1024,
);
export const EXECUTION_MAX_STDIN_BYTES = parseIntegerEnv(
    process.env.CODE_EXECUTION_MAX_STDIN_BYTES,
    32 * 1024,
);
export const EXECUTION_MAX_OUTPUT_BYTES = parseIntegerEnv(
    process.env.CODE_EXECUTION_MAX_OUTPUT_BYTES,
    64 * 1024,
);
export const EXECUTION_JOB_RETENTION_SECONDS = parseIntegerEnv(
    process.env.CODE_EXECUTION_JOB_RETENTION_SECONDS,
    3600,
);

export const REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
export const REDIS_PORT = parseIntegerEnv(process.env.REDIS_PORT, 6379);
export const REDIS_DB = parseIntegerEnv(process.env.REDIS_DB, 0);
export const REDIS_USERNAME = process.env.REDIS_USERNAME || undefined;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
export const REDIS_TLS_ENABLED = (process.env.REDIS_TLS_ENABLED ?? 'false').toLowerCase() === 'true';

export const EXECUTION_IMAGES = Object.freeze({
    javascript: process.env.CODE_EXECUTION_NODE_IMAGE ?? 'node:20-alpine',
    python: process.env.CODE_EXECUTION_PYTHON_IMAGE ?? 'python:3.12-alpine',
    cpp: process.env.CODE_EXECUTION_CPP_IMAGE ?? 'gcc:14',
    java: process.env.CODE_EXECUTION_JAVA_IMAGE ?? 'openjdk:21-jdk-slim',
});

export const SUPPORTED_LANGUAGES = Object.freeze(Object.keys(EXECUTION_IMAGES));

export const EXECUTION_SOCKET_EVENTS = Object.freeze({
    subscribe: 'code-execution:subscribe',
    unsubscribe: 'code-execution:unsubscribe',
    completed: 'code-execution:completed',
    failed: 'code-execution:failed',
});

export const EXECUTION_SOCKET_ROOM_PREFIX = 'job:';
export const EXECUTION_TEMP_PREFIX = 'jobsaarthi-code-execution-';
export const EXECUTION_SCRIPTS_DIR = path.join(__dirname, 'scripts');
