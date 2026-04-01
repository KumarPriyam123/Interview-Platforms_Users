/**
 * LLM Service v2 — Enhanced with sections, counter-questions, doubt resolution
 * 
 * Features:
 * - Generate ALL questions at once, organized in sections
 * - Counter-question generation based on user answers
 * - Doubt/clarification handling during interview
 * - RAG-enhanced question generation
 * - Comprehensive final report generation
 */

// RAG disabled for now
// import { retrieveInterviewContext, retrieveCompanyContext, sampleKnowledge } from "./rag.service.js";
const retrieveInterviewContext = async () => [];
const retrieveCompanyContext = async () => "";
const sampleKnowledge = async () => [];
import { getRandomDatasetCodingQuestion } from "./dataset.service.js";

const DEFAULT_PROVIDER = "groq";
const DEFAULT_MODELS = {
  gemini: "gemini-1.5-flash",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
};

const getLLMProvider = () => {
  const provider = String(process.env.LLM_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  return DEFAULT_MODELS[provider] ? provider : DEFAULT_PROVIDER;
};

const getLLMModel = (provider = getLLMProvider()) =>
  process.env.LLM_MODEL || DEFAULT_MODELS[provider] || DEFAULT_MODELS[DEFAULT_PROVIDER];

// ─── Utilities ───────────────────────────────────────────────

const clampScore = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 6;
  return Math.min(10, Math.max(1, Math.round(n)));
};

const parseJSONObject = (text, fallback) => {
  if (!text) return fallback;

  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch (_error) {
    // Continue with extraction attempt
  }

  // Try extracting JSON from markdown code blocks
  const codeBlockMatch = direct.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (_error) {
      // Continue
    }
  }

  const start = direct.indexOf("{");
  const end = direct.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(direct.slice(start, end + 1));
    } catch (_error) {
      // Try array
    }
  }

  const arrStart = direct.indexOf("[");
  const arrEnd = direct.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(direct.slice(arrStart, arrEnd + 1));
    } catch (_error) {
      // Fall through
    }
  }

  return fallback;
};

const normalizeQuestionText = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const COMMON_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "for", "in", "on", "with", "is", "are", "be", "this", "that",
  "how", "what", "why", "when", "where", "would", "could", "should", "your", "you", "about", "from", "into",
]);

const tokenizeMeaningfulWords = (text = "") =>
  normalizeQuestionText(text)
    .split(" ")
    .filter((word) => word && word.length > 2 && !COMMON_WORDS.has(word));

const isLikelyOffTopic = (question = "", answer = "") => {
  const qWords = new Set(tokenizeMeaningfulWords(question));
  const aWords = tokenizeMeaningfulWords(answer);

  if (aWords.length === 0) return true;
  if (aWords.length < 5) return true;

  const overlap = aWords.filter((word) => qWords.has(word)).length;
  const overlapRatio = qWords.size > 0 ? overlap / qWords.size : 0;
  return overlapRatio < 0.12;
};

const countWords = (text = "") =>
  String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const buildCppStarterFromSignature = (questionText = "", cppSignature = "string solve(const string& input)") => `// ${questionText}
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    ${cppSignature} {
        // TODO: write your solution
    }
};
`;

const normalizeDifficulty = (value, fallback = "medium") => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : fallback;
};

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CONTENT_BLOCK_LABELS = [
  "Title",
  "Difficulty",
  "Category",
  "Topics",
  "Problem Statement",
  "Function Signature / Starter Code",
  "Constraints",
  "Examples / Sample Testcases",
  "C++ Reference",
  "Java Reference",
  "Python Reference",
  "JavaScript Reference",
  "Hints",
];

const stripHtml = (text = "") =>
  String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

const extractLabeledBlock = (content = "", label = "") => {
  const otherLabels = CONTENT_BLOCK_LABELS.filter((item) => item !== label)
    .map((item) => escapeRegex(item))
    .join("|");
  const pattern = new RegExp(`${escapeRegex(label)}:\\s*([\\s\\S]*?)(?=\\n\\n(?:${otherLabels}):|$)`, "i");
  const match = String(content || "").match(pattern);
  return match ? match[1].trim() : "";
};

const extractFirstCppSignature = (source = "") => {
  const compact = String(source || "").replace(/\r/g, "");
  const signatureMatch = compact.match(/([A-Za-z_][\w:<>\s*&]+?)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/);
  if (!signatureMatch) return "";
  return `${signatureMatch[1].trim()} solve(${signatureMatch[3].trim()})`;
};

const createCodingQuestion = ({
  question,
  difficulty = "hard",
  cppSignature,
  inputDescription,
  outputDescription,
  constraints = [],
  examples = [],
  visibleTestCases = [],
  hiddenTestCases = [],
  source = null,
}) => ({
  question,
  difficulty,
  type: "coding",
  coding: {
    executionStyle: "leetcode",
    cppSignature,
    starterCode: buildCppStarterFromSignature(question, cppSignature),
    inputDescription,
    outputDescription,
    constraints,
    examples,
    visibleTestCases,
    hiddenTestCases,
    source,
  },
});

const clonePlainObject = (value) => JSON.parse(JSON.stringify(value));

const extractCppSignatureParts = (cppSignature = "") => {
  const match = String(cppSignature || "").match(/^\s*(.+?)\s+solve\s*\((.*)\)\s*$/);
  if (!match) {
    return {
      returnType: "string",
      params: [],
    };
  }

  const returnType = match[1].trim();
  const paramsSource = match[2].trim();
  const params = paramsSource
    ? paramsSource.split(",").map((param) => {
        const cleaned = param.trim().replace(/\s*=\s*.*$/, "");
        const nameMatch = cleaned.match(/([A-Za-z_]\w*)\s*$/);
        if (!nameMatch) return null;
        const name = nameMatch[1];
        const type = cleaned.slice(0, cleaned.lastIndexOf(name)).trim();
        return { name, type };
      }).filter(Boolean)
    : [];

  return {
    returnType: returnType || "string",
    params,
  };
};

