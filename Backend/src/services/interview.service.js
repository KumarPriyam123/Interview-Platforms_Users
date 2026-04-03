import InterviewReport from "../models/InterviewReport.js";
import InterviewSession from "../models/InterviewSession.js";

// ─── Session Operations ─────────────────────────────────────

export const createSession = async ({ email, company, role, resumeText, resumeData }) => {
  return InterviewSession.create({
    email,
    company,
    role,
    resumeText,
    resumeSkills: resumeData.technical_skills || [],
    resumeExperience: resumeData.experience_summary || "",
  });
};

export const getSessionById = async (sessionId) => {
  return InterviewSession.findById(sessionId);
};

export const updateSessionSections = async (sessionId, sections, totalQuestions) => {
  return InterviewSession.findByIdAndUpdate(
    sessionId,
    {
      sections: sections.map((s) => ({
        title: s.title,
        description: s.description || "",
        questionCount: (s.questions || []).length,
      })),
      totalQuestions,
    },
    { new: true }
  );
};

// ─── Question Operations (embedded on session) ──────────────

export const addAllQuestions = async (sessionId, sections) => {
  const questions = [];
  let questionNumber = 0;

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    for (const q of section.questions || []) {
      questions.push({
        questionNumber,
        questionText: q.question,
        sectionIndex,
        sectionTitle: section.title,
        difficulty: q.difficulty || "medium",
        type: q.type || "text",
        coding: q.coding || undefined,
      });
      questionNumber++;
    }
  }

  return InterviewSession.findByIdAndUpdate(
    sessionId,
    { $push: { questions: { $each: questions } } },
    { new: true }
  );
};

export const getQuestions = async (sessionId) => {
  const session = await InterviewSession.findById(sessionId);
  if (!session) return [];
  return [...session.questions].sort((a, b) => a.questionNumber - b.questionNumber);
};

export const getQuestionByNumber = async (sessionId, questionNumber) => {
  const session = await InterviewSession.findById(sessionId);
  if (!session) return null;
  return session.questions.find((q) => q.questionNumber === questionNumber) || null;
};

export const getCurrentQuestionIndex = async (sessionId) => {
  const session = await getSessionById(sessionId);
  return session ? session.currentQuestionIndex : 0;
};

export const updateQuestionIndex = async (sessionId, nextIndex) => {
  const session = await InterviewSession.findById(sessionId);
  if (!session) return null;
  const currentQ = session.questions.find((q) => q.questionNumber === nextIndex);
  const sectionIndex = currentQ ? currentQ.sectionIndex : 0;

  session.currentQuestionIndex = nextIndex;
  session.currentSectionIndex = sectionIndex;
  return session.save();
};

export const submitAnswer = async ({ sessionId, questionNumber, answer, feedback, score, strengths, improvements, modelAnswer }) => {
  const session = await InterviewSession.findById(sessionId);
  if (!session) return null;
  const q = session.questions.find((q) => q.questionNumber === questionNumber);
  if (!q) return null;

  q.userAnswer = answer;
  q.feedback = feedback;
  q.score = score;
  q.strengths = strengths || [];
  q.improvements = improvements || [];
  q.modelAnswer = modelAnswer || "";
  q.answeredAt = new Date();

  await session.save();
  return q;
};

// ─── Counter Question Operations ────────────────────────────

export const addCounterQuestion = async (sessionId, questionNumber, counterQuestion) => {
  const session = await InterviewSession.findById(sessionId);
  if (!session) return null;
  const q = session.questions.find((q) => q.questionNumber === questionNumber);
  if (!q) return null;

  q.counterQuestions.push({ question: counterQuestion, askedAt: new Date() });
  await session.save();
  return q;
};

export const submitCounterAnswer = async (sessionId, questionNumber, counterIndex, answer, feedback) => {
  const session = await InterviewSession.findById(sessionId);
  if (!session) return null;
  const q = session.questions.find((q) => q.questionNumber === questionNumber);
  if (!q || !q.counterQuestions[counterIndex]) return null;

  q.counterQuestions[counterIndex].userAnswer = answer;
  q.counterQuestions[counterIndex].feedback = feedback;
  await session.save();
  return q;
};

// ─── Conversation History ───────────────────────────────────

export const addToConversationHistory = async (sessionId, entry) => {
  return InterviewSession.findByIdAndUpdate(
    sessionId,
    {
      $push: {
        conversationHistory: {
          role: entry.role,
          content: entry.content,
          type: entry.type || "question",
          timestamp: new Date(),
        },
      },
    },
    { new: true }
  );
};

export const getConversationHistory = async (sessionId) => {
  const session = await getSessionById(sessionId);
  return session?.conversationHistory || [];
};

// ─── Report Operations ──────────────────────────────────────

export const getReportBySessionId = async (sessionId) => {
  return InterviewReport.findOne({ sessionId });
};

export const createReport = async ({
  sessionId,
  overallScore,
  summary,
  strengths,
  weaknesses,
  recommendations,
  sectionScores,
  skillAssessment,
}) => {
  const report = await InterviewReport.create({
    sessionId,
    overallScore,
    summary,
    strengths,
    weaknesses,
    recommendations,
    sectionScores: sectionScores || [],
    skillAssessment: skillAssessment || [],
  });

  await InterviewSession.findByIdAndUpdate(sessionId, {
    status: "completed",
    completedAt: new Date(),
  });

  return report;
};

export const endInterview = async (sessionId) => {
  return InterviewSession.findByIdAndUpdate(
    sessionId,
    { status: "completed", completedAt: new Date() },
    { new: true }
  );
};
