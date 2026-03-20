import mongoose from "mongoose";

const InterviewQuestionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
      index: true,
    },
    questionNumber: { type: Number, required: true },
    questionText: { type: String, required: true },
    userAnswer: { type: String, default: "" },
    feedback: { type: String, default: "" },
    score: { type: Number, default: null },
  },
  { timestamps: true }
);

InterviewQuestionSchema.index({ sessionId: 1, questionNumber: 1 }, { unique: true });

export default mongoose.model("InterviewQuestion", InterviewQuestionSchema);
