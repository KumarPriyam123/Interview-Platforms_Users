import InterviewQuestion from "../models/InterviewQuestion.js";
import InterviewReport from "../models/InterviewReport.js";
import InterviewSession from "../models/InterviewSession.js";

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

export const addQuestion = async ({ sessionId, questionNumber, questionText }) => {
  return InterviewQuestion.create({ sessionId, questionNumber, questionText });
};

export const getQuestions = async (sessionId) => {
  return InterviewQuestion.find({ sessionId }).sort({ questionNumber: 1 });
};

export const getCurrentQuestionIndex = async (sessionId) => {
  const session = await getSessionById(sessionId);
  return session ? session.currentQuestionIndex : 0;
};

export const updateQuestionIndex = async (sessionId, nextIndex) => {
  return InterviewSession.findByIdAndUpdate(
    sessionId,
    { currentQuestionIndex: nextIndex },
    { new: true }
  );
};

export const submitAnswer = async ({ sessionId, questionNumber, answer, feedback, score }) => {
  return InterviewQuestion.findOneAndUpdate(
    { sessionId, questionNumber },
    { userAnswer: answer, feedback, score },
    { new: true }
  );
};

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
}) => {
  const report = await InterviewReport.create({
    sessionId,
    overallScore,
    summary,
    strengths,
    weaknesses,
    recommendations,
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
