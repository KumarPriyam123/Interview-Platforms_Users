# Architecture (MERN Backend v2)

> **Note:** The standalone frontend in `ai-interview-service/frontend/` has been
> removed. The main `frontend/` app now provides the AI interview UI via
> `AIInterviewPage.jsx` using the shared `CodeWorkspace` component. Code
> execution goes through the unified Docker pipeline at
> `POST /api/code-execution/jobs` in `Backend/`. This service's Node.js backend
> is retained for its LLM orchestration, interview flow, and question APIs.

## Overview

`ai-interview-service` is a Node.js microservice with:
- Express for API delivery
- MongoDB + Mongoose for interview/session persistence
- Pluggable LLM provider calls (Groq, OpenAI, Gemini)
- Qdrant for RAG (Retrieval-Augmented Generation)
- Section-based interview flow with counter-questions and doubt resolution

## Structure

- `server.js`: service bootstrap, env loading, MongoDB + Qdrant initialization
- `src/app.js`: Express app, middleware, route registration, health endpoint
- `src/routes/interview.routes.js`: interview routes plus RAG management/search routes
- `src/controllers/interview.controller.js`: interview orchestration
- `src/controllers/rag.controller.js`: RAG status, ingestion, and search handlers
- `src/services/interview.service.js`: MongoDB data operations
- `src/services/llm.service.js`: provider-backed LLM logic for question generation, evaluation, doubts, reports
- `src/services/rag.service.js`: Qdrant vector store integration and retrieval helpers
- `src/models/*`: Mongoose schemas
- `src/middlewares/error.middleware.js`: centralized error handling
- `src/utils/resumeExtractor.js`: PDF/DOCX text extraction

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health plus Qdrant RAG readiness |
| GET | `/interviews/rag/status` | Qdrant RAG status |
| POST | `/interviews/rag/company-context` | Store company/role-specific rubric or context |
| POST | `/interviews/rag/knowledge` | Store interview examples or reusable knowledge |
| POST | `/interviews/rag/search` | Search the Qdrant knowledge base |
| POST | `/interviews/start` | Upload resume and generate interview questions |
| GET | `/interviews/:id/questions` | Get all questions grouped by sections |
| GET | `/interviews/:id/question` | Get current question |
| POST | `/interviews/:id/answer` | Submit answer and get evaluation |
| POST | `/interviews/:id/counter-answer` | Submit answer to follow-up question |
| POST | `/interviews/:id/next` | Move to next question |
| POST | `/interviews/:id/doubt` | Ask a clarification question |
| GET | `/interviews/:id/report` | Generate final report |
| POST | `/interviews/:id/end` | End interview early |

## Request Flow

1. Client calls `POST /interviews/start` with resume, role, company, and email.
2. Backend extracts resume text and candidate skills.
3. Before generating questions, the LLM layer queries Qdrant for:
   - past high-scoring interview examples
   - company/role-specific rubric context
4. LLM generates all interview sections and questions.
5. Questions and session state are stored in MongoDB.
6. During answer evaluation, the LLM retrieves company rubric context and similar strong examples from Qdrant.
7. When the report is generated, answered interview data is written back to Qdrant for future retrieval.

## RAG Architecture

Qdrant stores two collections:
- `interview_knowledge`: past interview Q&A, exemplary answers, reusable interview examples
- `company_data`: company/role-specific rubric data, expectations, or preparation context

The RAG layer is used in three places:
- question generation
- answer evaluation
- manual ingestion/search through RAG endpoints

## Data Model

Collections:
- `InterviewSession`: email, company, role, sections, questions (embedded), conversationHistory
- `InterviewReport`: overallScore, sectionScores, skillAssessment
