import mongoose from "mongoose";

const DatasetQuestionSchema = new mongoose.Schema(
  {
    dataset: { type: String, default: "guitaristboy/coding-questions-dataset", index: true },
    split: { type: String, default: "train" },
    questionId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    difficulty: { type: String, default: "medium", index: true },
    tags: { type: [String], default: [] },
    questionText: { type: String, required: true },
    cppSignature: { type: String, default: "string solve(const string& rawInput)" },
    constraints: { type: [String], default: [] },
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
    sourceRow: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("DatasetQuestion", DatasetQuestionSchema);
