import { config } from "dotenv";

import { connectDB } from "./src/config/db.js";
import { initRAG } from "./src/services/rag.service.js";
import { createApp } from "./src/app.js";

config();

const PORT = Number(process.env.PORT || 8000);

const start = async () => {
  // Connect to MongoDB
  try {
    await connectDB(process.env.MONGODB_URI);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Check your MONGODB_URI in .env file");
    console.error("URI starts with:", process.env.MONGODB_URI?.substring(0, 20) + "...");
    // Don't exit — let the server start so you can debug
  }

  // Initialize RAG vector store (ChromaDB)
  try {
    await initRAG();
    console.log("RAG vector store initialized");
  } catch (error) {
    console.warn("RAG initialization failed (service will work without RAG):", error.message);
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`AI interview service running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start AI interview service:", error);
  process.exit(1);
});
