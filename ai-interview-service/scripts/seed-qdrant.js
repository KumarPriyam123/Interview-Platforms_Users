import "dotenv/config";

import { initRAG, storeCompanyData, addKnowledge } from "../src/services/rag.service.js";

const seedData = async () => {
  console.log("Connecting to Qdrant & Initializing embeddings...");
  
  // Note: Ensure your GEMINI_API_KEY is available in your .env
  await initRAG();

  console.log("Seeding Company Rubric Data into Qdrant...");

  // 1. Store a rubric context for Netflix Frontend developers
  await storeCompanyData({
    company: "Netflix",
    role: "Frontend Developer",
    data: "Netflix expects high-performance React engineers. Candidate MUST understand React Server Components (RSC), memoization strategies (useMemo, useCallback), and avoiding bulky UI frameworks. An ideal answer prioritizes preventing unnecessary re-renders, optimizing First Contentful Paint, and analyzing the React Profiler tree. If the candidate gives a generic answer without mentioning these optimization hooks, score them heavily (4 out of 10) and probe deeper with a counter-question."
  });

  console.log("Seeding Ideal Interview Q&A into Qdrant...");

  // 2. Add a perfect answer example to the interview knowledge bank
  await addKnowledge({
    id: "netflix_fe_hooks_1",
    content: "Question: How do you prevent unnecessary re-renders in a complex React application?\nIdeal Answer: I heavily utilize useMemo for expensive derived calculations and useCallback for referencing functions passed as props to memoized child components. More importantly, I ensure the state is lifted exactly where it's needed, combining Context Providers carefully to avoid tree-wide global updates. I often run the React Profiler to analyze commit boundaries and hunt down wasted lifecycle rerenders.",
    metadata: {
      type: "interview_qa",
      company: "Netflix",
      role: "Frontend Developer",
      difficulty: "hard",
      score: 10
    }
  });

  console.log("\n✅ Qdrant database seeded successfully!");
  console.log("You can now test an interview answering questions poorly to trigger the precise counter-questions based on this rubric.");
  process.exit(0);
};

seedData().catch(err => {
  console.error("Failed to seed Qdrant:", err);
  process.exit(1);
});
