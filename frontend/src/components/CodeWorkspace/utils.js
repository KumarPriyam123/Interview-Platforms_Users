/**
 * Shared utilities for the CodeWorkspace component family.
 * Extracted from AIInterviewPage — used across AI, P2P, and Industry interview modes.
 */

export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', icon: 'JS' },
  { id: 'python', label: 'Python', icon: 'Py' },
  { id: 'cpp', label: 'C++', icon: 'C+' },
  { id: 'java', label: 'Java', icon: 'Jv' },
]

export const SUPPORTED_LANGUAGE_IDS = new Set(LANGUAGES.map((l) => l.id))

export function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGE_IDS.has(language) ? language : 'javascript'
}

export function getLanguageLabel(language) {
  return LANGUAGES.find((l) => l.id === language)?.label || language
}

// ── Starter code templates ──

/**
 * Parse a C++ signature like "vector<int> solve(vector<int> nums, int target)"
 * into { returnType, params: [{ type, name }] }
 */
function parseCppSignature(cppSignature = '') {
  const m = String(cppSignature).match(/^\s*(.+?)\s+solve\s*\((.*)\)\s*$/)
  if (!m) return { returnType: 'string', params: [] }
  const returnType = m[1].trim()
  const params = m[2].trim()
    ? m[2].split(',').map((p) => {
        const cleaned = p.trim()
        const nm = cleaned.match(/([A-Za-z_]\w*)\s*$/)
        if (!nm) return null
        const name = nm[1]
        const type = cleaned.slice(0, cleaned.lastIndexOf(name)).trim()
        return { type, name }
      }).filter(Boolean)
    : []
  return { returnType, params }
}

/** Map a C++ type to Python type hint */
function cppTypeToPython(t) {
  if (/^vector\s*<\s*vector\s*<\s*int\s*>\s*>$/.test(t)) return 'List[List[int]]'
  if (/^vector\s*<\s*vector\s*<\s*string\s*>\s*>$/.test(t)) return 'List[List[str]]'
  if (/^vector\s*<\s*int\s*>$/.test(t)) return 'List[int]'
  if (/^vector\s*<\s*string\s*>$/.test(t)) return 'List[str]'
  if (/^vector\s*<\s*double\s*>$/.test(t)) return 'List[float]'
  if (/^vector\s*<\s*bool\s*>$/.test(t)) return 'List[bool]'
  if (/string/.test(t)) return 'str'
  if (/bool/.test(t)) return 'bool'
  if (/double|float/.test(t)) return 'float'
  if (/int|long/.test(t)) return 'int'
  return 'Any'
}

/** Map a C++ type to Java type */
function cppTypeToJava(t) {
  if (/^vector\s*<\s*vector\s*<\s*int\s*>\s*>$/.test(t)) return 'int[][]'
  if (/^vector\s*<\s*vector\s*<\s*string\s*>\s*>$/.test(t)) return 'String[][]'
  if (/^vector\s*<\s*int\s*>$/.test(t)) return 'int[]'
  if (/^vector\s*<\s*string\s*>$/.test(t)) return 'String[]'
  if (/^vector\s*<\s*double\s*>$/.test(t)) return 'double[]'
  if (/^vector\s*<\s*bool\s*>$/.test(t)) return 'boolean[]'
  if (/string/.test(t)) return 'String'
  if (/bool/.test(t)) return 'boolean'
  if (/double|float/.test(t)) return 'double'
  if (/int/.test(t)) return 'int'
  if (/long/.test(t)) return 'long'
  return 'String'
}

/** Map a C++ return type to JS doc comment */
function cppTypeToJSDoc(t) {
  if (/vector\s*<\s*vector/.test(t)) return 'number[][]'
  if (/vector\s*<\s*int\s*>/.test(t)) return 'number[]'
  if (/vector\s*<\s*string\s*>/.test(t)) return 'string[]'
  if (/string/.test(t)) return 'string'
  if (/bool/.test(t)) return 'boolean'
  if (/int|long|double|float/.test(t)) return 'number'
  return 'any'
}

function buildStructuredCpp(cppSignature) {
  return `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    ${cppSignature} {\n        // TODO: write your solution\n    }\n};\n`
}

function buildStructuredPython(sig) {
  const params = sig.params.map((p) => `${p.name}: ${cppTypeToPython(p.type)}`).join(', ')
  const ret = cppTypeToPython(sig.returnType)
  return `from typing import List, Any\n\nclass Solution:\n    def solve(self, ${params}) -> ${ret}:\n        # TODO: write your solution\n        pass\n`
}

function buildStructuredJava(sig) {
  const retType = cppTypeToJava(sig.returnType)
  const params = sig.params.map((p) => `${cppTypeToJava(p.type)} ${p.name}`).join(', ')
  return `class Solution {\n    public ${retType} solve(${params}) {\n        // TODO: write your solution\n        ${retType === 'boolean' ? 'return false;' : retType === 'int' || retType === 'long' || retType === 'double' ? 'return 0;' : retType.endsWith('[]') ? 'return new ' + retType.replace('[]', '[0]') + ';' : 'return "";'}\n    }\n}\n`
}

