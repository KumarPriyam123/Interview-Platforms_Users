import mongoose from "mongoose";

const InterviewSessionSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    resumeText: { type: String, default: "" },
    resumeSkills: { type: [String], default: [] },
    resumeExperience: { type: String, default: "" },
    interviewPlan: { type: [String], default: [] },
    // Sections generated upfront: [{ title, description, questionIds }]
    sections: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        questionCount: { type: Number, default: 0 },
      },
    ],
    // All questions embedded directly on the session (no separate collection)
    questions: [
      {
        questionNumber: { type: Number, required: true },
        sectionIndex: { type: Number, default: 0 },
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
    ],
    currentQuestionIndex: { type: Number, default: 0 },
    currentSectionIndex: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    // Conversation history for doubt resolution context
    conversationHistory: [
      {
        role: { type: String, enum: ["user", "assistant", "system"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        type: { type: String, enum: ["question", "answer", "counter_question", "doubt", "doubt_response", "feedback"], default: "question" },
      },
    ],
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("InterviewSession", InterviewSessionSchema);