const inferCppTypeFromValue = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "vector<int>";
    }

    return `vector<${inferCppTypeFromValue(value[0])}>`;
  }

  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") return Number.isInteger(value) ? "int" : "double";

  return "string";
};

const buildSignatureFromCaseKeys = (existingSignature = "", testCases = []) => {
  const referenceCase = testCases.find((testCase) => testCase && typeof testCase === "object" && !Array.isArray(testCase));
  const signatureParts = extractCppSignatureParts(existingSignature);

  if (!referenceCase) {
    return existingSignature || `${signatureParts.returnType || "string"} solve(const string& rawInput)`;
  }

  const caseKeys = Object.keys(referenceCase).filter((key) => key !== "output" && key !== "hidden");
  if (caseKeys.length === 0) {
    return existingSignature || `${signatureParts.returnType || "string"} solve(const string& rawInput)`;
  }

  const existingParamsByName = new Map(signatureParts.params.map((param) => [param.name, param.type]));
  const rebuiltParams = caseKeys.map((key) => {
    const inferredType = inferCppTypeFromValue(referenceCase[key]);
    const existingType = existingParamsByName.get(key);
    return `${existingType || inferredType} ${key}`;
  });

  return `${signatureParts.returnType || "string"} solve(${rebuiltParams.join(", ")})`;
};

const createExamplesFromCases = (visibleTestCases = []) =>
  visibleTestCases.slice(0, 2).map((testCase) => {
    const inputShape = Object.entries(testCase)
      .filter(([key]) => key !== "output" && key !== "hidden")
      .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
      .join(", ");

    return {
      input: inputShape,
      output: String(testCase.output || ""),
      explanation: "",
    };
  });

const normalizeCodingSource = (source = null) => {
  if (!source || typeof source !== "object") return null;
  return {
    collection: String(source.collection || ""),
    questionId: String(source.questionId || ""),
    title: String(source.title || ""),
    platform: String(source.platform || ""),
    dataset: String(source.dataset || source.source || ""),
    difficulty: normalizeDifficulty(source.difficulty, "hard"),
    tags: Array.isArray(source.tags) ? source.tags.map(String) : [],
    rawContent: String(source.rawContent || ""),
    verifiedByLLM: Boolean(source.verifiedByLLM),
  };
};

const normalizeCodingPayload = (coding, fallbackQuestion, questionText = "") => {
  const fallback = fallbackQuestion?.coding || createGenericCodingPayload(questionText);
  const normalizeCase = (testCase) => ({
    ...testCase,
    output: String(testCase?.output ?? ""),
    hidden: Boolean(testCase?.hidden),
  });
  const visibleTestCases = Array.isArray(coding?.visibleTestCases) && coding.visibleTestCases.length > 0
    ? coding.visibleTestCases.map(normalizeCase)
    : fallback.visibleTestCases;
  const hiddenTestCases = Array.isArray(coding?.hiddenTestCases) && coding.hiddenTestCases.length > 0
    ? coding.hiddenTestCases.map((testCase) => ({ ...normalizeCase(testCase), hidden: true }))
    : fallback.hiddenTestCases;
  const repairedSignature = buildSignatureFromCaseKeys(
    String(coding?.cppSignature || fallback.cppSignature || "vector<int> solve(vector<int>& arr, int k)"),
    [...visibleTestCases, ...hiddenTestCases]
  );
  const normalizedExamples = Array.isArray(coding?.examples) && coding.examples.length > 0
    ? coding.examples.map((example) => ({
        input: String(example?.input || ""),
        output: String(example?.output || ""),
        explanation: String(example?.explanation || ""),
      }))
    : (visibleTestCases.length > 0 ? createExamplesFromCases(visibleTestCases) : fallback.examples);

  return {
    executionStyle: "leetcode",
    cppSignature: repairedSignature,
    starterCode: buildCppStarterFromSignature(questionText || fallbackQuestion?.question || "", repairedSignature),
    inputDescription: String(coding?.inputDescription || fallback.inputDescription || ""),
    outputDescription: String(coding?.outputDescription || fallback.outputDescription || ""),
    constraints: Array.isArray(coding?.constraints) && coding.constraints.length > 0
      ? coding.constraints.map(String)
      : fallback.constraints,
    examples: normalizedExamples,
    visibleTestCases,
    hiddenTestCases,
    source: normalizeCodingSource(coding?.source) || normalizeCodingSource(fallback.source),
  };
};

const normalizeCodingQuestion = (question, fallbackQuestion = null) => ({
  question: String(question?.question || (fallbackQuestion?.question || "Solve the given problem.")),
  difficulty: normalizeDifficulty(question?.difficulty, fallbackQuestion?.difficulty || "hard"),
  type: "coding",
  coding: normalizeCodingPayload(question?.coding, fallbackQuestion, String(question?.question || "")),
});

const createGenericCodingPayload = (questionText = "") => {
  const cppSignature = "string solve(const string& rawInput)";
  return {
    executionStyle: "leetcode",
    cppSignature,
    starterCode: buildCppStarterFromSignature(questionText, cppSignature),
    inputDescription: "Parse the required values from the raw input string inside solve(...).",
    outputDescription: "Return the final answer as a string.",
    constraints: ["Use an efficient solution that matches the problem requirements."],
    examples: [],
    visibleTestCases: [],
    hiddenTestCases: [],
    source: null,
  };
};

