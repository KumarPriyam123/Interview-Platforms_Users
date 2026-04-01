import {
  evaluateAnswer,
  evaluateCounterAnswer,
  extractSkillsFromResume,
  generateAllQuestions,
  generateReport,
  resolveDoubt,
  cleanQuestionForDisplay,
} from "../services/llm.service.js";
import {
  addAllQuestions,
  addCounterQuestion,
  addToConversationHistory,
  createReport,
  createSession,
  endInterview,
  getConversationHistory,
  getQuestionByNumber,
  getQuestions,
  getReportBySessionId,
  getSessionById,
  submitAnswer,
  submitCounterAnswer,
  updateQuestionIndex,
  updateSessionSections,
} from "../services/interview.service.js";
import { runCode } from "../services/codeExecution.service.js";
import { storeInterviewData } from "../services/rag.service.js";
import { extractTextFromBuffer } from "../utils/resumeExtractor.js";

const resolveActiveCounterIndex = (question, requestedIndex, requestedQuestionText) => {
  if (requestedQuestionText) {
    for (let index = question.counterQuestions.length - 1; index >= 0; index--) {
      const counterQuestion = question.counterQuestions[index];
      if (
        counterQuestion?.question === requestedQuestionText
        && !counterQuestion?.userAnswer
      ) {
        return index;
      }
    }

    for (let index = question.counterQuestions.length - 1; index >= 0; index--) {
      if (question.counterQuestions[index]?.question === requestedQuestionText) {
        return index;
      }
    }
  }

  if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < question.counterQuestions.length) {
    return requestedIndex;
  }

  for (let index = question.counterQuestions.length - 1; index >= 0; index--) {
    if (!question.counterQuestions[index]?.userAnswer) {
      return index;
    }
  }

  return question.counterQuestions.length - 1;
};

// ─── Start Interview ────────────────────────────────────────
// Uploads resume, generates ALL questions in sections, returns session

