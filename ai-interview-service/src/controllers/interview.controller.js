import {
  createInterviewPlan,
  evaluateAnswer,
  extractSkillsFromResume,
  generateQuestion,
  generateReport,
} from "../services/llm.service.js";
import {
  addQuestion,
  createReport,
  createSession,
  endInterview,
  getCurrentQuestionIndex,
  getQuestions,
  getReportBySessionId,
  getSessionById,
  submitAnswer,
  updateQuestionIndex,
} from "../services/interview.service.js";
import { extractTextFromBuffer } from "../utils/resumeExtractor.js";

const INTERVIEW_QUESTIONS_COUNT = 10;

const averageScore = (questions) => {
  const scored = questions.filter((item) => typeof item.score === "number");
  if (!scored.length) return null;
  return scored.reduce((sum, item) => sum + item.score, 0) / scored.length;
};

export const startInterview = async (req, res, next) => {
  try {
    const { role, company, email } = req.body;
    const file = req.file;

    if (!file || !role || !company || !email) {
      return res.status(400).json({ detail: "Missing required fields" });
    }

    const resumeText = await extractTextFromBuffer(file.buffer);
    const resumeData = await extractSkillsFromResume(resumeText);

    const session = await createSession({ email, company, role, resumeText, resumeData });

    const plan = await createInterviewPlan(resumeData, role, company);
    session.interviewPlan = plan;
    await session.save();

    const firstQuestion = await generateQuestion({ role, company, questionIndex: 0 });
    await addQuestion({ sessionId: session._id, questionNumber: 0, questionText: firstQuestion });

    return res.status(201).json({
      session_id: session._id,
      email: session.email,
      company: session.company,
      role: session.role,
      created_at: session.createdAt,
    });
  } catch (error) {
    return next(error);
  }
};

export const getQuestion = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    if (session.status === "completed") {
      return res.json({ status: "completed" });
    }

    const currentIndex = await getCurrentQuestionIndex(sessionId);
    if (currentIndex >= INTERVIEW_QUESTIONS_COUNT) {
      await endInterview(sessionId);
      return res.json({ status: "completed" });
    }

    const questions = await getQuestions(sessionId);
    let questionText;

    if (questions.length <= currentIndex) {
      const nextQuestion = await generateQuestion({
        role: session.role,
        company: session.company,
        questionIndex: currentIndex,
        previousPerformance: averageScore(questions),
      });
      await addQuestion({
        sessionId: session._id,
        questionNumber: currentIndex,
        questionText: nextQuestion,
      });
      questionText = nextQuestion;
    } else {
      questionText = questions[currentIndex].questionText;
    }

    return res.json({ question: questionText, status: "active" });
  } catch (error) {
    return next(error);
  }
};

export const answerQuestion = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    const currentIndex = await getCurrentQuestionIndex(sessionId);
    const questions = await getQuestions(sessionId);

    if (currentIndex >= questions.length) {
      return res.status(400).json({ detail: "No active question" });
    }

    const currentQuestion = questions[currentIndex];
    const evaluation = await evaluateAnswer({
      question: currentQuestion.questionText,
      answer,
      role: session.role,
    });

    await submitAnswer({
      sessionId,
      questionNumber: currentIndex,
      answer,
      feedback: evaluation.feedback,
      score: evaluation.score,
    });

    await updateQuestionIndex(sessionId, currentIndex + 1);

    return res.json(evaluation);
  } catch (error) {
    return next(error);
  }
};

export const getInterviewReport = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    const questions = await getQuestions(sessionId);
    const existingReport = await getReportBySessionId(sessionId);

    if (existingReport) {
      return res.json({
        overall_score: existingReport.overallScore,
        summary: existingReport.summary,
        strengths: existingReport.strengths,
        weaknesses: existingReport.weaknesses,
        recommendations: existingReport.recommendations,
        questions: questions.map((q) => ({
          question: q.questionText,
          answer: q.userAnswer,
          score: q.score,
          feedback: q.feedback,
        })),
      });
    }

    const evaluations = questions
      .filter((q) => typeof q.score === "number")
      .map((q) => ({ feedback: q.feedback, score: q.score }));

    if (!evaluations.length) {
      return res.status(400).json({ detail: "No evaluated questions yet" });
    }

    const reportData = await generateReport(
      { role: session.role, company: session.company },
      evaluations
    );

    await createReport({
      sessionId,
      overallScore: reportData.overall_score,
      summary: reportData.summary,
      strengths: reportData.strengths,
      weaknesses: reportData.weaknesses,
      recommendations: reportData.recommendations,
    });

    return res.json({
      ...reportData,
      questions: questions.map((q) => ({
        question: q.questionText,
        answer: q.userAnswer,
        score: q.score,
        feedback: q.feedback,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

export const stopInterview = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await endInterview(sessionId);

    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    return res.json({ status: "ended" });
  } catch (error) {
    return next(error);
  }
};
