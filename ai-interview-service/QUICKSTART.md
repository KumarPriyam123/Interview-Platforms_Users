# Quick Start (MERN + Qdrant RAG)

## 1. Install Dependencies

```bash
npm install
```

## 2. Start Qdrant

Run Qdrant locally before starting the service:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

If you are using Qdrant Cloud, use its HTTPS URL in `QDRANT_URL` and set `QDRANT_API_KEY`.

## 3. Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ai_interview_service
PORT=8000
FRONTEND_URL=http://localhost:5173

LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=
GEMINI_API_KEY=
LLM_API_KEY=

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
```

Notes:
- `LLM_PROVIDER` supports `groq`, `openai`, and `gemini`.
- `GEMINI_API_KEY` is still required for embeddings because the Qdrant layer uses Gemini embeddings.
- If the provider-specific key is missing, the service falls back to `LLM_API_KEY`.

## 4. Start the Service

```bash
npm run dev
```

The backend starts on `http://localhost:8000`.

## 5. Optional: Seed Qdrant

```bash
npm run seed
```

This loads sample company rubric data and interview examples into Qdrant.

## 6. Useful Endpoints

```bash
# Health + RAG readiness
curl http://localhost:8000/health

# Start interview (multipart form)
curl -X POST http://localhost:8000/interviews/start ^
  -F "file=@resume.txt" ^
  -F "email=test@example.com" ^
  -F "company=ExampleCorp" ^
  -F "role=Software Engineer"

# Add company-specific RAG context
curl -X POST http://localhost:8000/interviews/rag/company-context ^
  -H "Content-Type: application/json" ^
  -d "{\"company\":\"ExampleCorp\",\"role\":\"Software Engineer\",\"content\":\"Candidates should explain API design trade-offs and observability choices.\"}"

# Add interview knowledge/example
curl -X POST http://localhost:8000/interviews/rag/knowledge ^
  -H "Content-Type: application/json" ^
  -d "{\"id\":\"example_1\",\"content\":\"Question: How do you scale a Node API? Ideal Answer: ...\",\"metadata\":{\"company\":\"ExampleCorp\",\"role\":\"Software Engineer\",\"score\":10}}"

# Search RAG knowledge
curl -X POST http://localhost:8000/interviews/rag/search ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"node api scaling\",\"company\":\"ExampleCorp\",\"role\":\"Software Engineer\"}"
```