const buildCodingSourceFromKnowledgeHit = (hit) => ({
  collection: String(hit?.metadata?.category || "problems"),
  questionId: String(hit?.metadata?.questionId || hit?.id || ""),
  title: String(hit?.metadata?.title || ""),
  platform: String(hit?.metadata?.platform || "generic"),
  dataset: String(hit?.metadata?.source || ""),
  difficulty: normalizeDifficulty(hit?.metadata?.difficulty, "hard"),
  tags: Array.isArray(hit?.metadata?.tags) ? hit.metadata.tags.map(String) : [],
  rawContent: String(hit?.content || ""),
  verifiedByLLM: false,
});

const buildKnowledgeSeedContext = (label, hits = []) =>
  hits.map((hit, index) => {
    const title = String(hit?.metadata?.title || `Candidate ${index + 1}`);
    const difficulty = normalizeDifficulty(hit?.metadata?.difficulty, "medium");
    const statement = stripHtml(extractLabeledBlock(hit?.content || "", "Problem Statement") || hit?.content || "").slice(0, 700);
    return `${label} Candidate ${index + 1}:
Title: ${title}
Difficulty: ${difficulty}
Source: ${String(hit?.metadata?.source || "vector_db")}
Content:
${statement}`;
  }).join("\n---\n");

const buildFallbackCodingQuestionFromKnowledgeHit = (hit) => {
  const source = buildCodingSourceFromKnowledgeHit(hit);
  const title = source.title || "Vector DB Coding Problem";
  const statement = stripHtml(extractLabeledBlock(hit?.content || "", "Problem Statement")) || title;
  const signatureBlock = extractLabeledBlock(hit?.content || "", "Function Signature / Starter Code");
  const constraintsBlock = extractLabeledBlock(hit?.content || "", "Constraints");
  const sampleBlock = extractLabeledBlock(hit?.content || "", "Examples / Sample Testcases");
  const signature = extractFirstCppSignature(signatureBlock) || "string solve(const string& rawInput)";
  const constraints = constraintsBlock
    ? constraintsBlock.split(/\n+/).map((line) => stripHtml(line)).filter(Boolean).slice(0, 5)
    : ["Use an efficient solution that matches the original problem requirements."];
  const exampleText = stripHtml(sampleBlock);

  return createCodingQuestion({
    question: statement,
    difficulty: source.difficulty,
    cppSignature: signature,
    inputDescription: "Implement the function using the parameters in the verified signature.",
    outputDescription: "Return the result expected by the original problem statement.",
    constraints,
    examples: exampleText ? [{ input: exampleText, output: "", explanation: "Sample details extracted from the vector DB source." }] : [],
    visibleTestCases: [],
    hiddenTestCases: [],
    source,
  });
};

const selectCodingKnowledgeHit = (hits = []) => {
  if (!Array.isArray(hits) || hits.length === 0) return null;
  const hardHits = hits.filter((hit) => normalizeDifficulty(hit?.metadata?.difficulty, "medium") === "hard");
  const pool = hardHits.length > 0 ? hardHits : hits;
  return clonePlainObject(pool[Math.floor(Math.random() * pool.length)]);
};

export const verifyCodingQuestionFromKnowledgeHit = async (hit, { role, company }) => {
  const fallbackQuestion = buildFallbackCodingQuestionFromKnowledgeHit(hit);
  const source = buildCodingSourceFromKnowledgeHit(hit);
  const sourceReference = [
    source.title ? `Title: ${source.title}` : "",
    source.difficulty ? `Difficulty: ${source.difficulty}` : "",
    source.tags.length > 0 ? `Tags: ${source.tags.join(", ")}` : "",
    extractLabeledBlock(hit?.content || "", "Problem Statement")
      ? `Problem Statement:\n${extractLabeledBlock(hit?.content || "", "Problem Statement")}`
      : `Problem Statement:\n${hit?.content || ""}`,
    extractLabeledBlock(hit?.content || "", "Function Signature / Starter Code")
      ? `Function Signature / Starter Code:\n${extractLabeledBlock(hit?.content || "", "Function Signature / Starter Code")}`
      : "",
    extractLabeledBlock(hit?.content || "", "Constraints")
      ? `Constraints:\n${extractLabeledBlock(hit?.content || "", "Constraints")}`
      : "",
    extractLabeledBlock(hit?.content || "", "Examples / Sample Testcases")
      ? `Examples / Sample Testcases:\n${extractLabeledBlock(hit?.content || "", "Examples / Sample Testcases")}`
      : "",
  ].filter(Boolean).join("\n\n");

  const prompt = `You are verifying and structuring a coding interview problem that was retrieved from a vector database.

Role: ${role}
Company: ${company}

Use ONLY the source material below as the source of truth for the problem. You may reorganize it into clean JSON and derive consistent sample/hidden cases, but do not switch to a different problem.

Source material:
${sourceReference}

Return strictly valid JSON only:
{
  "question": "Clean problem statement for the interview UI",
  "difficulty": "easy|medium|hard",
  "cppSignature": "vector<int> solve(vector<int>& arr, int k)",
  "inputDescription": "How the function parameters should be interpreted",
  "outputDescription": "How the function output is compared",
  "constraints": ["constraint 1", "constraint 2"],
  "examples": [
    { "input": "arr = [1,2,3], k = 2", "output": "3", "explanation": "short explanation" }
  ],
  "visibleTestCases": [
    { "arr": [1,2,3], "k": 2, "output": "3" },
    { "arr": [4,5,6], "k": 1, "output": "6" }
  ],
  "hiddenTestCases": [
    { "arr": [7,8,9], "k": 2, "output": "9" },
    { "arr": [2,2,2], "k": 1, "output": "2" }
  ]
}

Rules:
- Keep the exact same problem intent as the source material.
- Use a LeetCode-style C++ Solution method signature and rename the method to solve(...).
- Preserve parameter names between the signature and every test case.
- If the source already implies a signature or sample shape, keep it aligned.
- Keep exactly 2 visible test cases and 2 hidden test cases when possible.
- Do not include markdown fences or commentary.`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, {});
    return normalizeCodingQuestion({
      question: String(parsed?.question || fallbackQuestion.question),
      difficulty: normalizeDifficulty(parsed?.difficulty, fallbackQuestion.difficulty),
      type: "coding",
      coding: {
        ...parsed,
        source: {
          ...source,
          verifiedByLLM: true,
        },
      },
    }, fallbackQuestion);
  } catch (_error) {
    return {
      ...fallbackQuestion,
      coding: {
        ...fallbackQuestion.coding,
        source,
      },
    };
  }
};

