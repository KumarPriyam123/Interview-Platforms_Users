import express from "express";
import multer from "multer";

import {
  answerQuestion,
  getInterviewReport,
  getQuestion,
  startInterview,
  stopInterview,
} from "../controllers/interview.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/start", upload.single("file"), startInterview);
router.get("/:sessionId/question", getQuestion);
router.post("/:sessionId/answer", answerQuestion);
router.get("/:sessionId/report", getInterviewReport);
router.post("/:sessionId/end", stopInterview);

export default router;
