import DatasetQuestion from "../models/DatasetQuestion.js";

const normalizeDifficulty = (value, fallback = "medium") => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : fallback;
};

/**
 * Strip formatting artifacts from raw LeetCode question markdown.
 *  - zero-width spaces (\u200b, \uFEFF)
 *  - escaped single quotes (\'x\' → 'x')
 *  - trailing spaces inside quoted strings ("aa " → "aa")
 *  - HTML entities (&nbsp; &lt; &gt; &amp; &quot;)
 *  - collapse 3+ consecutive newlines into 2
 */
const cleanQuestionText = (raw) => {
  let text = String(raw || "");
  text = text.replace(/[\u200B\uFEFF]/g, "");
  text = text.replace(/\\'/g, "'");
  text = text.replace(/" +"/g, '"');
  text = text.replace(/ +"/g, '"');
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
};

const buildCppStarterFromSignature = (
  _questionText = "",
  cppSignature = "string solve(const string& rawInput)"
) => `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    ${cppSignature} {\n        // TODO: write your solution\n    }\n};\n`;

const toCodingSource = (doc) => ({
  collection: "mongodb_dataset",
  questionId: String(doc.questionId || ""),
  title: String(doc.title || ""),
  platform: "leetcode",
  dataset: String(doc.dataset || "guitaristboy/coding-questions-dataset"),
  difficulty: normalizeDifficulty(doc.difficulty, "hard"),
  tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
  rawContent: cleanQuestionText(doc.questionText || ""),
  verifiedByLLM: false,
});

export const listDatasetQuestions = async ({ limit = 100 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const rows = await DatasetQuestion.find({})
    .sort({ updatedAt: -1 })
    .limit(safeLimit)
    .lean();

  return rows.map((row) => ({
    id: row._id.toString(),
    questionId: row.questionId,
    title: row.title,
    difficulty: normalizeDifficulty(row.difficulty, "medium"),
    dataset: row.dataset || "guitaristboy/coding-questions-dataset",
    tags: Array.isArray(row.tags) ? row.tags : [],
    questionText: cleanQuestionText(row.questionText),
    coding: {
      cppSignature: row.cppSignature || "string solve(const string& rawInput)",
      constraints: Array.isArray(row.constraints) ? row.constraints : [],
      examples: Array.isArray(row.examples) ? row.examples : [],
      visibleTestCases: Array.isArray(row.visibleTestCases) ? row.visibleTestCases : [],
      hiddenTestCases: Array.isArray(row.hiddenTestCases) ? row.hiddenTestCases : [],
      source: toCodingSource(row),
    },
  }));
};

export const getRandomDatasetCodingQuestion = async () => {
  const sampled = await DatasetQuestion.aggregate([{ $sample: { size: 1 } }]);
  const row = sampled?.[0];
  if (!row) return null;

  const question = cleanQuestionText(row.questionText || row.title || "Solve this problem.");
  const cppSignature = String(row.cppSignature || "string solve(const string& rawInput)").trim();

  return {
    question,
    difficulty: normalizeDifficulty(row.difficulty, "hard"),
    type: "coding",
    coding: {
      executionStyle: "leetcode",
      cppSignature,
      starterCode: buildCppStarterFromSignature(question, cppSignature),
      inputDescription: "Implement only solve(...) using the provided function signature.",
      outputDescription: "Return the computed answer from solve(...).",
      constraints: Array.isArray(row.constraints) ? row.constraints.map(String) : [],
      examples: Array.isArray(row.examples)
        ? row.examples.map((example) => ({
            input: String(example?.input || ""),
            output: String(example?.output || ""),
            explanation: String(example?.explanation || ""),
          }))
        : [],
      visibleTestCases: Array.isArray(row.visibleTestCases) ? row.visibleTestCases : [],
      hiddenTestCases: Array.isArray(row.hiddenTestCases)
        ? row.hiddenTestCases.map((testCase) => ({ ...testCase, hidden: true }))
        : [],
      source: toCodingSource(row),
    },
  };
};
