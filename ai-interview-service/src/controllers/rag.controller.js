import {
  addKnowledge,
  getDataset,
  getRAGStatus,
  isRAGDatasetReady,
  isRAGReady,
  searchKnowledge,
  storeCompanyData,
} from "../services/rag.service.js";
import { verifyCodingQuestionFromKnowledgeHit } from "../services/llm.service.js";

export const getRagStatus = (_req, res) => {
  return res.json(getRAGStatus());
};

export const addInterviewKnowledge = async (req, res, next) => {
  try {
    if (!isRAGReady()) {
      return res.status(503).json({ detail: "RAG service is not ready" });
    }

    const { id, content, metadata } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ detail: "content is required" });
    }

    const result = await addKnowledge({
      id: id || `knowledge_${Date.now()}`,
      content,
      metadata: metadata || {},
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

export const addCompanyContext = async (req, res, next) => {
  try {
    if (!isRAGReady()) {
      return res.status(503).json({ detail: "RAG service is not ready" });
    }

    const { company, role, content, metadata } = req.body;

    if (!company?.trim() || !role?.trim() || !content?.trim()) {
      return res.status(400).json({ detail: "company, role, and content are required" });
    }

    await storeCompanyData({
      company,
      role,
      data: content,
      metadata: metadata || {},
    });

    return res.status(201).json({
      success: true,
      company,
      role,
    });
  } catch (error) {
    return next(error);
  }
};

export const searchRagKnowledge = async (req, res, next) => {
  try {
    if (!isRAGReady()) {
      return res.status(503).json({ detail: "RAG service is not ready" });
    }

    const { query, company, role, section, limit, collection } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ detail: "query is required" });
    }

    const results = await searchKnowledge({
      query,
      company,
      role,
      section,
      collection,
      limit: Number(limit) > 0 ? Number(limit) : 5,
    });

    return res.json({
      collection: collection === "company" ? "company" : "interview",
      count: results.length,
      results,
    });
  } catch (error) {
    return next(error);
  }
};

export const getRagDataset = async (req, res, next) => {
  try {
    if (!isRAGDatasetReady()) {
      return res.status(503).json({ detail: "Qdrant dataset is not ready" });
    }
    const collection = req.query.collection || "problems";
    const limit = Number(req.query.limit) || 100;
    
    const results = await getDataset({ collection, limit });
    return res.json({ collection, count: results.length, results });
  } catch (error) {
    return next(error);
  }
};

export const verifyRagQuestion = async (req, res, next) => {
  try {
    const { hit, role = "Software Engineer", company = "Tech Company" } = req.body;
    if (!hit) {
      return res.status(400).json({ detail: "Knowledge hit payload is required" });
    }
    const verifiedQuestion = await verifyCodingQuestionFromKnowledgeHit(hit, { role, company });
    return res.json(verifiedQuestion);
  } catch (error) {
    return next(error);
  }
};

