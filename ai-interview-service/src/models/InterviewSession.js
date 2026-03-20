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
    currentQuestionIndex: { type: Number, default: 0 },
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
