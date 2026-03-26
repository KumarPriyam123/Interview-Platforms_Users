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

import { retrieveInterviewContext, retrieveCompanyContext } from "./rag.service.js";

const DEFAULT_PROVIDER = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
const DEFAULT_MODEL = process.env.LLM_MODEL || "gemini-2.0-flash";

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

// ─── LLM Provider Calls ─────────────────────────────────────

const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY (or LLM_API_KEY) is missing");

  const model = DEFAULT_MODEL;
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

  const model = DEFAULT_MODEL || "gpt-4o-mini";
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

const askLLM = async (prompt) => {
  if (DEFAULT_PROVIDER === "openai") return callOpenAI(prompt);
  return callGemini(prompt);
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
  try {
    const [interviewCtx, companyCtx] = await Promise.all([
      retrieveInterviewContext({ role, company }),
      retrieveCompanyContext({ company, role }),
    ]);

    if (interviewCtx.length > 0) {
      ragContext += "\n\nPast high-quality interview examples for reference:\n";
      ragContext += interviewCtx.map((c) => c.content).join("\n---\n");
    }
    if (companyCtx) {
      ragContext += "\n\nCompany-specific context:\n" + companyCtx;
    }
  } catch (_error) {
    // RAG context is optional
  }

  const fallbackSections = [
    {
      title: "Introduction & Background",
      description: "Getting to know the candidate",
      questions: [
        { question: `Tell me about yourself and why you're interested in the ${role} role at ${company}.`, difficulty: "easy" },
        { question: `Walk me through your most relevant experience for this ${role} position.`, difficulty: "easy" },
      ],
    },
    {
      title: "Technical Skills",
      description: "Core technical competency assessment",
      questions: [
        { question: `Explain a complex technical challenge you solved using ${(resumeData.technical_skills || []).slice(0, 3).join(", ") || "your primary technology stack"}.`, difficulty: "medium" },
        { question: `How would you design a scalable system architecture for ${company}? Walk me through your approach.`, difficulty: "hard" },
        { question: "Describe your experience with testing strategies and how you ensure code quality.", difficulty: "medium" },
      ],
    },
    {
      title: "Problem Solving & System Design",
      description: "Analytical and design thinking assessment",
      questions: [
        { question: "Design a real-time notification system. What technologies and patterns would you use?", difficulty: "hard" },
        { question: "How would you handle a production incident? Walk me through your debugging process.", difficulty: "medium" },
      ],
    },
    {
      title: "Behavioral & Cultural Fit",
      description: "Teamwork, communication, and cultural alignment",
      questions: [
        { question: "Describe a time when you had a disagreement with a team member. How did you resolve it?", difficulty: "easy" },
        { question: `What excites you most about working at ${company}? How do you see yourself contributing?`, difficulty: "easy" },
        { question: "Tell me about a project where you had to learn a new technology quickly. How did you approach it?", difficulty: "medium" },
      ],
    },
  ];

  const prompt = `You are an expert interviewer for ${company} hiring for the role: ${role}.

Candidate profile:
- Skills: ${(resumeData.technical_skills || []).join(", ") || "Not specified"}
- Experience: ${resumeData.experience_summary || "Not specified"}
- Years of experience: ${resumeData.experience_years || "Unknown"}
- Education: ${resumeData.education || "Not specified"}
${ragContext}

Generate a complete set of interview questions organized into sections. Create 10-12 questions total across 4 sections.

Return strictly valid JSON with this structure:
{
  "sections": [
    {
      "title": "Section Name",
      "description": "Brief description of what this section assesses",
      "questions": [
        { "question": "The interview question text", "difficulty": "easy|medium|hard" }
      ]
    }
  ]
}

The 4 sections MUST be:
1. "Introduction & Background" (2 easy questions)
2. "Technical Skills" (3 medium/hard questions, tailored to candidate's skills)
3. "Problem Solving & System Design" (2-3 hard questions)
4. "Behavioral & Cultural Fit" (2-3 easy/medium questions)

Make questions specific to ${company} and the ${role} role. Tailor technical questions to the candidate's listed skills.`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, { sections: fallbackSections });

    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      return fallbackSections;
    }

    // Validate and normalize
    return parsed.sections.map((section) => ({
      title: String(section.title || "General"),
      description: String(section.description || ""),
      questions: Array.isArray(section.questions)
        ? section.questions.map((q) => ({
            question: String(q.question || "Tell me about your experience."),
            difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
          }))
        : [],
    }));
  } catch (_error) {
    return fallbackSections;
  }
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

  const prompt = `You are an expert interviewer for ${company}, role: ${role}.

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
  "should_counter_question": <boolean - true if the answer was vague, incomplete, or you want to probe deeper>,
  "counter_question": "A follow-up question to probe deeper into their answer (or null if not needed)"
}

Be encouraging but honest. If the answer is vague or misses key points, set should_counter_question to true and provide a specific follow-up question.`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : fallback.feedback,
      score: clampScore(parsed.score),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : fallback.strengths,
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : fallback.improvements,
      model_answer: typeof parsed.model_answer === "string" ? parsed.model_answer : fallback.model_answer,
      should_counter_question: Boolean(parsed.should_counter_question),
      counter_question: typeof parsed.counter_question === "string" ? parsed.counter_question : null,
    };
  } catch (_error) {
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
    response: "That's a great question. Let me clarify — focus on explaining your thought process and approach. There's no single right answer; we're looking for how you think through problems.",
    hint: null,
  };

  const historyContext = (conversationHistory || [])
    .slice(-6)
    .map((h) => `${h.role}: ${h.content}`)
    .join("\n");

  const prompt = `You are a helpful and encouraging AI interviewer for ${company}, role: ${role}.

The candidate is currently answering this question: "${currentQuestion}"

Interview context:
${historyContext}

The candidate has a doubt/clarification request: "${doubt}"

Respond helpfully WITHOUT giving away the answer. You can:
- Clarify what the question is asking
- Give a hint about the approach (without the full solution)
- Explain what we're looking for in the answer
- Rephrase the question if they're confused

Return JSON:
{
  "response": "Your helpful response to their doubt (2-4 sentences, encouraging tone)",
  "hint": "Optional brief hint about approaching the answer (or null if not needed)"
}`;

  try {
    const raw = await askLLM(prompt);
    const parsed = parseJSONObject(raw, fallback);
    return {
      response: typeof parsed.response === "string" ? parsed.response : fallback.response,
      hint: typeof parsed.hint === "string" ? parsed.hint : null,
    };
  } catch (_error) {
    return fallback;
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
