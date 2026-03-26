/**
 * RAG Service — ChromaDB vector store for interview knowledge retrieval
 * 
 * Stores and retrieves:
 * - Interview Q&A data (past questions + good answers)
 * - Company-specific interview patterns
 * - Role-specific technical knowledge
 * - User's past interview data for personalization
 */

import { ChromaClient } from "chromadb";

let chromaClient = null;
let interviewCollection = null;
let companyCollection = null;
let isRAGAvailable = false;

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8500";

/**
 * Initialize ChromaDB collections
 */
export const initRAG = async () => {
  try {
    chromaClient = new ChromaClient({ path: CHROMA_URL });
    
    // Collection for interview Q&A knowledge
    interviewCollection = await chromaClient.getOrCreateCollection({
      name: "interview_knowledge",
      metadata: { description: "Interview questions, answers, and evaluation data" },
    });

    // Collection for company-specific data
    companyCollection = await chromaClient.getOrCreateCollection({
      name: "company_data",
      metadata: { description: "Company interview patterns and role requirements" },
    });

    isRAGAvailable = true;
    console.log("ChromaDB RAG collections initialized");
  } catch (error) {
    isRAGAvailable = false;
    console.warn("ChromaDB not available, RAG features disabled:", error.message);
  }
};

/**
 * Store interview Q&A data for future retrieval
 */
export const storeInterviewData = async ({ sessionId, role, company, questions }) => {
  if (!isRAGAvailable || !interviewCollection) return;

  try {
    const documents = [];
    const metadatas = [];
    const ids = [];

    for (const q of questions) {
      if (!q.userAnswer) continue;

      const doc = `Role: ${role}\nCompany: ${company}\nQuestion: ${q.questionText}\nAnswer: ${q.userAnswer}\nScore: ${q.score || "N/A"}\nFeedback: ${q.feedback || "N/A"}`;
      
      documents.push(doc);
      metadatas.push({
        role,
        company,
        score: q.score || 0,
        section: q.sectionTitle || "",
        sessionId: sessionId.toString(),
      });
      ids.push(`${sessionId}_q${q.questionNumber}`);
    }

    if (documents.length > 0) {
      await interviewCollection.upsert({
        ids,
        documents,
        metadatas,
      });
    }
  } catch (error) {
    console.warn("Failed to store interview data in RAG:", error.message);
  }
};

/**
 * Store company/role specific data for RAG retrieval
 */
export const storeCompanyData = async ({ company, role, data }) => {
  if (!isRAGAvailable || !companyCollection) return;

  try {
    const id = `${company}_${role}`.toLowerCase().replace(/\s+/g, "_");
    await companyCollection.upsert({
      ids: [id],
      documents: [typeof data === "string" ? data : JSON.stringify(data)],
      metadatas: [{ company, role, updatedAt: new Date().toISOString() }],
    });
  } catch (error) {
    console.warn("Failed to store company data in RAG:", error.message);
  }
};

/**
 * Retrieve relevant interview context for question generation
 */
export const retrieveInterviewContext = async ({ role, company, section, limit = 5 }) => {
  if (!isRAGAvailable || !interviewCollection) return [];

  try {
    const queryText = `${role} interview questions for ${company} in section: ${section || "general"}`;
    
    const results = await interviewCollection.query({
      queryTexts: [queryText],
      nResults: limit,
      where: { score: { $gte: 7 } }, // Only retrieve high-quality examples
    });

    return (results.documents?.[0] || []).map((doc, i) => ({
      content: doc,
      metadata: results.metadatas?.[0]?.[i] || {},
      distance: results.distances?.[0]?.[i] || 0,
    }));
  } catch (error) {
    console.warn("RAG retrieval failed:", error.message);
    return [];
  }
};

/**
 * Retrieve company-specific interview data
 */
export const retrieveCompanyContext = async ({ company, role }) => {
  if (!isRAGAvailable || !companyCollection) return null;

  try {
    const queryText = `${company} ${role} interview requirements and patterns`;
    
    const results = await companyCollection.query({
      queryTexts: [queryText],
      nResults: 3,
    });

    return (results.documents?.[0] || []).join("\n\n");
  } catch (error) {
    console.warn("Company RAG retrieval failed:", error.message);
    return null;
  }
};

/**
 * Add new knowledge to the RAG store (for admin/data ingestion)
 */
export const addKnowledge = async ({ id, content, metadata }) => {
  if (!isRAGAvailable || !interviewCollection) {
    throw new Error("RAG service not available");
  }

  await interviewCollection.upsert({
    ids: [id],
    documents: [content],
    metadatas: [metadata || {}],
  });

  return { success: true, id };
};

/**
 * Check if RAG is available
 */
export const isRAGReady = () => isRAGAvailable;