function buildStructuredJS(sig) {
  const params = sig.params.map((p) => p.name).join(', ')
  const jsdocParams = sig.params.map((p) => ` * @param {${cppTypeToJSDoc(p.type)}} ${p.name}`).join('\n')
  const jsdocReturn = ` * @returns {${cppTypeToJSDoc(sig.returnType)}}`
  return `/**\n${jsdocParams}\n${jsdocReturn}\n */\nfunction solve(${params}) {\n  // TODO: write your solution\n}\n`
}

export function buildCodingStarter(language, questionText, codingMeta = null) {
  // Structured (leetcode-style) questions — generate language-specific class/function starters
  if (codingMeta?.executionStyle === 'leetcode') {
    const sig = parseCppSignature(codingMeta.cppSignature || 'string solve(const string& rawInput)')
    if (language === 'python') return buildStructuredPython(sig)
    if (language === 'java') return buildStructuredJava(sig)
    if (language === 'javascript') return buildStructuredJS(sig)
    return buildStructuredCpp(codingMeta.cppSignature || 'string solve(const string& rawInput)')
  }
  // Stdin-style questions
  if (language === 'python') {
    return `import sys\n\ndef solve(raw_input):\n    # TODO: write your solution\n    return raw_input.strip()\n\nif __name__ == "__main__":\n    data = sys.stdin.read()\n    print(solve(data))\n`
  }
  if (language === 'java') {
    return `import java.io.BufferedReader;\nimport java.io.InputStreamReader;\n\npublic class Main {\n    public static String solve(String rawInput) {\n        // TODO: write your solution\n        return rawInput.trim();\n    }\n\n    public static void main(String[] args) throws Exception {\n        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n        StringBuilder sb = new StringBuilder();\n        String line;\n        while ((line = reader.readLine()) != null) {\n            if (sb.length() > 0) sb.append("\\n");\n            sb.append(line);\n        }\n        System.out.print(solve(sb.toString()));\n    }\n}\n`
  }
  if (language === 'cpp') {
    return `#include <bits/stdc++.h>\nusing namespace std;\n\nstring solve(const string& rawInput) {\n    // TODO: write your solution\n    return rawInput;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n    cout << solve(input);\n    return 0;\n}\n`
  }
  // Default: JavaScript
  return `const fs = require('fs')\n\nfunction solve(rawInput) {\n  // TODO: write your solution\n  return rawInput.trim()\n}\n\nconst input = fs.readFileSync(0, 'utf8')\nprocess.stdout.write(String(solve(input)))\n`
}

// ── Test case helpers ──

export function createDefaultTestCases() {
  return [
    { id: 1, name: 'Case 1', input: '', expectedOutput: '', actualOutput: '', status: 'idle', passed: null },
    { id: 2, name: 'Case 2', input: '', expectedOutput: '', actualOutput: '', status: 'idle', passed: null },
  ]
}

export function formatStructuredCaseInput(testCase) {
  const entries = Object.entries(testCase || {}).filter(([key]) => key !== 'output' && key !== 'hidden')
  return JSON.stringify(Object.fromEntries(entries), null, 2)
}

export function formatTestCaseDisplay(inputJson) {
  try {
    const parsed = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed)
        .filter(([k]) => k !== 'output' && k !== 'hidden')
        .map(([k, v]) => ({ key: k, value: JSON.stringify(v) }))
    }
  } catch { /* not valid JSON */ }
  return null
}

export function formatExampleInput(input) {
  if (!input) return ''
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed)
          .filter(([k]) => k !== 'output' && k !== 'hidden')
          .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
          .join(', ')
      }
    } catch { /* not JSON */ }
    return input
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    return Object.entries(input)
      .filter(([k]) => k !== 'output' && k !== 'hidden')
      .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
      .join(', ')
  }
  return JSON.stringify(input)
}

export function buildCodingTestCases(codingMeta) {
  if (
    codingMeta?.executionStyle === 'leetcode' &&
    Array.isArray(codingMeta.visibleTestCases) &&
    codingMeta.visibleTestCases.length > 0
  ) {
    return codingMeta.visibleTestCases.map((tc, i) => ({
      id: i + 1,
      name: `Case ${i + 1}`,
      input: formatStructuredCaseInput(tc),
      expectedOutput: String(tc.output || ''),
      actualOutput: '',
      status: 'idle',
      passed: null,
      structured: true,
    }))
  }
  return createDefaultTestCases()
}

// ── Execution state labels (reused by P2P) ──

export function getExecutionStateLabel(state) {
  switch (state) {
    case 'queueing': return 'Submitting job'
    case 'queued':
    case 'waiting': return 'Queued'
    case 'active': return 'Running'
    case 'completed': return 'Completed'
    case 'failed': return 'Failed'
    default: return 'Ready to run'
  }
}

export function getExecutionOutcomeLabel(result) {
  switch (result?.outcome) {
    case 'success': return 'Success'
    case 'compilation_error': return 'Compilation Error'
    case 'runtime_error': return 'Runtime Error'
    case 'timeout': return 'Timeout'
    case 'system_error': return 'System Error'
    default: return 'No result yet'
  }
}