const enrichCodingQuestion = async (question, { role, company }) => {
  const questionText = String(question?.question || "").trim();

  if (!questionText) {
    throw new Error("enrichCodingQuestion: no question text provided");
  }

  const prompt = `You are designing coding-round metadata for this EXACT problem statement:
"${questionText}"

Role: ${role}
Company: ${company}

Return strictly valid JSON only:
{
  "cppSignature": "vector<int> solve(vector<int>& arr, int k)",
  "inputDescription": "How the function inputs should be interpreted",
  "outputDescription": "What the function should return and how it will be compared",
  "constraints": ["constraint 1", "constraint 2"],
  "examples": [
    { "input": "arr = [4,5,4,6,5,7,8,6], k = 3", "output": "5 5 6 6 7 7", "explanation": "short explanation" }
  ],
  "visibleTestCases": [
    { "arr": [4,5,4,6,5,7,8,6], "k": 3, "output": "5 5 6 6 7 7" },
    { "arr": [1,1,1,1,1], "k": 3, "output": "-1 -1 -1" }
  ],
  "hiddenTestCases": [
    { "arr": [2,3,2,4,5,4,6], "k": 4, "output": "3 3 2 5" },
    { "arr": [9], "k": 1, "output": "9" }
  ]
}

Rules:
- The signature, examples, visible tests, and hidden tests must all match the exact question text above.
- Use C++ and a LeetCode-style Solution method signature only.
- Visible and hidden test cases must use the exact same parameter names as the signature.
- Do not invent a different problem.
- Keep visible test cases to 2 and hidden test cases to 2.`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, {});
    return {
      question: questionText,
      difficulty: ["easy", "medium", "hard"].includes(question?.difficulty) ? question.difficulty : "hard",
      type: "coding",
      coding: {
        ...normalizeCodingPayload(parsed, null, questionText),
      },
    };
  } catch (_error) {
    return {
      question: questionText,
      difficulty: ["easy", "medium", "hard"].includes(question?.difficulty) ? question.difficulty : "hard",
      type: "coding",
      coding: createGenericCodingPayload(questionText),
    };
  }
};

const ensureCodingQuestion = (sections = [], preferredCodingQuestion = null) =>
  sections.map((section) => {
    if (!/problem solving/i.test(section.title)) return section;

    const questions = Array.isArray(section.questions) ? section.questions : [];
    const normalizedQuestions = questions.map((question) =>
      question.type === "coding" ? normalizeCodingQuestion(question) : question
    );
    const existingCoding = normalizedQuestions.find((question) => question.type === "coding");
    const chosenCodingQuestion = preferredCodingQuestion
      ? clonePlainObject(preferredCodingQuestion)
      : existingCoding;

    if (!chosenCodingQuestion) return section;

    const nonCodingQuestions = normalizedQuestions.filter((question) => question.type !== "coding");

    return {
      ...section,
      questions: [chosenCodingQuestion, ...nonCodingQuestions].slice(0, Math.max(1, questions.length || 1)),
    };
  });