export const startInterview = async (req, res, next) => {
  try {
    const { role, company, email } = req.body;
    const file = req.file;

    if (!file || !role || !company || !email) {
      return res.status(400).json({ detail: "Missing required fields (file, role, company, email)" });
    }

    // Parse resume
    const resumeText = await extractTextFromBuffer(file.buffer, file.mimetype);
    const resumeData = await extractSkillsFromResume(resumeText);

    // Create session
    const session = await createSession({ email, company, role, resumeText, resumeData });

    // Generate ALL questions at once in sections
    const sections = await generateAllQuestions({ resumeData, role, company });

    // Count total questions
    const totalQuestions = sections.reduce((sum, s) => sum + (s.questions || []).length, 0);

    // Save sections to session
    await updateSessionSections(session._id, sections, totalQuestions);

    // Save all questions to DB
    await addAllQuestions(session._id, sections);

    // Add first question to conversation history
    if (sections.length > 0 && sections[0].questions?.length > 0) {
      await addToConversationHistory(session._id, {
        role: "assistant",
        content: sections[0].questions[0].question,
        type: "question",
      });
    }

    return res.status(201).json({
      session_id: session._id,
      email: session.email,
      company: session.company,
      role: session.role,
      created_at: session.createdAt,
      total_questions: totalQuestions,
      sections: sections.map((s) => ({
        title: s.title,
        description: s.description,
        question_count: (s.questions || []).length,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// ─── Get All Questions ──────────────────────────────────────
// Returns all questions organized by sections (for sidebar)

export const getAllQuestions = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    const questions = await getQuestions(sessionId);

    // Group questions by section
    const sectionMap = {};
    for (const q of questions) {
      const key = q.sectionIndex;
      if (!sectionMap[key]) {
        sectionMap[key] = {
          sectionIndex: q.sectionIndex,
          title: q.sectionTitle,
          questions: [],
        };
      }
      sectionMap[key].questions.push({
        questionNumber: q.questionNumber,
        question: q.questionText,
        difficulty: q.difficulty,
        answered: Boolean(q.userAnswer),
        score: q.score,
      });
    }

    const sections = Object.values(sectionMap).sort((a, b) => a.sectionIndex - b.sectionIndex);

    return res.json({
      session_id: sessionId,
      status: session.status,
      current_question_index: session.currentQuestionIndex,
      current_section_index: session.currentSectionIndex,
      total_questions: session.totalQuestions,
      sections,
    });
  } catch (error) {
    return next(error);
  }
};

// ─── Get Current Question ───────────────────────────────────

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

    const currentIndex = session.currentQuestionIndex;
    const question = await getQuestionByNumber(sessionId, currentIndex);

    if (!question) {
      return res.json({ status: "completed" });
    }

    return res.json({
      question: question.questionText,
      question_number: question.questionNumber,
      section_index: question.sectionIndex,
      section_title: question.sectionTitle,
      difficulty: question.difficulty,
      type: question.type || "text",
      coding: question.coding || null,
      total_questions: session.totalQuestions,
      current_index: currentIndex,
      status: "active",
    });
  } catch (error) {
    return next(error);
  }
};

// ─── Answer Question ────────────────────────────────────────
// Evaluates answer and may return a counter-question

export const answerQuestion = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({ detail: "Answer is required" });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    const currentIndex = session.currentQuestionIndex;
    const question = await getQuestionByNumber(sessionId, currentIndex);

    if (!question) {
      return res.status(400).json({ detail: "No active question" });
    }

    // Get conversation history for context
    const conversationHistory = await getConversationHistory(sessionId);

    // Add user answer to conversation history
    await addToConversationHistory(sessionId, {
      role: "user",
      content: answer,
      type: "answer",
    });

    // Evaluate the answer
    const evaluation = await evaluateAnswer({
      question: question.questionText,
      answer,
      role: session.role,
      company: session.company,
      conversationHistory,
    });

    // Save answer and evaluation
    await submitAnswer({
      sessionId,
      questionNumber: currentIndex,
      answer,
      feedback: evaluation.feedback,
      score: evaluation.score,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      modelAnswer: evaluation.model_answer,
    });

    // Add feedback to conversation history
    await addToConversationHistory(sessionId, {
      role: "assistant",
      content: evaluation.feedback,
      type: "feedback",
    });

    // If counter-question is needed, add it
    if (evaluation.should_counter_question && evaluation.counter_question) {
      const updatedQuestion = await addCounterQuestion(sessionId, currentIndex, evaluation.counter_question);
      await addToConversationHistory(sessionId, {
        role: "assistant",
        content: evaluation.counter_question,
        type: "counter_question",
      });

      return res.json({
        ...evaluation,
        question_number: currentIndex,
        has_counter_question: true,
        counter_question: evaluation.counter_question,
        counter_index: (updatedQuestion?.counterQuestions?.length || 1) - 1,
      });
    }

    return res.json({
      ...evaluation,
      question_number: currentIndex,
      has_counter_question: false,
      counter_index: null,
    });
  } catch (error) {
    return next(error);
  }
};

// ─── Answer Counter Question ────────────────────────────────

export const answerCounterQuestion = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { answer, question_number, counter_index, counter_question } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({ detail: "Answer is required" });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    const qNum = question_number ?? session.currentQuestionIndex;
    const question = await getQuestionByNumber(sessionId, qNum);
    if (!question) {
      return res.status(404).json({ detail: "Question not found" });
    }

    const activeCounterIndex = resolveActiveCounterIndex(
      question,
      Number(counter_index),
      typeof counter_question === "string" ? counter_question : ""
    );
    const lastCounter = question.counterQuestions[activeCounterIndex];
    if (!lastCounter) {
      return res.status(400).json({ detail: "No counter question to answer" });
    }

    // Add to conversation history
    await addToConversationHistory(sessionId, {
      role: "user",
      content: answer,
      type: "answer",
    });

    // Evaluate counter answer
    const evaluation = await evaluateCounterAnswer({
      originalQuestion: question.questionText,
      originalAnswer: question.userAnswer,
      counterQuestion: lastCounter.question,
      counterAnswer: answer,
      role: session.role,
      company: session.company,
    });

    // Save counter answer
    const savedCounterAnswer = await submitCounterAnswer(
      sessionId,
      qNum,
      activeCounterIndex,
      answer,
      evaluation.feedback
    );
    if (!savedCounterAnswer) {
      return res.status(400).json({ detail: "Unable to save follow-up answer" });
    }

    // Adjust score if needed
    if (evaluation.score_adjustment !== 0) {
      const newScore = Math.max(1, Math.min(10, (question.score || 6) + evaluation.score_adjustment));
      await submitAnswer({
        sessionId,
        questionNumber: qNum,
        answer: question.userAnswer,
        feedback: question.feedback,
        score: newScore,
        strengths: question.strengths,
        improvements: question.improvements,
        modelAnswer: question.modelAnswer,
      });
    }

    await addToConversationHistory(sessionId, {
      role: "assistant",
      content: evaluation.feedback,
      type: "feedback",
    });

    return res.json({
      feedback: evaluation.feedback,
      score_adjustment: evaluation.score_adjustment,
      has_counter_question: false,
      counter_question: null,
      counter_index: null,
    });
  } catch (error) {
    return next(error);
  }
};

// ─── Move to Next Question ──────────────────────────────────

