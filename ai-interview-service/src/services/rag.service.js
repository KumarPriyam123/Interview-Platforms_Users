import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { FlagEmbedding } from "fastembed";
import { QdrantClient } from "@qdrant/js-client-rest";

let qdrantClient = null;
let embeddingModel = null;
let isRAGAvailable = false;
let isDatasetAvailable = false;
let knownCollections = new Set();

const EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5";
const VECTOR_SIZE = 384;
const INTERVIEW_COLLECTION = "interview_knowledge";
const COMPANY_COLLECTION = "company_data";
const PROBLEMS_COLLECTION = process.env.QDRANT_PROBLEMS_COLLECTION || "interview_knowledge";
const TECH_QUESTIONS_COLLECTION = process.env.QDRANT_TECH_COLLECTION || "interview_knowledge";
const PERSONAL_QUESTIONS_COLLECTION = process.env.QDRANT_PERSONAL_COLLECTION || "interview_knowledge";

const normalizeKey = (value = "") => {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
};

const getQdrantUrl = () => process.env.QDRANT_URL || "http://localhost:6333";

const getEmbeddingCacheDir = () =>
  process.env.FASTEMBED_CACHE_PATH || path.resolve(process.cwd(), "local_cache");

const getEmbeddingModelPaths = () => {
  const cacheDir = getEmbeddingCacheDir();
  const [modelOrg = "", modelName = ""] = EMBEDDING_MODEL.split("/");
  const modelRoot = path.join(cacheDir, modelOrg);

  return {
    modelRoot,
    archivePath: path.join(modelRoot, `${modelName}.tar.gz`),
    extractedPath: path.join(modelRoot, modelName),
  };
};

const isBadArchiveError = (error) =>
  String(error?.message || "").toUpperCase().includes("TAR_BAD_ARCHIVE");

const ensureEmbeddingCacheDir = async () => {
  const cacheDir = getEmbeddingCacheDir();
  const [modelOrg] = EMBEDDING_MODEL.split("/");

  await fs.mkdir(cacheDir, { recursive: true });
  if (modelOrg) {
    await fs.mkdir(path.join(cacheDir, modelOrg), { recursive: true });
  }
};

const clearCorruptedEmbeddingCache = async () => {
  const { archivePath, extractedPath } = getEmbeddingModelPaths();
  await fs.rm(archivePath, { force: true });
  await fs.rm(extractedPath, { recursive: true, force: true });
};

const getEmbeddingApiKey = () => process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || "";

