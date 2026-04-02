export class LanguageHandler {
    constructor(language) {
        if (new.target === LanguageHandler) {
            throw new Error('LanguageHandler is abstract and must be extended.');
        }

        this.language = language;
    }

    get image() {
        throw new Error(`${this.language} handler must expose a Docker image.`);
    }

    prepareSource(sourceCode) {
        throw new Error(`${this.language} handler must implement prepareSource().`);
    }

    buildExecutionCommand() {
        throw new Error(`${this.language} handler must implement buildExecutionCommand().`);
    }

    buildDockerEnv() {
        return {};
    }

    get compilationExitCodes() {
        return new Set();
    }

    classifyResult({ timedOut, exitCode }) {
        if (timedOut) {
            return 'timeout';
        }

        if (exitCode === 0) {
            return 'success';
        }

        if (this.compilationExitCodes.has(exitCode)) {
            return 'compilation_error';
        }

        return 'runtime_error';
    }
}
