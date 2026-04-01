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
    type: { type: String, default: "text" },
    coding: {
      executionStyle: { type: String, default: "stdin" },
      cppSignature: { type: String, default: "" },
      starterCode: { type: String, default: "" },
      inputDescription: { type: String, default: "" },
      outputDescription: { type: String, default: "" },
      constraints: { type: [String], default: [] },
      source: {
        collection: { type: String, default: "" },
        questionId: { type: String, default: "" },
        title: { type: String, default: "" },
        platform: { type: String, default: "" },
        dataset: { type: String, default: "" },
        difficulty: { type: String, default: "" },
        tags: { type: [String], default: [] },
        rawContent: { type: String, default: "" },
        verifiedByLLM: { type: Boolean, default: false },
      },
      examples: {
        type: [
          {
            input: { type: String, default: "" },
            output: { type: String, default: "" },
            explanation: { type: String, default: "" },
          },
        ],
        default: [],
      },
      visibleTestCases: { type: [mongoose.Schema.Types.Mixed], default: [] },
      hiddenTestCases: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
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
