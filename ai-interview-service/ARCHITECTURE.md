# Architecture (MERN Backend v2)

## Overview

`ai-interview-service` is a Node.js microservice with:
- Express for API
- MongoDB + Mongoose for persistence
- Pluggable LLM provider calls (Gemini/OpenAI)
- ChromaDB for RAG (Retrieval-Augmented Generation)
- Section-based interview with counter-questions and doubt resolution

## Structure

- `server.js`: service bootstrap, env loading, DB + RAG connection
- `src/app.js`: Express app, middleware, route registration
- `src/routes/interview.routes.js`: interview endpoint definitions
- `src/controllers/interview.controller.js`: request orchestration
- `src/services/interview.service.js`: MongoDB data operations
- `src/services/llm.service.js`: provider-backed LLM logic (sections, counter-Q, doubt)
- `src/services/rag.service.js`: ChromaDB vector store for knowledge retrieval
- `src/models/*`: Mongoose schemas
- `src/middlewares/error.middleware.js`: centralized error handling
- `src/utils/resumeExtractor.js`: PDF/DOCX text extraction

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/interviews/start` | Upload resume, generate all questions in sections |
| GET | `/interviews/:id/questions` | Get all questions grouped by sections (sidebar) |
| GET | `/interviews/:id/question` | Get current question |
| POST | `/interviews/:id/answer` | Submit answer (returns evaluation + optional counter-Q) |
| POST | `/interviews/:id/counter-answer` | Answer a follow-up counter question |
| POST | `/interviews/:id/next` | Move to next question |
| POST | `/interviews/:id/doubt` | Ask a doubt/clarification (AI responds helpfully) |
| GET | `/interviews/:id/report` | Generate comprehensive report |
| POST | `/interviews/:id/end` | End interview early |

## Request Flow

1. Client calls `POST /interviews/start` with resume + role + company
2. Backend parses resume, extracts skills via LLM
3. LLM generates ALL questions at once, organized in 4 sections
4. Questions stored in MongoDB, session created
5. Client fetches all questions for sidebar via `GET /questions`
6. For each question:
   - Client submits answer via `POST /answer`
   - LLM evaluates and may generate a counter-question
   - Client can ask doubts via `POST /doubt`
   - Client moves to next via `POST /next`
7. At end, `GET /report` generates comprehensive report with LLM
8. Report data stored in RAG for future sessions

## RAG Architecture

ChromaDB stores two collections:
- `interview_knowledge`: Past Q&A with scores for context-enriched generation
- `company_data`: Company-specific interview patterns

## LLM Providers

`src/services/llm.service.js` supports:
- `LLM_PROVIDER=gemini` (default, model: gemini-2.0-flash)
- `LLM_PROVIDER=openai`

## Data Model

Collections:
- `InterviewSession`: email, company, role, sections, conversationHistory
- `InterviewQuestion`: sectionIndex, sectionTitle, difficulty, counterQuestions
- `InterviewReport`: overallScore, sectionScores, skillAssessment
