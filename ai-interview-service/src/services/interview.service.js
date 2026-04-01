import InterviewQuestion from "../models/InterviewQuestion.js";
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

// ─── Question Operations ────────────────────────────────────

export const addQuestion = async ({ sessionId, questionNumber, questionText, sectionIndex, sectionTitle, difficulty }) => {
  return InterviewQuestion.create({
    sessionId,
    questionNumber,
    questionText,
    sectionIndex: sectionIndex || 0,
    sectionTitle: sectionTitle || "",
    difficulty: difficulty || "medium",
  });
};

export const addAllQuestions = async (sessionId, sections) => {
  const questions = [];
  let questionNumber = 0;

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    for (const q of section.questions || []) {
      questions.push({
        sessionId,
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

  return InterviewQuestion.insertMany(questions);
};

export const getQuestions = async (sessionId) => {
  return InterviewQuestion.find({ sessionId }).sort({ questionNumber: 1 });
};

export const getQuestionByNumber = async (sessionId, questionNumber) => {
  return InterviewQuestion.findOne({ sessionId, questionNumber });
};

export const getCurrentQuestionIndex = async (sessionId) => {
  const session = await getSessionById(sessionId);
  return session ? session.currentQuestionIndex : 0;
};

export const updateQuestionIndex = async (sessionId, nextIndex) => {
  // Also update section index
  const questions = await getQuestions(sessionId);
  const currentQ = questions[nextIndex];
  const sectionIndex = currentQ ? currentQ.sectionIndex : 0;

  return InterviewSession.findByIdAndUpdate(
    sessionId,
    { currentQuestionIndex: nextIndex, currentSectionIndex: sectionIndex },
    { new: true }
  );
};

export const submitAnswer = async ({ sessionId, questionNumber, answer, feedback, score, strengths, improvements, modelAnswer }) => {
  return InterviewQuestion.findOneAndUpdate(
    { sessionId, questionNumber },
    {
      userAnswer: answer,
      feedback,
      score,
      strengths: strengths || [],
      improvements: improvements || [],
      modelAnswer: modelAnswer || "",
      answeredAt: new Date(),
    },
    { new: true }
  );
};

// ─── Counter Question Operations ────────────────────────────

export const addCounterQuestion = async (sessionId, questionNumber, counterQuestion) => {
  return InterviewQuestion.findOneAndUpdate(
    { sessionId, questionNumber },
    {
      $push: {
        counterQuestions: {
          question: counterQuestion,
          askedAt: new Date(),
        },
      },
    },
    { new: true }
  );
};

export const submitCounterAnswer = async (sessionId, questionNumber, counterIndex, answer, feedback) => {
  const question = await getQuestionByNumber(sessionId, questionNumber);
  if (!question || !question.counterQuestions[counterIndex]) return null;

  question.counterQuestions[counterIndex].userAnswer = answer;
  question.counterQuestions[counterIndex].feedback = feedback;
  await question.save();
  return question;
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
