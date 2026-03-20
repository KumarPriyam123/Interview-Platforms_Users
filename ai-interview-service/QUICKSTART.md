# Quick Start (MERN + LLM)

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment

Copy `.env.example` to `.env` and fill the values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ai_interview_service
PORT=8000
FRONTEND_URL=http://localhost:5173
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=
LLM_API_KEY=
```

Notes:
- Set `LLM_PROVIDER=openai` to use OpenAI.
- If provider-specific key is not present, service uses `LLM_API_KEY` fallback.

## 3. Start Service

```bash
npm run dev
```

Server starts on `http://localhost:8000`.

## 4. Test APIs

```bash
# Start interview (multipart form)
curl -X POST http://localhost:8000/interviews/start \
  -F "file=@resume.txt" \
  -F "email=test@example.com" \
  -F "company=ExampleCorp" \
  -F "role=Software Engineer"

# Get question
curl http://localhost:8000/interviews/{sessionId}/question

# Submit answer
curl -X POST http://localhost:8000/interviews/{sessionId}/answer \
  -H "Content-Type: application/json" \
  -d '{"answer":"My answer"}'

# Get report
curl http://localhost:8000/interviews/{sessionId}/report
```
