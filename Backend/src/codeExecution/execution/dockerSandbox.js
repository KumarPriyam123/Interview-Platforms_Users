import crypto from 'crypto';
import {
    EXECUTION_CPU_LIMIT,
    EXECUTION_MAX_OUTPUT_BYTES,
    EXECUTION_MEMORY_LIMIT,
    EXECUTION_SCRIPTS_DIR,
    EXECUTION_TIMEOUT_MS,
} from '../constants.js';
import { getLanguageHandler } from '../languageHandlers/index.js';
import { cleanupExecutionArtifacts, forceKillContainer } from './cleanup.js';
import { runProcess } from './processRunner.js';
import { createExecutionWorkspace } from './tempWorkspace.js';

const OUTPUT_TRUNCATED_NOTICE = `\n[output truncated to ${EXECUTION_MAX_OUTPUT_BYTES} bytes]`;
const warmedImages = new Set();
const imageWarmupPromises = new Map();

const createContainerName = (language, jobId) => (
    `jobsaarthi-${language}-${String(jobId ?? 'job')
        .replace(/[^a-zA-Z0-9_.-]/g, '')
        .slice(0, 24)}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
        .toLowerCase()
);

const withTruncationNotice = (output, truncated) => {
    if (!truncated) {
        return output;
    }

    const suffix = output.endsWith('\n') || output.length === 0 ? '' : '\n';
    return `${output}${suffix}${OUTPUT_TRUNCATED_NOTICE.trimStart()}`;
};

const ensureDockerImageAvailable = async (image) => {
    if (warmedImages.has(image)) {
        return;
    }

    if (imageWarmupPromises.has(image)) {
        await imageWarmupPromises.get(image);
        return;
    }

    const warmupPromise = (async () => {
        const inspectResult = await runProcess({
            command: 'docker',
            args: ['image', 'inspect', image],
            maxOutputBytes: 8 * 1024,
        });

        if (inspectResult.exitCode === 0) {
            warmedImages.add(image);
            return;
        }

        console.log(`[code-execution] Pulling Docker image ${image}...`);

        const pullResult = await runProcess({
            command: 'docker',
            args: ['pull', image],
        });

        if (pullResult.exitCode !== 0) {
            throw new Error(
                pullResult.stderr.trim() || `Failed to pull Docker image ${image}.`,
            );
        }

        warmedImages.add(image);
    })();

    imageWarmupPromises.set(image, warmupPromise);

    try {
        await warmupPromise;
    } finally {
        imageWarmupPromises.delete(image);
    }
};

const buildDockerArgs = ({ containerName, handler, metadata, workspace }) => {
    const dockerArgs = [
        'run',
        '--rm',
        '-i',
        '--name',
        containerName,
        '--network',
        'none',
        '--memory',
        EXECUTION_MEMORY_LIMIT,
        '--cpus',
        EXECUTION_CPU_LIMIT,
        '--pids-limit',
        '64',
        '--read-only',
        '--user',
        '65534:65534',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--tmpfs',
        '/tmp:rw,noexec,nosuid,size=64m,uid=65534,gid=65534,mode=1777',
        '--tmpfs',
        '/workspace/build:rw,noexec,nosuid,size=64m,uid=65534,gid=65534,mode=1777',
        '--mount',
        `type=bind,source=${workspace.sourceDir},target=/workspace/source,readonly`,
        '--mount',
        `type=bind,source=${EXECUTION_SCRIPTS_DIR},target=/sandbox/scripts,readonly`,
    ];

    const dockerEnv = handler.buildDockerEnv(metadata);

    Object.entries(dockerEnv).forEach(([key, value]) => {
        dockerArgs.push('-e', `${key}=${value}`);
    });

    dockerArgs.push(handler.image, ...handler.buildExecutionCommand({ metadata }));

    return dockerArgs;
};

const getExecutionMessage = (outcome) => {
    if (outcome === 'success') {
        return 'Execution completed successfully.';
    }

    if (outcome === 'compilation_error') {
        return 'Compilation failed.';
    }

    if (outcome === 'timeout') {
        return `Execution timed out after ${EXECUTION_TIMEOUT_MS}ms.`;
    }

    return 'Program exited with an error.';
};

const getExecutionErrorType = (outcome) => {
    if (outcome === 'compilation_error') {
        return 'COMPILATION_ERROR';
    }

    if (outcome === 'runtime_error') {
        return 'RUNTIME_ERROR';
    }

    if (outcome === 'timeout') {
        return 'TIMEOUT';
    }

    return null;
};

const isDockerBootstrapFailure = ({ exitCode, stderr }) => (
    exitCode === 125 && /docker:/i.test(stderr)
);

const buildExecutionResult = ({
    handler,
    jobId,
    outcome,
    processResult,
    startedAt,
    completedAt,
    durationMs,
}) => ({
    jobId: String(jobId),
    language: handler.language,
    outcome,
    errorType: getExecutionErrorType(outcome),
    message: getExecutionMessage(outcome),
    stdout: withTruncationNotice(processResult.stdout, processResult.stdoutTruncated),
    stderr: withTruncationNotice(processResult.stderr, processResult.stderrTruncated),
    exitCode: processResult.exitCode,
    signal: processResult.signal,
    timedOut: processResult.timedOut,
    durationMs,
    startedAt,
    completedAt,
    limits: {
        timeoutMs: EXECUTION_TIMEOUT_MS,
        memory: EXECUTION_MEMORY_LIMIT,
        cpu: EXECUTION_CPU_LIMIT,
    },
});

export const executeCodeJob = async ({
    jobId,
    language,
    sourceCode,
    stdin = '',
}) => {
    const handler = getLanguageHandler(language);

    if (!handler) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const preparedSource = handler.prepareSource(sourceCode);
    const workspace = await createExecutionWorkspace(preparedSource);
    const containerName = createContainerName(handler.language, jobId);
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();

    try {
        await ensureDockerImageAvailable(handler.image);

        const processResult = await runProcess({
            command: 'docker',
            args: buildDockerArgs({
                containerName,
                handler,
                metadata: preparedSource.metadata,
                workspace,
            }),
            stdin,
            timeoutMs: EXECUTION_TIMEOUT_MS,
            onTimeout: () => forceKillContainer(containerName),
        });

        if (isDockerBootstrapFailure(processResult)) {
            throw new Error(processResult.stderr.trim() || 'Docker sandbox failed to start.');
        }

        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startedAtMs;
        const outcome = handler.classifyResult(processResult);

        return buildExecutionResult({
            handler,
            jobId,
            outcome,
            processResult,
            startedAt,
            completedAt,
            durationMs,
        });
    } finally {
        await cleanupExecutionArtifacts({
            containerName,
            workspace,
        });
    }
};
