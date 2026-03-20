# Architecture (MERN Backend)

## Overview

`ai-interview-service` is now a Node.js microservice using:
- Express for API
- MongoDB + Mongoose for persistence
- Pluggable LLM provider calls (Gemini/OpenAI)

## Structure

- `server.js`: service bootstrap, env loading, DB connection
- `src/app.js`: Express app, middleware, route registration
- `src/routes/interview.routes.js`: interview endpoint definitions
- `src/controllers/interview.controller.js`: request orchestration
- `src/services/interview.service.js`: MongoDB data operations
- `src/services/llm.service.js`: provider-backed LLM logic
- `src/models/*`: Mongoose schemas
- `src/middlewares/error.middleware.js`: centralized error handling

## Request Flow

1. Client calls `/interviews/*` endpoint.
2. Route forwards to controller.
3. Controller uses:
   - data service for MongoDB CRUD
   - LLM service for skills, questions, evaluations, report generation
4. Response returns normalized JSON for frontend.

## LLM Providers

`src/services/llm.service.js` supports:
- `LLM_PROVIDER=gemini`
- `LLM_PROVIDER=openai`

Runtime behavior:
- Uses provider-specific key (`GEMINI_API_KEY` or `OPENAI_API_KEY`)
- Falls back to `LLM_API_KEY` if provider key is missing
- Falls back to deterministic local logic if provider call fails

## Data Model

Collections:
- `InterviewSession`
- `InterviewQuestion`
- `InterviewReport`

IDs are Mongo ObjectIds and session lifecycle is tracked with `status`, `currentQuestionIndex`, and `completedAt`.
