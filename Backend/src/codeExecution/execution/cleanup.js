import { removeExecutionWorkspace } from './tempWorkspace.js';
import { runProcess } from './processRunner.js';

const runDockerCleanupCommand = async (args) => {
    const result = await runProcess({
        command: 'docker',
        args,
        maxOutputBytes: 8 * 1024,
    });

    if (result.exitCode !== 0 && !/No such container/i.test(result.stderr)) {
        console.warn(`Code execution cleanup warning: docker ${args[0]} returned ${result.exitCode}.`);
    }
};

export const forceKillContainer = async (containerName) => {
    if (!containerName) {
        return;
    }

    await runDockerCleanupCommand(['kill', containerName]);
};

export const forceRemoveContainer = async (containerName) => {
    if (!containerName) {
        return;
    }

    await runDockerCleanupCommand(['rm', '-f', containerName]);
};

export const cleanupExecutionArtifacts = async ({ containerName, workspace }) => {
    const cleanupResults = await Promise.allSettled([
        forceRemoveContainer(containerName),
        removeExecutionWorkspace(workspace),
    ]);

    cleanupResults
        .filter((result) => result.status === 'rejected')
        .forEach((result) => {
            console.warn(`Code execution cleanup warning: ${result.reason.message}`);
        });
};
