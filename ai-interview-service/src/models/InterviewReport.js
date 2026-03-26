import mongoose from "mongoose";

const InterviewReportSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
      unique: true,
      index: true,
    },
    overallScore: { type: Number, required: true },
    summary: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    sectionScores: [
      {
        sectionTitle: { type: String },
        score: { type: Number },
        feedback: { type: String },
      },
    ],
    skillAssessment: [
      {
        skill: { type: String },
        level: { type: String, enum: ["beginner", "intermediate", "advanced", "expert"] },
        score: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("InterviewReport", InterviewReportSchema);
