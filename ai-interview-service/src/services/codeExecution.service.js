const JUDGE0_URL = process.env.JUDGE0_URL || "https://ce.judge0.com";
const CPP_LANGUAGE_ID = 54;

const STATUS_DESCRIPTIONS = {
  1: "In Queue",
  2: "Processing",
  3: "Accepted",
  4: "Wrong Answer",
  5: "Time Limit Exceeded",
  6: "Compilation Error",
  7: "Runtime Error (SIGSEGV)",
  8: "Runtime Error (SIGXFSZ)",
  9: "Runtime Error (SIGFPE)",
  10: "Runtime Error (SIGABRT)",
  11: "Runtime Error (NZEC)",
  12: "Runtime Error (Other)",
  13: "Internal Error",
  14: "Exec Format Error",
};

const GENERIC_LANGUAGE_MAP = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: CPP_LANGUAGE_ID,
};

const getJudge0Headers = () => {
  const headers = { "Content-Type": "application/json" };

  if (process.env.JUDGE0_AUTH_TOKEN) {
    headers["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;
  }

  if (process.env.JUDGE0_AUTH_USER) {
    headers["X-Auth-User"] = process.env.JUDGE0_AUTH_USER;
  }

  return headers;
};

const normalizeOutput = (value = "") =>
  String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

const getStatusLabel = (statusId) => STATUS_DESCRIPTIONS[Number(statusId)] || "Unknown";

const formatExecutionOutput = (payload = {}) =>
  [payload.stdout, payload.stderr, payload.compile_output, payload.message]
    .filter(Boolean)
    .join("\n")
    .trim();

const callJudge0 = async ({ sourceCode, languageId, stdin = "" }) => {
  const query = new URLSearchParams({
    base64_encoded: "false",
    wait: "true",
    fields: "stdout,stderr,compile_output,message,status_id,time,memory",
  });

  const response = await fetch(`${JUDGE0_URL}/submissions?${query.toString()}`, {
    method: "POST",
    headers: getJudge0Headers(),
    body: JSON.stringify({
      language_id: languageId,
      source_code: sourceCode,
      stdin,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Judge0 request failed: ${response.status} ${errorText}`);
  }

  return response.json();
};

const detectExecutionStyle = (testCases = []) =>
  Array.isArray(testCases)
  && testCases.some((testCase) =>
    testCase
    && typeof testCase === "object"
    && "output" in testCase
    && !("input" in testCase)
    && !("expectedOutput" in testCase)
  )
    ? "leetcode"
    : "stdin";

const normalizeGenericLanguage = (language = "") => {
  const normalized = String(language || "").toLowerCase();
  if (!GENERIC_LANGUAGE_MAP[normalized]) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return normalized;
};

const normalizeStdinCases = (testCases = []) => {
  const normalized = Array.isArray(testCases) ? testCases : [];
  if (normalized.length === 0) {
    return [{ input: "", expectedOutput: "" }];
  }

  return normalized.map((testCase) => ({
    input: String(testCase.input || ""),
    expectedOutput: String(testCase.expectedOutput || ""),
  }));
};

const evaluateResults = (executionResults = []) => {
  const passed = executionResults.filter((result) => result.passed).length;

  return {
    passed,
    total: executionResults.length,
    results: executionResults,
  };
};

const runGenericCode = async ({ language, code, testCases }) => {
  const normalizedLanguage = normalizeGenericLanguage(language);
  const normalizedCases = normalizeStdinCases(testCases);
  const languageId = GENERIC_LANGUAGE_MAP[normalizedLanguage];

  const results = await Promise.all(
    normalizedCases.map(async (testCase, index) => {
      const payload = await callJudge0({
        sourceCode: String(code || ""),
        languageId,
        stdin: testCase.input,
      });

      const actualOutput = formatExecutionOutput(payload) || "No output";
      const statusId = Number(payload.status_id);
      const normalizedExpected = normalizeOutput(testCase.expectedOutput);
      const normalizedActual = normalizeOutput(actualOutput);
      const passed = normalizedExpected
        ? statusId === 3 && normalizedExpected === normalizedActual
        : statusId === 3;

      return {
        index,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        statusId,
        status: getStatusLabel(statusId),
        time: payload.time || null,
        memory: payload.memory || null,
      };
    })
  );

  const summary = evaluateResults(results);

  return {
    provider: "judge0",
    executionStyle: "stdin",
    language: normalizedLanguage,
    passedCount: summary.passed,
    totalCount: summary.total,
    results: summary.results,
  };
};

const normalizeLeetCodeCases = (testCases = []) => {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw new Error("At least one structured test case is required");
  }

  return testCases.map((testCase, index) => {
    if (!testCase || typeof testCase !== "object" || Array.isArray(testCase)) {
      throw new Error(`Invalid test case at index ${index}`);
    }

    if (!("output" in testCase)) {
      throw new Error(`Missing output in test case at index ${index}`);
    }

    return {
      ...testCase,
      output: String(testCase.output ?? ""),
      hidden: Boolean(testCase.hidden),
    };
  });
};

const normalizeExecutionMode = (mode = "run") => {
  const normalized = String(mode || "run").toLowerCase();
  return normalized === "submit" ? "submit" : "run";
};

const extractSolveSignature = (userCode = "") => {
  const signatureMatch = String(userCode).match(/([A-Za-z_][\w:<>\s,*&]+?)\s+solve\s*\(([^)]*)\)/m);
  if (!signatureMatch) {
    throw new Error("Could not find solve(...) in the submitted code");
  }

  const returnType = signatureMatch[1].trim();
  const paramsSource = signatureMatch[2].trim();
  const params = paramsSource
    ? paramsSource.split(",").map((rawParam) => {
        const cleaned = rawParam.trim().replace(/\s*=\s*.*$/, "");
        const nameMatch = cleaned.match(/([A-Za-z_]\w*)\s*$/);
        if (!nameMatch) {
          throw new Error(`Unable to parse parameter name from "${rawParam}"`);
        }

        const name = nameMatch[1];
        const type = cleaned.slice(0, cleaned.lastIndexOf(name)).trim();
        return {
          name,
          type: type || "auto",
        };
      })
    : [];

  return {
    returnType,
    params,
  };
};

const normalizeCppType = (type = "") =>
  String(type)
    .replace(/\bconst\b/g, "")
    .replace(/&&/g, "")
    .replace(/&/g, "")
    .replace(/\s+/g, " ")
    .trim();

const escapeCppString = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

const toCppLiteral = (value) => {
  if (Array.isArray(value)) {
    return `{${value.map((item) => toCppLiteral(item)).join(", ")}}`;
  }

  if (typeof value === "string") {
    return `"${escapeCppString(value)}"`;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "0";
  }

  if (value === null || value === undefined) {
    return "0";
  }

  throw new Error(`Unsupported test case value: ${JSON.stringify(value)}`);
};

const buildParameterDeclarations = (testCase, params) =>
  params.map((param) => {
    if (!(param.name in testCase)) {
      throw new Error(`Missing value for parameter "${param.name}" in test case`);
    }

    return `  ${normalizeCppType(param.type)} ${param.name} = ${toCppLiteral(testCase[param.name])};`;
  }).join("\n");

const buildSolveInvocation = (params) =>
  params.map((param) => param.name).join(", ");

const generateWrapper = (testCase, signature) => {
  const declarations = buildParameterDeclarations(testCase, signature.params);
  const invocation = buildSolveInvocation(signature.params);

  return `
template <typename T>
string serializeValue(const T& value) {
  ostringstream out;
  out << value;
  return out.str();
}

inline string serializeValue(const string& value) {
  return value;
}

inline string serializeValue(const char* value) {
  return string(value);
}

inline string serializeValue(bool value) {
  return value ? "true" : "false";
}

template <typename T>
string serializeValue(const vector<T>& values) {
  string output;
  for (size_t i = 0; i < values.size(); ++i) {
    if (i > 0) output += " ";
    output += serializeValue(values[i]);
  }
  return output;
}

int main() {
${declarations}
  Solution solution;
  auto result = solution.solve(${invocation});
  cout << serializeValue(result);
  return 0;
}
`;
};

const buildFullSourceCode = (userCode, wrapperCode) => `#include <bits/stdc++.h>
using namespace std;

${String(userCode || "").trim()}

${wrapperCode}
`;

const selectExecutionCases = (testCases, mode) => {
  if (mode === "submit") {
    const hiddenCases = testCases.filter((testCase) => testCase.hidden);
    return hiddenCases.length > 0 ? hiddenCases : testCases;
  }

  const visibleCases = testCases.filter((testCase) => !testCase.hidden);
  return visibleCases.length > 0 ? visibleCases : testCases;
};

const executeStructuredCase = async ({ userCode, testCase, signature, caseIndex }) => {
  const wrapperCode = generateWrapper(testCase, signature);
  const sourceCode = buildFullSourceCode(userCode, wrapperCode);
  const payload = await callJudge0({
    sourceCode,
    languageId: CPP_LANGUAGE_ID,
  });

  const actualOutput = formatExecutionOutput(payload) || "No output";
  const statusId = Number(payload.status_id);
  const expectedOutput = String(testCase.output || "");
  const normalizedExpected = normalizeOutput(expectedOutput);
  const passed =
    statusId === 3
    && (!normalizedExpected || normalizeOutput(actualOutput) === normalizedExpected);

  return {
    index: caseIndex,
    passed,
    input: Object.fromEntries(
      Object.entries(testCase).filter(([key]) => key !== "output" && key !== "hidden")
    ),
    expectedOutput,
    actualOutput,
    statusId,
    status: getStatusLabel(statusId),
    hidden: Boolean(testCase.hidden),
    time: payload.time || null,
    memory: payload.memory || null,
  };
};

const runLeetCodeStyleCode = async ({ code, testCases, mode }) => {
  const normalizedCases = normalizeLeetCodeCases(testCases);
  const executionMode = normalizeExecutionMode(mode);
  const selectedCases = selectExecutionCases(normalizedCases, executionMode);
  const signature = extractSolveSignature(code);

  const results = [];
  for (const testCase of selectedCases) {
    const caseIndex = normalizedCases.indexOf(testCase);
    const result = await executeStructuredCase({
      userCode: code,
      testCase,
      signature,
      caseIndex,
    });
    results.push(result);
  }

  const summary = evaluateResults(results);

  return {
    provider: "judge0",
    executionStyle: "leetcode",
    language: "cpp",
    mode: executionMode,
    passedCount: summary.passed,
    totalCount: summary.total,
    results: summary.results,
  };
};

export const runCode = async ({ language, code, testCases, mode = "run" }) => {
  const executionStyle = detectExecutionStyle(testCases);

  if (executionStyle === "leetcode") {
    return runLeetCodeStyleCode({
      code: String(code || ""),
      testCases,
      mode,
    });
  }

  return runGenericCode({
    language: String(language || "javascript").toLowerCase(),
    code: String(code || ""),
    testCases,
  });
};

export {
  evaluateResults,
  generateWrapper,
};
