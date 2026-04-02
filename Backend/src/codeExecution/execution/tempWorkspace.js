import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { EXECUTION_TEMP_PREFIX } from '../constants.js';

export const createExecutionWorkspace = async ({ fileName, sourceCode }) => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), EXECUTION_TEMP_PREFIX));
    const sourceDir = path.join(rootDir, 'source');
    const sourcePath = path.join(sourceDir, fileName);

    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(sourcePath, sourceCode, {
        encoding: 'utf8',
        mode: 0o600,
    });

    return {
        rootDir,
        sourceDir,
        sourcePath,
    };
};

export const removeExecutionWorkspace = async (workspace) => {
    if (!workspace?.rootDir) {
        return;
    }

    await fs.rm(workspace.rootDir, {
        recursive: true,
        force: true,
    });
};
