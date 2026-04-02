import { EXECUTION_IMAGES, SUPPORTED_LANGUAGES } from '../constants.js';
import { LanguageHandler } from './LanguageHandler.js';

const JAVA_CLASS_NAME_PATTERN = /\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)\b|\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b/;

const languageAliases = new Map([
    ['js', 'javascript'],
    ['javascript', 'javascript'],
    ['node', 'javascript'],
    ['py', 'python'],
    ['python', 'python'],
    ['c++', 'cpp'],
    ['cpp', 'cpp'],
    ['java', 'java'],
]);

class JavaScriptLanguageHandler extends LanguageHandler {
    constructor() {
        super('javascript');
    }

    get image() {
        return EXECUTION_IMAGES.javascript;
    }

    prepareSource(sourceCode) {
        return {
            fileName: 'main.js',
            sourceCode,
            metadata: {},
        };
    }

    buildExecutionCommand() {
        return ['node', '--max-old-space-size=64', '/workspace/source/main.js'];
    }
}

class PythonLanguageHandler extends LanguageHandler {
    constructor() {
        super('python');
    }

    get image() {
        return EXECUTION_IMAGES.python;
    }

    prepareSource(sourceCode) {
        return {
            fileName: 'main.py',
            sourceCode,
            metadata: {},
        };
    }

    buildExecutionCommand() {
        return ['python3', '/workspace/source/main.py'];
    }

    buildDockerEnv() {
        return {
            PYTHONUNBUFFERED: '1',
        };
    }
}

class CppLanguageHandler extends LanguageHandler {
    constructor() {
        super('cpp');
    }

    get image() {
        return EXECUTION_IMAGES.cpp;
    }

    prepareSource(sourceCode) {
        return {
            fileName: 'main.cpp',
            sourceCode,
            metadata: {},
        };
    }

    buildExecutionCommand() {
        return ['sh', '/sandbox/scripts/run-cpp.sh'];
    }

    get compilationExitCodes() {
        return new Set([10]);
    }
}

class JavaLanguageHandler extends LanguageHandler {
    constructor() {
        super('java');
    }

    get image() {
        return EXECUTION_IMAGES.java;
    }

    prepareSource(sourceCode) {
        const classMatch = sourceCode.match(JAVA_CLASS_NAME_PATTERN);
        const mainClassName = classMatch?.[1] ?? classMatch?.[2] ?? 'Main';

        return {
            fileName: `${mainClassName}.java`,
            sourceCode,
            metadata: {
                mainClassName,
            },
        };
    }

    buildExecutionCommand({ metadata }) {
        return ['sh', '/sandbox/scripts/run-java.sh', metadata.mainClassName];
    }

    get compilationExitCodes() {
        return new Set([10]);
    }
}

const handlers = new Map([
    ['javascript', new JavaScriptLanguageHandler()],
    ['python', new PythonLanguageHandler()],
    ['cpp', new CppLanguageHandler()],
    ['java', new JavaLanguageHandler()],
]);

export const normalizeLanguage = (value) => {
    const normalized = languageAliases.get(String(value ?? '').trim().toLowerCase());
    return normalized ?? null;
};

export const getLanguageHandler = (language) => {
    const normalizedLanguage = normalizeLanguage(language);

    if (!normalizedLanguage) {
        return null;
    }

    return handlers.get(normalizedLanguage) ?? null;
};

export { SUPPORTED_LANGUAGES };
