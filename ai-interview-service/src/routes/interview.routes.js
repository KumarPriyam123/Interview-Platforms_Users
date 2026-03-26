import express from "express";
import multer from "multer";

import {
  answerCounterQuestion,
  answerQuestion,
  askDoubt,
  getAllQuestions,
  getInterviewReport,
  getQuestion,
  nextQuestion,
  startInterview,
  stopInterview,
} from "../controllers/interview.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Start interview (upload resume + generate all questions)
router.post("/start", upload.single("file"), startInterview);

// Get all questions organized by sections (for sidebar)
router.get("/:sessionId/questions", getAllQuestions);

// Get current question
router.get("/:sessionId/question", getQuestion);

// Submit answer to current question
router.post("/:sessionId/answer", answerQuestion);

// Answer a counter/follow-up question
router.post("/:sessionId/counter-answer", answerCounterQuestion);

// Move to next question
router.post("/:sessionId/next", nextQuestion);

// Ask a doubt/clarification
router.post("/:sessionId/doubt", askDoubt);

// Get full interview report
router.get("/:sessionId/report", getInterviewReport);

// End interview early
router.post("/:sessionId/end", stopInterview);

export default router;
