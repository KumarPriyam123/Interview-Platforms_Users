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