export const nextQuestion = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    const nextIndex = session.currentQuestionIndex + 1;
    const questions = await getQuestions(sessionId);

    if (nextIndex >= questions.length) {
      await endInterview(sessionId);
      return res.json({ status: "completed" });
    }

    await updateQuestionIndex(sessionId, nextIndex);

    const nextQ = questions[nextIndex];

    // Add next question to conversation history
    await addToConversationHistory(sessionId, {
      role: "assistant",
      content: nextQ.questionText,
      type: "question",
    });

    return res.json({
      question: nextQ.questionText,
      question_number: nextQ.questionNumber,
      section_index: nextQ.sectionIndex,
      section_title: nextQ.sectionTitle,
      difficulty: nextQ.difficulty,
      type: nextQ.type || "text",
      coding: nextQ.coding || null,
      total_questions: session.totalQuestions,
      current_index: nextIndex,
      status: "active",
    });
  } catch (error) {
    return next(error);
  }
};

// ─── Doubt Resolution ───────────────────────────────────────

export const askDoubt = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { doubt, currentPrompt } = req.body;

    if (!doubt || !doubt.trim()) {
      return res.status(400).json({ detail: "Doubt text is required" });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ detail: "Session not found" });
    }

    const currentQuestion = await getQuestionByNumber(sessionId, session.currentQuestionIndex);
    const conversationHistory = await getConversationHistory(sessionId);

    // Add doubt to history
    await addToConversationHistory(sessionId, {
      role: "user",
      content: doubt,
      type: "doubt",
    });

    // Resolve doubt
    const response = await resolveDoubt({
      doubt,
      currentQuestion: currentPrompt?.trim() || currentQuestion?.questionText || "",
      role: session.role,
      company: session.company,
      conversationHistory,
    });

    // Add response to history
    await addToConversationHistory(sessionId, {
      role: "assistant",
      content: response.response,
      type: "doubt_response",
    });

    return res.json(response);
  } catch (error) {
    return next(error);
  }
};

// ─── Get Interview Report ───────────────────────────────────

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
        section_scores: existingReport.sectionScores,
        skill_assessment: existingReport.skillAssessment,
        questions: questions.map((q) => ({
          question: q.questionText,
          answer: q.userAnswer,
          score: q.score,
          feedback: q.feedback,
          strengths: q.strengths,
          improvements: q.improvements,
          model_answer: q.modelAnswer,
          section_title: q.sectionTitle,
          difficulty: q.difficulty,
          counter_questions: q.counterQuestions.map((cq) => ({
            question: cq.question,
            answer: cq.userAnswer,
            feedback: cq.feedback,
          })),
        })),
      });
    }

    const evaluations = questions
      .filter((q) => typeof q.score === "number")
      .map((q) => ({
        question: q.questionText,
        answer: q.userAnswer,
        feedback: q.feedback,
        score: q.score,
        section: q.sectionTitle,
      }));

    if (!evaluations.length) {
      return res.status(400).json({ detail: "No evaluated questions yet" });
    }

    const reportData = await generateReport(
      {
        role: session.role,
        company: session.company,
        resumeSkills: session.resumeSkills,
      },
      evaluations,
      session.sections
    );

    await createReport({
      sessionId,
      overallScore: reportData.overall_score,
      summary: reportData.summary,
      strengths: reportData.strengths,
      weaknesses: reportData.weaknesses,
      recommendations: reportData.recommendations,
      sectionScores: reportData.section_scores,
      skillAssessment: reportData.skill_assessment,
    });

    // Store interview data in RAG for future retrieval
    try {
      await storeInterviewData({
        sessionId,
        role: session.role,
        company: session.company,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          userAnswer: q.userAnswer,
          score: q.score,
          feedback: q.feedback,
          sectionTitle: q.sectionTitle,
          questionNumber: q.questionNumber,
        })),
      });
    } catch (_error) {
      // RAG storage is optional
    }

    return res.json({
      ...reportData,
      questions: questions.map((q) => ({
        question: q.questionText,
        answer: q.userAnswer,
        score: q.score,
        feedback: q.feedback,
        strengths: q.strengths,
        improvements: q.improvements,
        model_answer: q.modelAnswer,
        section_title: q.sectionTitle,
        difficulty: q.difficulty,
        counter_questions: q.counterQuestions.map((cq) => ({
          question: cq.question,
          answer: cq.userAnswer,
          feedback: cq.feedback,
        })),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// ─── Stop Interview ─────────────────────────────────────────

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

export const executeCodingAnswer = async (req, res, next) => {
  try {
    const { language, code, testCases, mode } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ detail: "Code is required" });
    }

    const result = await runCode({
      language: String(language || "javascript").toLowerCase(),
      code: String(code),
      testCases,
      mode: String(mode || "run").toLowerCase(),
    });

    return res.json(result);
  } catch (error) {
    error.statusCode = 502;
    error.message = error.message || "Unable to run code right now. Please try again in a moment.";
    return next(error);
  }
};

export const cleanQuestion = async (req, res, next) => {
  try {
    const { question, title } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ detail: "question is required" });
    }
    const cleaned = await cleanQuestionForDisplay(String(question), String(title || ""));
    return res.json(cleaned);
  } catch (error) {
    error.statusCode = 502;
    error.message = error.message || "Failed to clean question text.";
    return next(error);
  }
};