const generateUuid = (idStr) => {
  const hash = crypto.createHash("md5").update(idStr.toString()).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

const mapSearchResults = (results = []) =>
  results.map((hit) => ({
    id: hit.id,
    content: hit.payload?.content || "",
    metadata: hit.payload || {},
    score: hit.score,
  }));

const mapScrollResults = (results = []) =>
  results.map((hit) => ({
    id: hit.id,
    content: hit.payload?.content || "",
    metadata: hit.payload || {},
    score: null,
  }));

const getCollectionName = (collection = "interview") => {
  if (collection === "company") return COMPANY_COLLECTION;
  if (collection === "problems") return PROBLEMS_COLLECTION;
  if (collection === "tech_questions") return TECH_QUESTIONS_COLLECTION;
  if (collection === "personal_questions") return PERSONAL_QUESTIONS_COLLECTION;
  return INTERVIEW_COLLECTION;
};

const createKeywordFilter = ({ company, role, section, minScore } = {}) => {
  const must = [];

  if (typeof minScore === "number") {
    must.push({ key: "score", range: { gte: minScore } });
  }

  if (company) {
    must.push({ key: "companyKey", match: { value: normalizeKey(company) } });
  }

  if (role) {
    must.push({ key: "roleKey", match: { value: normalizeKey(role) } });
  }

  if (section) {
    must.push({ key: "sectionKey", match: { value: normalizeKey(section) } });
  }

  return must.length > 0 ? { must } : undefined;
};

const searchCollection = async ({
  collectionName,
  queryText,
  limit = 5,
  primaryFilter,
  fallbackFilter,
  fallbackToUnfiltered = false,
}) => {
  if (!isRAGAvailable || !qdrantClient || !queryText?.trim()) return [];

  const vector = await generateEmbedding(queryText);
  if (!vector) return [];

  const runSearch = async (filter) =>
    qdrantClient.search(collectionName, {
      vector,
      limit,
      filter,
      with_payload: true,
    });

  const filteredResults = await runSearch(primaryFilter);
  if (filteredResults.length > 0 || (!fallbackFilter && !fallbackToUnfiltered)) {
    return filteredResults;
  }

  return runSearch(fallbackFilter);
};

const generateEmbedding = async (text) => {
  if (!embeddingModel || !text?.trim()) return null;

  try {
    const result = await embeddingModel.embed([text]);
    return Array.from(result[0]);
  } catch (error) {
    console.error("Embedding generation failed:", error.message);
    return null;
  }
};

const createInterviewDocument = ({ role, company, question }) => {
  const feedback = question.feedback || "N/A";
  const section = question.sectionTitle || "General";
  const score = Number(question.score) || 0;

  return {
    id: `${question.sessionId || "session"}_q${question.questionNumber}`,
    content: [
      `Role: ${role}`,
      `Company: ${company}`,
      `Section: ${section}`,
      `Question: ${question.questionText}`,
      `Answer: ${question.userAnswer}`,
      `Score: ${score}`,
      `Feedback: ${feedback}`,
    ].join("\n"),
    metadata: {
      role,
      roleKey: normalizeKey(role),
      company,
      companyKey: normalizeKey(company),
      score,
      section,
      sectionKey: normalizeKey(section),
      type: "interview_qa",
      sessionId: question.sessionId?.toString?.() || "",
      questionNumber: question.questionNumber,
    },
  };
};
export const getDataset = async ({ collection = "problems", limit = 100 } = {}) => {
  if (!isDatasetAvailable || !qdrantClient) return [];

  const collectionName = getCollectionName(collection);
  if (!knownCollections.has(collectionName)) return [];

  let effectiveFilter = undefined;
  if (collection === "problems" || collection === "tech_questions" || collection === "personal_questions") {
    effectiveFilter = { must: [{ key: "category", match: { value: collection } }] };
  }

  try {
    let response = await qdrantClient.scroll(collectionName, {
      limit: limit,
      filter: effectiveFilter,
      with_payload: true,
      with_vector: false,
    });

    let points = Array.isArray(response?.points) ? response.points : [];

    // Backward compatibility: older imports may not have a `category` payload field.
    if (points.length === 0 && effectiveFilter) {
      response = await qdrantClient.scroll(collectionName, {
        limit: limit,
        with_payload: true,
        with_vector: false,
      });
      points = Array.isArray(response?.points) ? response.points : [];
    }

    return mapScrollResults(points);
  } catch (error) {
    console.warn("Dataset fetch failed:", error.message);
    return [];
  }
};

export const initRAG = async () => {
  const qdrantConfig = { url: getQdrantUrl() };
  if (process.env.QDRANT_API_KEY) {
    qdrantConfig.apiKey = process.env.QDRANT_API_KEY;
  }

  try {
    qdrantClient = new QdrantClient(qdrantConfig);

    const collections = await qdrantClient.getCollections();
    const collectionNames = collections.collections.map((collection) => collection.name);

    if (!collectionNames.includes(INTERVIEW_COLLECTION)) {
      await qdrantClient.createCollection(INTERVIEW_COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
    }

    if (!collectionNames.includes(COMPANY_COLLECTION)) {
      await qdrantClient.createCollection(COMPANY_COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
    }

    knownCollections = new Set([
      ...collectionNames,
      INTERVIEW_COLLECTION,
      COMPANY_COLLECTION,
    ]);

    isDatasetAvailable = true;
  } catch (error) {
    isRAGAvailable = false;
    isDatasetAvailable = false;
    qdrantClient = null;
    embeddingModel = null;
    knownCollections = new Set();
    console.warn("Qdrant configuration failed, RAG disabled:", error.message);
    return getRAGStatus();
  }

  try {
    await ensureEmbeddingCacheDir();
    embeddingModel = await FlagEmbedding.init({ model: EMBEDDING_MODEL });

    isRAGAvailable = true;
    console.log("Qdrant RAG collections initialized successfully");
    return getRAGStatus();
  } catch (error) {
    if (isBadArchiveError(error)) {
      try {
        await clearCorruptedEmbeddingCache();
        await ensureEmbeddingCacheDir();
        embeddingModel = await FlagEmbedding.init({ model: EMBEDDING_MODEL });
        isRAGAvailable = true;
        console.log("Qdrant RAG collections initialized successfully after cache refresh");
        return getRAGStatus();
      } catch (retryError) {
        isRAGAvailable = false;
        embeddingModel = null;
        console.warn("Embedding model re-download failed, RAG search/write disabled:", retryError.message);
        return getRAGStatus();
      }
    }

    isRAGAvailable = false;
    embeddingModel = null;
    console.warn("Embedding model failed to initialize, RAG search/write disabled:", error.message);
    return getRAGStatus();
  }
};

export const storeInterviewData = async ({ sessionId, role, company, questions }) => {
  if (!isRAGAvailable || !qdrantClient) return;

  try {
    const points = [];

    for (const question of questions) {
      if (!question.userAnswer?.trim()) continue;

      const document = createInterviewDocument({
        role,
        company,
        question: { ...question, sessionId },
      });

      const vector = await generateEmbedding(document.content);
      if (!vector) continue;

      points.push({
        id: generateUuid(`${document.id}_${role}_${company}`),
        vector,
        payload: {
          content: document.content,
          ...document.metadata,
        },
      });
    }

    if (points.length > 0) {
      await qdrantClient.upsert(INTERVIEW_COLLECTION, { wait: true, points });
    }
  } catch (error) {
    console.warn("Failed to store QA data in Qdrant:", error.message);
  }
};

export const storeCompanyData = async ({ company, role, data, metadata = {} }) => {
  if (!isRAGAvailable || !qdrantClient) return;

  try {
    const docText = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const vector = await generateEmbedding(docText);
    if (!vector) return;

    await qdrantClient.upsert(COMPANY_COLLECTION, {
      wait: true,
      points: [
        {
          id: generateUuid(`${company}_${role}`),
          vector,
          payload: {
            content: docText,
            company,
            companyKey: normalizeKey(company),
            role,
            roleKey: normalizeKey(role),
            type: "ideal_answer_rubric",
            updatedAt: new Date().toISOString(),
            ...metadata,
          },
        },
      ],
    });
  } catch (error) {
    console.warn("Failed to store company data in Qdrant:", error.message);
  }
};

export const retrieveInterviewContext = async ({
  role,
  company,
  section,
  query,
  limit = 5,
  minScore = 7,
}) => {
  if (!isRAGAvailable || !qdrantClient) return [];

  try {
    const queryText =
      query?.trim() || `${role} interview questions for ${company} in section: ${section || "general"}`;

    const primaryFilter = createKeywordFilter({ company, role, section, minScore });
    const fallbackFilter = createKeywordFilter({ minScore });

    const results = await searchCollection({
      collectionName: INTERVIEW_COLLECTION,
      queryText,
      limit,
      primaryFilter,
      fallbackFilter,
      fallbackToUnfiltered: false,
    });

    return mapSearchResults(results);
  } catch (error) {
    console.warn("Qdrant retrieval failed:", error.message);
    return [];
  }
};

export const retrieveCompanyContext = async ({ company, role, query, limit = 3 }) => {
  const results = await searchKnowledge({
    collection: "company",
    query:
      query?.trim() || `${company} ${role} interview requirements, patterns, and ideal answer rubric`,
    company,
    role,
    limit,
  });

  return results.map((hit) => hit.content).filter(Boolean).join("\n\n");
};

export const addKnowledge = async ({ id, content, metadata = {} }) => {
  if (!isRAGAvailable || !qdrantClient) {
    throw new Error("RAG service not available");
  }

  const vector = await generateEmbedding(content);
  if (!vector) throw new Error("Failed to generate embedding");

  const formattedUuid = generateUuid(id);

  await qdrantClient.upsert(INTERVIEW_COLLECTION, {
    wait: true,
    points: [
      {
        id: formattedUuid,
        vector,
        payload: {
          content,
          companyKey: normalizeKey(metadata.company),
          roleKey: normalizeKey(metadata.role),
          sectionKey: normalizeKey(metadata.section),
          ...metadata,
        },
      },
    ],
  });

  return { success: true, id: formattedUuid };
};

export const sampleKnowledge = async ({
  collection = "problems",
  limit = 5,
  maxCandidates = 200,
  filter,
  excludeIds = [],
} = {}) => {
  if (!isRAGAvailable || !qdrantClient) return [];

  const collectionName = getCollectionName(collection);
  if (!knownCollections.has(collectionName)) return [];

  let effectiveFilter = filter;
  if (!filter && (collection === "problems" || collection === "tech_questions" || collection === "personal_questions")) {
    // apply category filtering to fetch from the unified collection correctly
    effectiveFilter = { must: [{ key: "category", match: { value: collection } }] };
  }

  try {
    const candidates = [];
    const excluded = new Set((excludeIds || []).map((id) => String(id)));
    let offset = undefined;

    while (candidates.length < maxCandidates) {
      const response = await qdrantClient.scroll(collectionName, {
        limit: Math.min(64, maxCandidates - candidates.length),
        offset,
        filter: effectiveFilter,
        with_payload: true,
        with_vector: false,
      });

      const points = Array.isArray(response?.points) ? response.points : [];
      if (points.length === 0) break;

      for (const point of points) {
        const pointId = String(point.id);
        if (!excluded.has(pointId)) {
          candidates.push(point);
        }
      }

      offset = response?.next_page_offset;
      if (!offset) break;
    }

    if (candidates.length === 0) return [];

    for (let index = candidates.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
    }

    return mapScrollResults(candidates.slice(0, limit));
  } catch (error) {
    console.warn("Knowledge sampling failed:", error.message);
    return [];
  }
};

export const searchKnowledge = async ({
  collection = "interview",
  query,
  company,
  role,
  section,
  limit = 5,
}) => {
  if (!isRAGAvailable || !qdrantClient) return [];

  const normalizedCollection = getCollectionName(collection);
  if (normalizedCollection !== INTERVIEW_COLLECTION && normalizedCollection !== COMPANY_COLLECTION) {
    return [];
  }
  const primaryFilter = createKeywordFilter({
    company,
    role,
    section,
    minScore: normalizedCollection === INTERVIEW_COLLECTION ? 0 : undefined,
  });
  const fallbackFilter =
    normalizedCollection === INTERVIEW_COLLECTION
      ? createKeywordFilter({ minScore: 0 })
      : undefined;
  const fallbackToUnfiltered = normalizedCollection === COMPANY_COLLECTION && Boolean(company || role || section);

  try {
    const results = await searchCollection({
      collectionName: normalizedCollection,
      queryText: query,
      limit,
      primaryFilter,
      fallbackFilter,
      fallbackToUnfiltered,
    });

    return mapSearchResults(results);
  } catch (error) {
    console.warn("Knowledge search failed:", error.message);
    return [];
  }
};

export const getRAGStatus = () => ({
  ready: isRAGAvailable,
  datasetReady: isDatasetAvailable,
  qdrantReady: Boolean(qdrantClient),
  embeddingReady: Boolean(embeddingModel),
  provider: "qdrant",
  embeddingModel: EMBEDDING_MODEL,
  qdrantUrl: getQdrantUrl(),
  collections: {
    interview: INTERVIEW_COLLECTION,
    company: COMPANY_COLLECTION,
    problems: PROBLEMS_COLLECTION,
    tech_questions: TECH_QUESTIONS_COLLECTION,
    personal_questions: PERSONAL_QUESTIONS_COLLECTION,
  },
});

export const isRAGReady = () => isRAGAvailable;
export const isRAGDatasetReady = () => isDatasetAvailable;