const dedupeSections = (sections = []) => {
  const seen = new Set();
  return sections.map((section) => {
    const uniqueQuestions = (Array.isArray(section.questions) ? section.questions : []).filter((question) => {
      const normalized = normalizeQuestionText(question.question || "");
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
    return { ...section, questions: uniqueQuestions };
  }).filter((section) => section.questions.length > 0 || /problem solving/i.test(section.title));
};

// ─── LLM Provider Calls ─────────────────────────────────────

const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY (or LLM_API_KEY) is missing");

  const model = getLLMModel("gemini");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

const callOpenAI = async (prompt) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY (or LLM_API_KEY) is missing");

  const model = getLLMModel("openai");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return valid JSON only. Do not include markdown fences." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content || "";
};

const callGroqWithKey = async (apiKey, prompt) => {
  const model = getLLMModel("groq");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return valid JSON only. Do not include markdown fences." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content || "";
};

const callGroq = async (prompt) => {
  const primaryKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (!primaryKey) throw new Error("GROQ_API_KEY (or LLM_API_KEY) is missing");

  try {
    return await callGroqWithKey(primaryKey, prompt);
  } catch (primaryError) {
    const isRateLimit = String(primaryError?.message || "").includes("429");
    const extraKey = process.env.GROQ_API_KEY_EXTRA || process.env.groq_api_key_extra;

    if (isRateLimit && extraKey) {
      console.warn("Primary Groq key rate-limited, switching to extra key.");
      return callGroqWithKey(extraKey, prompt);
    }

    throw primaryError;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const askLLM = async (prompt, retries = 1) => {
  const provider = getLLMProvider();
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (provider === "groq") return await callGroq(prompt);
      if (provider === "openai") return await callOpenAI(prompt);
      return await callGemini(prompt);
    } catch (error) {
      lastError = error;
      const isServerError = /\b5\d{2}\b/.test(String(error?.message || ""));

      if (isServerError && attempt < retries) {
        await sleep(2000);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

// ─── Resume Skill Extraction ────────────────────────────────

const fallbackSkillExtraction = (resumeText = "") => {
  const normalized = resumeText.toLowerCase();
  const knownSkills = [
    "javascript", "typescript", "react", "node", "express", "mongodb",
    "python", "sql", "docker", "aws", "java", "c++", "go", "rust",
    "angular", "vue", "next.js", "graphql", "redis", "kubernetes",
    "git", "linux", "html", "css", "tailwind", "postgresql",
  ];

  return {
    technical_skills: knownSkills.filter((skill) => normalized.includes(skill)),
    experience_summary: resumeText.slice(0, 500),
    experience_years: 0,
    education: "",
    projects: [],
  };
};

export const extractSkillsFromResume = async (resumeText) => {
  const fallback = fallbackSkillExtraction(resumeText || "");

  const prompt = `Analyze this resume text carefully and extract information. Return strictly valid JSON with these keys:
- technical_skills: string array of all programming languages, frameworks, tools, databases, cloud services found
- experience_summary: string summary of work experience (max 500 chars)
- experience_years: number of total years of experience (estimate if not clear)
- education: string describing highest education
- projects: string array of notable project names/descriptions (max 5)

Resume text:
${resumeText || "No resume provided"}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      technical_skills: Array.isArray(parsed.technical_skills)
        ? parsed.technical_skills.map(String)
        : fallback.technical_skills,
      experience_summary:
        typeof parsed.experience_summary === "string"
          ? parsed.experience_summary
          : fallback.experience_summary,
      experience_years: Number(parsed.experience_years) || 0,
      education: typeof parsed.education === "string" ? parsed.education : "",
      projects: Array.isArray(parsed.projects) ? parsed.projects.map(String) : [],
    };
  } catch (_error) {
    return fallback;
  }
};

// ─── Generate ALL Questions at Once (in Sections) ───────────

export const generateAllQuestions = async ({ resumeData, role, company }) => {
  // Get RAG context for better question generation
  let ragContext = "";
  let preferredCodingQuestion = null;
  try {
    const [interviewCtx, companyCtx, techSeeds, personalSeeds] = await Promise.all([
      retrieveInterviewContext({ role, company }),
      retrieveCompanyContext({ company, role }),
      sampleKnowledge({ collection: "tech_questions", limit: 3, maxCandidates: 80 }),
      sampleKnowledge({ collection: "personal_questions", limit: 3, maxCandidates: 80 }),
    ]);

    if (interviewCtx.length > 0) {
      ragContext += "\n\nPast high-quality interview examples for reference:\n";
      ragContext += interviewCtx.map((c) => c.content).join("\n---\n");
    }
    if (companyCtx) {
      ragContext += "\n\nCompany-specific context:\n" + companyCtx;
    }
    if (techSeeds.length > 0) {
      ragContext += "\n\nVector DB technical-question seeds (use these as the primary source when relevant):\n";
      ragContext += buildKnowledgeSeedContext("Technical", techSeeds);
    }
    if (personalSeeds.length > 0) {
      ragContext += "\n\nVector DB personal-question seeds (use these as the primary source when relevant):\n";
      ragContext += buildKnowledgeSeedContext("Behavioral", personalSeeds);
    }
  } catch (_error) {
    // RAG context is optional
  }

  // Get coding question from MongoDB dataset
  try {
    preferredCodingQuestion = await getRandomDatasetCodingQuestion();
  } catch (_error) {
    console.warn("MongoDB dataset coding question fetch failed:", _error.message);
  }

  const prompt = `You are an expert interviewer for ${company} hiring for the role: ${role}.

Candidate profile:
- Skills: ${(resumeData.technical_skills || []).join(", ") || "Not specified"}
- Experience: ${resumeData.experience_summary || "Not specified"}
- Years of experience: ${resumeData.experience_years || "Unknown"}
- Education: ${resumeData.education || "Not specified"}
${ragContext}

Generate a complete set of interview questions organized into sections. Create 8 questions total across 5 sections.
Note: The coding question for "Problem Solving" section will be sourced separately from a dataset. You do NOT need to generate a coding question.

Return strictly valid JSON with this structure:
{
  "sections": [
    {
      "title": "Section Name",
      "description": "Brief description of what this section assesses",
      "questions": [
        {
          "question": "The interview question text",
          "difficulty": "easy|medium|hard",
          "type": "text|coding",
          "coding": {
            "executionStyle": "leetcode",
            "cppSignature": "vector<int> solve(vector<int>& arr, int k)",
            "starterCode": "Optional starter code string",
            "inputDescription": "How the function inputs should be interpreted",
            "outputDescription": "How the function output should be formatted",
            "constraints": ["constraint 1", "constraint 2"],
            "examples": [
              { "input": "arr = [4,5,4,6,5,7,8,6], k = 3", "output": "5 5 6 6 7 7", "explanation": "short explanation" }
            ],
            "visibleTestCases": [
              { "arr": [4,5,4,6,5,7,8,6], "k": 3, "output": "5 5 6 6 7 7" }
            ],
            "hiddenTestCases": [
              { "arr": [2,3,2,4,5,4,6], "k": 4, "output": "3 3 2 5" }
            ]
          }
        }
      ]
    }
  ]
}

The 5 sections MUST be:
1. "Introduction & Background" (2 easy questions based SOLELY on their resume and experience)
2. "Technical Skills" (3 medium/hard questions):
   - Question 1: Pick ONE specific technology/framework/tool from the candidate's resume skills list and ask a deep, industry-level question that tests production-grade knowledge (e.g. performance tuning, internal architecture, advanced patterns, real-world pitfalls). This question MUST reference the chosen resume skill by name.
   - Question 2: Ask about a core technical concept that a ${role} at ${company} must know. Do NOT use the candidate's resume — base this purely on what ${company} values for this role (e.g. system internals, distributed systems, concurrency, security, CI/CD).
   - Question 3: Ask about another industry-standard technology or practice relevant to ${role} at ${company} that is NOT from the candidate's resume. Focus on what the company's tech stack or domain demands.
3. "System Design" (Exactly 1 hard question presenting a realistic, scalable system design scenario relevant to ${company})
4. "Problem Solving" (Leave this section with an empty questions array — the coding question will be injected from an external dataset)
5. "Behavioral & Cultural Fit" (2 easy/medium questions assessing soft skills and cultural alignment)

Make questions specific to ${company} and the ${role} role.
Use retrieved vector DB question seeds whenever they are available. You may lightly adapt wording for the role and company, but keep the original question intent.

Do NOT generate a coding question — it will be sourced from a curated dataset and injected automatically.`;

  const raw = await askLLM(prompt);
  const parsed = parseJSONObject(raw, null);

  if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    throw new Error("LLM returned empty or invalid sections for question generation");
  }

  // Validate and normalize
  const normalizedSections = await Promise.all(parsed.sections.map(async (section) => ({
    title: String(section.title || "General"),
    description: String(section.description || ""),
    questions: Array.isArray(section.questions)
      ? await Promise.all(section.questions.map(async (q) => {
          if (q.type === "coding") {
            if (preferredCodingQuestion) {
              return clonePlainObject(preferredCodingQuestion);
            }
            return enrichCodingQuestion(q, { role, company });
          }

          return {
            question: String(q.question || "Tell me about your experience."),
            difficulty: normalizeDifficulty(q.difficulty, "medium"),
            type: "text",
          };
        }))
      : [],
  })));

  return ensureCodingQuestion(dedupeSections(normalizedSections), preferredCodingQuestion);
};

// ─── Evaluate Answer ────────────────────────────────────────

export const evaluateAnswer = async ({ question, answer, role, company, conversationHistory }) => {
  const fallback = {
    feedback: "Your answer shows understanding of the topic. Consider adding more specific examples and technical depth.",
    score: 6,
    strengths: ["Relevant response"],
    improvements: ["Add concrete metrics", "Discuss trade-offs"],
    model_answer: "A strong answer includes context, design choices, constraints, measurable impact, and lessons learned.",
    should_counter_question: false,
    counter_question: null,
  };

  const historyContext = (conversationHistory || [])
    .slice(-6)
    .map((h) => `${h.role}: ${h.content}`)
    .join("\n");

  let rubricContext = "";
  let exampleContext = "";
  try {
    const [context, examples] = await Promise.all([
      retrieveCompanyContext({ company, role, query: `${company} ${role} answer evaluation rubric for: ${question}` }),
      retrieveInterviewContext({
        role,
        company,
        query: `${role} interview answer example for question: ${question}`,
        limit: 3,
      }),
    ]);

    if (context) {
      rubricContext = `\nIdeal Requirements / Scoring Rubric retrieved from company database:\n${context}\n\n*CRITICAL INSTRUCTION*: You MUST base your evaluation and score strictly on whether the candidate's answer covers the points in this rubric, rather than generic standards.`;
    }

    if (examples.length > 0) {
      exampleContext = `\nRelevant high-scoring interview examples:\n${examples.map((item) => item.content).join("\n---\n")}`;
    }
  } catch (_error) {
    // Graceful degradation if RAG is unavailable
  }

  const prompt = `You are an expert interviewer for ${company}, role: ${role}.
${rubricContext}
${exampleContext}

Interview context so far:
${historyContext}

Current question: ${question}
Candidate's answer: ${answer}

Evaluate this answer and decide if a follow-up counter question is needed.

Return strictly valid JSON:
{
  "feedback": "Detailed feedback on the answer (2-3 sentences)",
  "score": <number 1-10>,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "model_answer": "What an ideal answer would include (2-3 sentences)",
  "should_counter_question": <boolean - ONLY true if the candidate missed expected areas and you need to ask them about those specific missed areas. False otherwise.>,
  "counter_question": "A follow-up question addressing the specific expected areas they missed (or null if should_counter_question is false)"
}

If the candidate's answer touches on most expected areas, set should_counter_question to false and counter_question to null.
Ask a follow-up ONLY when the answer is clearly unsatisfactory:
1. it is off-topic or answers a different question, or
2. it misses the core requirement badly enough that you cannot fairly assess the candidate.

Do not ask a follow-up for acceptable, partially correct, or merely imperfect answers.
There can be at most one follow-up for the main question.
If the candidate answer is basically "(Skipped)" or says they do not know, you may ask at most one simple recovery question only if it is genuinely useful.
If the candidate answer is off-topic, addresses a different question, or clearly avoids the main requirement, set should_counter_question to true.`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    const normalizedAnswer = String(answer || "").trim().toLowerCase();
    const skippedAnswer = normalizedAnswer === "(skipped)" || normalizedAnswer.includes("i don't know");
    const offTopicAnswer = isLikelyOffTopic(question, answer);
    const answerWordCount = countWords(answer);
    const normalizedScore = clampScore(parsed.score);
    const clearlyUnsatisfactory =
      offTopicAnswer
      || normalizedScore <= 3
      || (normalizedScore <= 4 && answerWordCount < 10);
    const suggestedCounterQuestion =
      typeof parsed.counter_question === "string" && parsed.counter_question.trim().length > 0
        ? parsed.counter_question
        : `Please answer the original question directly and cover the main missing areas: ${question}`;
    const allowCounterQuestion =
      !skippedAnswer
      && (Boolean(parsed.should_counter_question) || (offTopicAnswer && clearlyUnsatisfactory));

    return {
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : fallback.feedback,
      score: normalizedScore,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : fallback.strengths,
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : fallback.improvements,
      model_answer: typeof parsed.model_answer === "string" ? parsed.model_answer : fallback.model_answer,
      should_counter_question: allowCounterQuestion,
      counter_question: allowCounterQuestion ? suggestedCounterQuestion : null,
    };
  } catch (_error) {
    console.error("LLM ERROR (evaluateAnswer):", _error?.message || _error);
    // Even on LLM failure, apply local heuristics for counter questions
    const normalizedAnswer = String(answer || "").trim().toLowerCase();
    const skippedAnswer = normalizedAnswer === "(skipped)" || normalizedAnswer.includes("i don't know");
    const offTopicAnswer = isLikelyOffTopic(question, answer);
    if (offTopicAnswer && !skippedAnswer) {
      return {
        ...fallback,
        should_counter_question: true,
        counter_question: `It seems your answer may not have addressed the question directly. Could you please answer: ${question}`,
      };
    }
    return fallback;
  }
};

// ─── Counter Question Evaluation ────────────────────────────

export const evaluateCounterAnswer = async ({ originalQuestion, originalAnswer, counterQuestion, counterAnswer, role, company }) => {
  const fallback = {
    feedback: "Thank you for the additional detail.",
    score_adjustment: 0,
  };

  const prompt = `You are an expert interviewer for ${company}, role: ${role}.

Original question: ${originalQuestion}
Original answer: ${originalAnswer}
Follow-up question: ${counterQuestion}
Follow-up answer: ${counterAnswer}

Evaluate the follow-up answer. Return JSON:
{
  "feedback": "Brief feedback on the follow-up answer",
  "score_adjustment": <number -2 to +2, how much to adjust the original question's score based on this follow-up>
}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : fallback.feedback,
      score_adjustment: Math.max(-2, Math.min(2, Number(parsed.score_adjustment) || 0)),
    };
  } catch (_error) {
    return fallback;
  }
};

// ─── Doubt Resolution ───────────────────────────────────────

export const resolveDoubt = async ({ doubt, currentQuestion, role, company, conversationHistory }) => {
  const fallback = {
    response: `For this current question, explain the exact requirement first, then your approach in 2-3 clear steps. Mention one trade-off or edge case relevant to this question. If you want, I can also give a broader ${role} interview tip.`,
    hint: null,
  };

  const doubtText = String(doubt || "").toLowerCase();
  const explicitGeneralIntent = /\b(general|overall|in general|generally|skills required|what skills|interview tips|preparation|prepare|resume|career|role expectations|company culture)\b/.test(doubtText);
  const likelyAmbiguousDoubt = !explicitGeneralIntent && (
    doubtText.trim().split(/\s+/).length <= 6
    || /\b(this|that|it|can you explain|not clear|confused|what do you mean|which one|how)\b/.test(doubtText)
  );
  const focusMode = explicitGeneralIntent ? "general_allowed" : "question_focused";

  const historyContext = (conversationHistory || [])
    .slice(-6)
    .map((h) => `${h.role}: ${h.content}`)
    .join("\n");

  const prompt = `You are a helpful and encouraging AI interviewer for ${company}, role: ${role}.

The candidate is currently answering this question: "${currentQuestion}"

Interview context:
${historyContext}

The candidate has a doubt/clarification request: "${doubt}"

Focus mode: ${focusMode}
Ambiguity signal: ${likelyAmbiguousDoubt ? "high" : "low"}

First, identify the user's intent from the doubt text.
- Default behavior: Treat the doubt as being about the CURRENT QUESTION, even if the user does not mention the question explicitly.
- If the doubt is ambiguous, anchor your reply to the current question's requirement and expected approach.
- Only switch to general role/company guidance if the user EXPLICITLY asks a general doubt.
- If they ask for full direct solution, avoid giving the full answer and provide guidance/hint instead.

If you are not sure what they mean:
- Start with one short confirmation question (for example: "Quick check: do you mean X or Y?").
- Then provide a tentative helpful direction tied to the current question.

Important behavior requirements:
- Do NOT just restate the interview question unless they explicitly asked for rephrasing.
- Do NOT give generic filler. Address the exact words of the doubt.
- In question-focused mode, include at least one sentence tied to the current question context.
- Keep response practical and specific to ${role} at ${company}.
- Keep it short and simple.
- Response should be concise but complete: 3-4 short sentences, ideally 60-100 words.

Return JSON:
{
  "response": "Helpful concise answer to their exact doubt (3-4 short sentences, 60-100 words)",
  "hint": "Optional brief hint about approaching the answer (or null if not needed)",
  "needs_confirmation": "boolean; true when intent is unclear",
  "confirmation_question": "short clarification question when needs_confirmation=true, else null"
}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    const compact = (text) => {
      const cleaned = String(text || "").replace(/\s+/g, " ").trim();
      const shortParagraph = cleaned
        .split(/(?<=[.!?])\s+/)
        .slice(0, 4)
        .join(" ");
      return shortParagraph.length > 420
        ? shortParagraph.slice(0, 417).trimEnd() + "..."
        : shortParagraph;
    };

    return {
      response: (() => {
        const baseResponse = compact(typeof parsed.response === "string" ? parsed.response : fallback.response);
        const needsConfirmation = Boolean(parsed.needs_confirmation) || likelyAmbiguousDoubt;
        const confirmQ = typeof parsed.confirmation_question === "string"
          ? compact(parsed.confirmation_question)
          : null;

        if (!needsConfirmation) return baseResponse;

        const promptQ = confirmQ || "Quick check: are you asking about this current question or a general interview tip?";
        if (baseResponse.toLowerCase().includes("quick check:") || baseResponse.includes("?")) {
          return baseResponse;
        }

        return `${promptQ} ${baseResponse}`;
      })(),
      hint: typeof parsed.hint === "string" ? compact(parsed.hint) : null,
    };
  } catch (_error) {
    console.error("LLM ERROR (resolveDoubt):", _error?.message || _error);
    return {
      response: `Regarding your doubt about the current question: "${(currentQuestion || "").slice(0, 120)}" — try breaking the problem into smaller parts. Think about what the question is really asking, identify the core concept, and outline your approach step by step. Feel free to ask a more specific doubt if you need further help.`,
      hint: "Focus on the key requirement of the question and think about edge cases.",
    };
  }
};

// ─── Final Report Generation ────────────────────────────────

export const generateReport = async (sessionContext, evaluations, sections) => {
  const numeric = evaluations
    .map((item) => Number(item.score))
    .filter((score) => !Number.isNaN(score));
  const fallbackOverall = numeric.length
    ? Math.round(numeric.reduce((sum, score) => sum + score, 0) / numeric.length)
    : 0;

  const fallback = {
    overall_score: fallbackOverall,
    summary: "Good baseline performance with room to improve depth and quantified impact.",
    strengths: ["Structured thinking", "Consistent responses"],
    weaknesses: ["Limited use of metrics", "Some answers lacked technical depth"],
    recommendations: [
      "Practice STAR-based storytelling with numbers",
      "Review system design patterns and scaling trade-offs",
      "Do timed mock interviews for concise communication",
    ],
    section_scores: (sections || []).map((s) => ({
      sectionTitle: s.title,
      score: fallbackOverall,
      feedback: "Adequate performance in this section.",
    })),
    skill_assessment: [],
  };

  const sectionInfo = (sections || []).map((s) => s.title).join(", ");

  const prompt = `Create a comprehensive final interview report for role ${sessionContext.role} at ${sessionContext.company}.

Interview sections: ${sectionInfo}
Candidate skills: ${(sessionContext.resumeSkills || []).join(", ")}

Question-by-question evaluations:
${JSON.stringify(evaluations, null, 2)}

Return strictly valid JSON:
{
  "overall_score": <number 1-10>,
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["actionable recommendation1", "actionable recommendation2", "actionable recommendation3"],
  "section_scores": [
    { "sectionTitle": "Section Name", "score": <1-10>, "feedback": "Brief section feedback" }
  ],
  "skill_assessment": [
    { "skill": "skill_name", "level": "beginner|intermediate|advanced|expert", "score": <1-10> }
  ]
}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      overall_score: clampScore(parsed.overall_score),
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : fallback.strengths,
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : fallback.weaknesses,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String)
        : fallback.recommendations,
      section_scores: Array.isArray(parsed.section_scores)
        ? parsed.section_scores.map((s) => ({
            sectionTitle: String(s.sectionTitle || ""),
            score: clampScore(s.score),
            feedback: String(s.feedback || ""),
          }))
        : fallback.section_scores,
      skill_assessment: Array.isArray(parsed.skill_assessment)
        ? parsed.skill_assessment.map((s) => ({
            skill: String(s.skill || ""),
            level: ["beginner", "intermediate", "advanced", "expert"].includes(s.level)
              ? s.level
              : "intermediate",
            score: clampScore(s.score),
          }))
        : [],
    };
  } catch (_error) {
    return fallback;
  }
};

// ─── Clean Question Text for Display ────────────────────────

/**
 * Send raw LeetCode question text to LLM to get a clean structured version
 * for frontend display. Extracts description, examples, constraints, and
 * test case inputs/outputs from the raw markdown.
 */
export const cleanQuestionForDisplay = async (rawQuestion, title = "") => {
  const fallback = {
    title: title || "Coding Challenge",
    description: rawQuestion,
    examples: [],
    constraints: [],
    testCases: [],
  };

  const prompt = `You are a LeetCode question formatter. Given raw question markdown, extract and return ONLY valid JSON with this structure:

{
  "title": "the problem title (e.g. Two Sum)",
  "description": "clean problem description paragraph(s) ONLY — no examples, no constraints, no extra formatting artifacts. Keep it concise and readable.",
  "examples": [
    {
      "input": "exact input from the example e.g. nums = [2,7,11,15], target = 9",
      "output": "exact output e.g. [0,1]",
      "explanation": "explanation if given, or empty string"
    }
  ],
  "constraints": ["constraint 1", "constraint 2"],
  "testCases": [
    { "input": "the input as a JSON object matching function params e.g. {\\"nums\\": [2,7,11,15], \\"target\\": 9}", "expectedOutput": "expected output value e.g. [0,1]" }
  ]
}

Rules:
- "description" must NOT contain examples or constraints — only the problem statement.
- "examples" must list ALL examples from the text with their exact Input, Output, and Explanation.
- "testCases" must extract the same inputs/outputs as structured JSON objects suitable for programmatic use.
- "constraints" must list all constraints like "1 <= nums.length <= 10^4".
- Remove all formatting artifacts, escaped quotes, zero-width spaces, HTML tags.
- Return ONLY the JSON object, nothing else.

Raw question:
${rawQuestion}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      title: typeof parsed.title === "string" && parsed.title ? parsed.title : fallback.title,
      description: typeof parsed.description === "string" && parsed.description ? parsed.description : fallback.description,
      examples: Array.isArray(parsed.examples)
        ? parsed.examples.map((ex) => ({
            input: String(ex?.input || ""),
            output: String(ex?.output || ""),
            explanation: String(ex?.explanation || ""),
          }))
        : [],
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints.map(String) : [],
      testCases: Array.isArray(parsed.testCases)
        ? parsed.testCases.map((tc) => ({
            input: typeof tc?.input === "string" ? tc.input : JSON.stringify(tc?.input || {}),
            expectedOutput: typeof tc?.expectedOutput === "string" ? tc.expectedOutput : JSON.stringify(tc?.expectedOutput || ""),
          }))
        : [],
    };
  } catch (_error) {
    return fallback;
  }
};
