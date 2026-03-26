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
    sectionIndex: { type: Number, required: true, default: 0 },
    sectionTitle: { type: String, default: "" },
    questionText: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    userAnswer: { type: String, default: "" },
    feedback: { type: String, default: "" },
    score: { type: Number, default: null },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    modelAnswer: { type: String, default: "" },
    // Counter questions asked as follow-ups
    counterQuestions: [
      {
        question: { type: String, required: true },
        userAnswer: { type: String, default: "" },
        feedback: { type: String, default: "" },
        askedAt: { type: Date, default: Date.now },
      },
    ],
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InterviewQuestionSchema.index({ sessionId: 1, questionNumber: 1 }, { unique: true });

export default mongoose.model("InterviewQuestion", InterviewQuestionSchema);
