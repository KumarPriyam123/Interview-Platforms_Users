import { spawn } from 'child_process';
import { EXECUTION_MAX_OUTPUT_BYTES } from '../constants.js';

const appendChunk = (state, chunk, maxBytes) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const remainingBytes = maxBytes - state.size;

    if (remainingBytes > 0) {
        const chunkSlice = buffer.subarray(0, remainingBytes);
        state.chunks.push(chunkSlice);
        state.size += chunkSlice.length;
    }

    if (buffer.length > remainingBytes) {
        state.truncated = true;
    }
};

export const runProcess = ({
    command,
    args,
    cwd,
    env,
    stdin = '',
    timeoutMs,
    onTimeout,
    maxOutputBytes = EXECUTION_MAX_OUTPUT_BYTES,
}) => (
    new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });

        let settled = false;
        let timedOut = false;
        let timeoutId;

        const stdoutState = {
            chunks: [],
            size: 0,
            truncated: false,
        };
        const stderrState = {
            chunks: [],
            size: 0,
            truncated: false,
        };

        const finalizeResolve = (value) => {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timeoutId);
            resolve(value);
        };

        const finalizeReject = (error) => {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timeoutId);
            reject(error);
        };

        child.once('error', finalizeReject);
        child.stdin.on('error', () => undefined);
        child.stdout.on('data', (chunk) => appendChunk(stdoutState, chunk, maxOutputBytes));
        child.stderr.on('data', (chunk) => appendChunk(stderrState, chunk, maxOutputBytes));

        timeoutId = timeoutMs
            ? setTimeout(() => {
                timedOut = true;
                Promise.resolve(onTimeout?.()).catch(() => undefined);
            }, timeoutMs)
            : undefined;

        timeoutId?.unref?.();

        child.once('close', (exitCode, signal) => {
            finalizeResolve({
                exitCode,
                signal,
                timedOut,
                stdout: Buffer.concat(stdoutState.chunks).toString('utf8'),
                stderr: Buffer.concat(stderrState.chunks).toString('utf8'),
                stdoutTruncated: stdoutState.truncated,
                stderrTruncated: stderrState.truncated,
            });
        });

        if (typeof stdin === 'string' && stdin.length > 0) {
            child.stdin.end(stdin);
        } else {
            child.stdin.end();
        }
    })
);
