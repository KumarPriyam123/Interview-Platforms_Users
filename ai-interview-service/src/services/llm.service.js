const DEFAULT_PROVIDER = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
const DEFAULT_MODEL = process.env.LLM_MODEL || "gemini-1.5-flash";

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
    // Continue with extraction attempt.
  }

  const start = direct.indexOf("{");
  const end = direct.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return fallback;

  const candidate = direct.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (_error) {
    return fallback;
  }
};

const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY (or LLM_API_KEY) is missing");
  }

  const model = DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
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
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY (or LLM_API_KEY) is missing");
  }

  const model = DEFAULT_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return valid JSON only. Do not include markdown fences.",
        },
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

const askLLM = async (prompt) => {
  if (DEFAULT_PROVIDER === "openai") {
    return callOpenAI(prompt);
  }
  return callGemini(prompt);
};

const fallbackSkillExtraction = (resumeText = "") => {
  const normalized = resumeText.toLowerCase();
  const knownSkills = [
    "javascript",
    "typescript",
    "react",
    "node",
    "express",
    "mongodb",
    "python",
    "sql",
    "docker",
    "aws",
  ];

  return {
    technical_skills: knownSkills.filter((skill) => normalized.includes(skill)),
    experience_summary: resumeText.slice(0, 500),
  };
};

const fallbackQuestion = ({ role, company, questionIndex, previousPerformance }) => {
  const difficultyHint =
    previousPerformance == null ? "medium" : previousPerformance >= 8 ? "advanced" : "medium";
  const templates = [
    `Tell me about yourself and why you want the ${role} role at ${company}.`,
    `Design a scalable interview scheduling flow for ${company} using MERN.`,
    "How would you optimize a MongoDB query under high read traffic?",
    "How do you handle state management and performance in large React apps?",
    "Explain a backend incident you resolved in Node.js and what you learned.",
  ];
  return `${templates[questionIndex % templates.length]} (Difficulty: ${difficultyHint})`;
};

export const extractSkillsFromResume = async (resumeText) => {
  const fallback = fallbackSkillExtraction(resumeText || "");
  const prompt = `Analyze this resume text and return JSON with keys technical_skills (string array) and experience_summary (string under 400 chars). Resume text:\n${resumeText || ""}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      technical_skills: Array.isArray(parsed.technical_skills)
        ? parsed.technical_skills.map((item) => String(item))
        : fallback.technical_skills,
      experience_summary:
        typeof parsed.experience_summary === "string"
          ? parsed.experience_summary
          : fallback.experience_summary,
    };
  } catch (_error) {
    return fallback;
  }
};

export const createInterviewPlan = async (resumeData, role, company) => {
  const fallback = [
    `Background and motivation for ${role} at ${company}`,
    `Hands-on MERN depth check around ${(resumeData.technical_skills || []).join(", ") || "core software engineering"}`,
    "Problem-solving and system design thinking",
    "Behavioral fit and communication style",
  ];

  const prompt = `Create a 4-step interview plan for role ${role} at ${company}. Candidate skills: ${(resumeData.technical_skills || []).join(", ")}. Return JSON: {"plan": ["...", "...", "...", "..."]}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, { plan: fallback });
    if (!Array.isArray(parsed.plan) || !parsed.plan.length) return fallback;
    return parsed.plan.map((item) => String(item));
  } catch (_error) {
    return fallback;
  }
};

export const generateQuestion = async ({ role, company, questionIndex, previousPerformance }) => {
  const fallback = fallbackQuestion({ role, company, questionIndex, previousPerformance });
  const prompt = `Generate one concise interview question for role ${role} at ${company}. Question index: ${questionIndex}. Previous average score: ${previousPerformance ?? "unknown"}. Return JSON: {"question":"..."}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, { question: fallback });
    return typeof parsed.question === "string" ? parsed.question : fallback;
  } catch (_error) {
    return fallback;
  }
};

export const evaluateAnswer = async ({ question, answer, role }) => {
  const fallback = {
    feedback: "Your answer is relevant. Add stronger technical depth and measurable outcomes.",
    score: 6,
    strengths: ["Relevant response"],
    improvements: ["Add concrete metrics", "Discuss trade-offs"],
    model_answer:
      "A strong answer includes context, design choices, constraints, measurable impact, and lessons learned.",
  };

  const prompt = `Evaluate this interview answer for role ${role}. Return strict JSON with keys: feedback (string), score (1-10 number), strengths (string array), improvements (string array), model_answer (string). Question: ${question}. Answer: ${answer}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : fallback.feedback,
      score: clampScore(parsed.score),
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map((item) => String(item))
        : fallback.strengths,
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.map((item) => String(item))
        : fallback.improvements,
      model_answer:
        typeof parsed.model_answer === "string" ? parsed.model_answer : fallback.model_answer,
    };
  } catch (_error) {
    return fallback;
  }
};

export const generateReport = async (sessionContext, evaluations) => {
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
      "Revise MERN architecture patterns and scaling trade-offs",
      "Do timed mock interviews for concise communication",
    ],
  };

  const prompt = `Create a final interview report for role ${sessionContext.role} at ${sessionContext.company}. Evaluations: ${JSON.stringify(evaluations)}. Return JSON with keys overall_score (1-10), summary (string), strengths (string array), weaknesses (string array), recommendations (string array).`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      overall_score: clampScore(parsed.overall_score),
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map((item) => String(item))
        : fallback.strengths,
      weaknesses: Array.isArray(parsed.weaknesses)
        ? parsed.weaknesses.map((item) => String(item))
        : fallback.weaknesses,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map((item) => String(item))
        : fallback.recommendations,
    };
  } catch (_error) {
    return fallback;
  }
};
