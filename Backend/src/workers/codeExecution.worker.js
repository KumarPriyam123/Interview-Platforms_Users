import 'dotenv/config';
import { Worker } from 'bullmq';
import {
    CODE_EXECUTION_QUEUE_NAME,
    EXECUTION_WORKER_CONCURRENCY,
} from '../codeExecution/constants.js';
import { executeCodeJob } from '../codeExecution/execution/dockerSandbox.js';
import { closeRedisConnection, createRedisConnection } from '../codeExecution/redis.js';

const connection = createRedisConnection(`code-execution-worker-${process.pid}`);
const worker = new Worker(
    CODE_EXECUTION_QUEUE_NAME,
    async (job) => executeCodeJob({
        jobId: String(job.id),
        language: job.data.language,
        sourceCode: job.data.sourceCode,
        stdin: job.data.stdin,
    }),
    {
        connection,
        concurrency: EXECUTION_WORKER_CONCURRENCY,
    },
);

worker.on('completed', (job, result) => {
    console.log(`[code-execution] job ${job.id} completed with outcome ${result.outcome}`);
});

worker.on('failed', (job, error) => {
    console.error(`[code-execution] job ${job?.id ?? 'unknown'} failed`, error);
});

worker.on('error', (error) => {
    console.error('[code-execution] worker error', error);
});

let shuttingDown = false;

const shutdown = async (signal) => {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    console.log(`\n${signal} received. Shutting down code execution worker...`);

    try {
        await worker.close();
        await closeRedisConnection(connection);
        process.exit(0);
    } catch (error) {
        console.error('Failed to shut down code execution worker cleanly:', error);
        process.exit(1);
    }
};

process.on('SIGINT', () => {
    void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection in code execution worker:', error);
    void shutdown('unhandledRejection');
});

await worker.waitUntilReady();
console.log(`[code-execution] worker ready with concurrency ${EXECUTION_WORKER_CONCURRENCY}`);
