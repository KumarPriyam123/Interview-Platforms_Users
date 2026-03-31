import os
from dotenv import load_dotenv
load_dotenv()  # Load .env file before other imports

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import interviews
from app.database import init_db

# Initialize FastAPI app
app = FastAPI(
    title="AI Mock Interview API",
    description="Backend API for AI-powered mock interviews",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
@app.on_event("startup")
async def startup():
    await init_db()

# Include routes
app.include_router(interviews.router, prefix="/interviews", tags=["interviews"])

@app.get("/")
async def root():
    return {"message": "AI Mock Interview API"}

@app.get("/health")
async def health():
    return {"status": "ok"}