"""
API Gateway Microservice
Main FastAPI application that serves as the entry point for all API requests.
Routes requests to appropriate microservices (resume_parser, profile_matching).
"""

import os
import sys
import uuid
from datetime import datetime

# Add backend/src to path so we can import models, config, routes
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, UploadFile, File, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import httpx
import aiofiles

from models.api_models import (
    HealthResponse, ParseAndMatchResponse, ParsedResumeData,
    MatchInterviewerResponse, InterviewerMatch, ScoreBreakdown
)
from api.config import get_settings
from api.routes import resume_router, matching_router, interviewers_router
from api.routes.resume import parsed_resumes_store

# Get settings
settings = get_settings()

# App configuration
app = FastAPI(
    title="Interview Platform API Gateway",
    description="""
## Interview Platform API

A comprehensive platform for matching candidates with the best interviewers for mock interviews.

### Features:
- **Resume Parsing**: Upload PDF or DOCX resumes to extract skills, experience, and education
- **Interviewer Matching**: Find the most suitable interviewers based on candidate profile
- **Interviewer Management**: Browse and filter available interviewers

### Services:
- Resume Parser Service (port 8001)
- Profile Matching Service (port 8002)
- API Gateway (port 8000) - this service

### Quick Start:
1. Upload a resume at `/api/upload-resume`
2. Use the parsed data to match interviewers at `/api/match-interviewer`
3. Or use the combined endpoint at `/api/parse-and-match` for a one-step solution
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Health", "description": "Health check endpoints"},
        {"name": "Resume", "description": "Resume upload and parsing"},
        {"name": "Matching", "description": "Candidate-interviewer matching"},
        {"name": "Interviewers", "description": "Interviewer management"},
        {"name": "Combined", "description": "Combined operations"},
    ]
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(resume_router, prefix="/api")
app.include_router(matching_router, prefix="/api")
app.include_router(interviewers_router, prefix="/api")


# =====================
# Health Endpoints
# =====================

@app.get("/", response_model=HealthResponse, tags=["Health"])
async def root():
    """Root endpoint - API Gateway health check."""
    return HealthResponse(
        status="healthy",
        service="api-gateway",
        version="1.0.0",
        dependencies={}
    )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint with dependency status.
    
    Checks the availability of dependent services:
    - Resume Parser (port 8001)
    - Profile Matching (port 8002)
    """
    dependencies = {}
    
    # Check resume parser service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.RESUME_PARSER_URL}/health")
            dependencies["resume_parser"] = "healthy" if response.status_code == 200 else "degraded"
    except Exception:
        dependencies["resume_parser"] = "unavailable"
    
    # Check profile matching service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.PROFILE_MATCHING_URL}/health")
            dependencies["profile_matching"] = "healthy" if response.status_code == 200 else "degraded"
    except Exception:
        dependencies["profile_matching"] = "unavailable"
    
    # Determine overall status
    all_healthy = all(s == "healthy" for s in dependencies.values())
    any_unavailable = any(s == "unavailable" for s in dependencies.values())
    
    status = "healthy" if all_healthy else ("degraded" if not any_unavailable else "unhealthy")
    
    return HealthResponse(
        status=status,
        service="api-gateway",
        version="1.0.0",
        dependencies=dependencies
    )


# =====================
# Combined Endpoint
# =====================

@app.post(
    "/api/parse-and-match",
    response_model=ParseAndMatchResponse,
    tags=["Combined"],
    summary="Upload resume, parse it, and get interviewer matches",
    description="Combined endpoint that performs resume parsing and interviewer matching in one call.",
    responses={
        200: {"description": "Resume parsed and interviewers matched successfully"},
        400: {"description": "Invalid file format or parsing error"},
        413: {"description": "File too large"},
        503: {"description": "One or more services unavailable"},
    }
)
async def parse_and_match(
    file: UploadFile = File(..., description="Resume file (PDF or DOCX, max 10MB)"),
    top_n: int = Query(default=5, ge=1, le=10, description="Number of interviewer matches to return")
):
    """
    Upload a resume, parse it, and get interviewer matches in a single request.
    
    This is a convenience endpoint that combines:
    1. `/api/upload-resume` - Parse the resume
    2. `/api/match-interviewer` - Find matching interviewers
    
    **Parameters:**
    - **file**: Resume file (PDF or DOCX, max 10MB)
    - **top_n**: Number of top interviewer matches to return (1-10, default 5)
    
    **Returns:**
    - Parsed resume data
    - Top matching interviewers with score breakdowns
    - File ID for reference
    """
    # Validate file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}"
        )
    
    # Check file size
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate file ID and save
    file_id = f"resume_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_id)
    
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Step 1: Parse the resume
    parsed_data = None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"file": (file.filename, content, file.content_type)}
            response = await client.post(
                f"{settings.RESUME_PARSER_URL}/parse",
                files=files
            )
            
            if response.status_code != 200:
                return ParseAndMatchResponse(
                    success=False,
                    message="Failed to parse resume",
                    error=f"Parser service returned status {response.status_code}",
                    file_id=file_id
                )
            
            parser_result = response.json()
            
            if not parser_result.get("success"):
                return ParseAndMatchResponse(
                    success=False,
                    message="Resume parsing failed",
                    error=parser_result.get("error", "Unknown parsing error"),
                    file_id=file_id
                )
            
            parsed_data = parser_result.get("data", {})
            
    except httpx.ConnectError:
        return ParseAndMatchResponse(
            success=False,
            message="Resume parser service unavailable",
            error="Could not connect to resume parser service",
            file_id=file_id
        )
    except httpx.TimeoutException:
        return ParseAndMatchResponse(
            success=False,
            message="Resume parser service timed out",
            error="Parser service did not respond in time",
            file_id=file_id
        )
    
    if not parsed_data or not parsed_data.get("skills"):
        return ParseAndMatchResponse(
            success=False,
            message="Could not extract skills from resume",
            parsed_resume=ParsedResumeData(**parsed_data) if parsed_data else None,
            error="No skills found in resume. Cannot match interviewers.",
            file_id=file_id
        )
    
    # Store parsed resume
    parsed_resumes_store[file_id] = {
        "parsed_data": parsed_data,
        "uploaded_at": datetime.utcnow().isoformat(),
        "original_filename": file.filename
    }
    
    # Step 2: Match interviewers
    match_payload = {
        "name": parsed_data.get("name"),
        "skills": parsed_data.get("skills", []),
        "experience_years": parsed_data.get("total_experience_years", 0),
        "experience_level": parsed_data.get("experience_level", "entry"),
        "current_role": None,
        "target_role": None,
        "industries": []
    }
    
    matching_results = None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.PROFILE_MATCHING_URL}/match",
                json=match_payload,
                params={"top_n": top_n}
            )
            
            if response.status_code != 200:
                return ParseAndMatchResponse(
                    success=True,  # Parsing succeeded
                    message="Resume parsed but matching failed",
                    parsed_resume=ParsedResumeData(**parsed_data),
                    error=f"Matching service returned status {response.status_code}",
                    file_id=file_id
                )
            
            result = response.json()
            
            matching_results = MatchInterviewerResponse(
                success=True,
                candidate_name=result.get("candidate_name"),
                candidate_skills=result.get("candidate_skills", []),
                candidate_experience_years=result.get("candidate_experience_years", 0),
                candidate_level=result.get("candidate_level", ""),
                top_matches=[
                    InterviewerMatch(
                        interviewer_id=m["interviewer_id"],
                        name=m["name"],
                        title=m["title"],
                        company=m["company"],
                        overall_score=m["overall_score"],
                        score_breakdown=ScoreBreakdown(**m["score_breakdown"]),
                        matched_skills=m["matched_skills"],
                        missing_skills=m["missing_skills"],
                        interviewer_expertise=m["interviewer_expertise"],
                        interview_types=m["interview_types"],
                        match_explanation=m["match_explanation"]
                    )
                    for m in result.get("top_matches", [])
                ],
                total_interviewers_evaluated=result.get("total_interviewers_evaluated", 0),
                recommendation=result.get("recommendation", "")
            )
            
    except httpx.ConnectError:
        return ParseAndMatchResponse(
            success=True,  # Parsing succeeded
            message="Resume parsed but matching service unavailable",
            parsed_resume=ParsedResumeData(**parsed_data),
            error="Could not connect to profile matching service",
            file_id=file_id
        )
    except httpx.TimeoutException:
        return ParseAndMatchResponse(
            success=True,
            message="Resume parsed but matching service timed out",
            parsed_resume=ParsedResumeData(**parsed_data),
            error="Matching service did not respond in time",
            file_id=file_id
        )
    
    return ParseAndMatchResponse(
        success=True,
        message="Resume parsed and interviewers matched successfully",
        parsed_resume=ParsedResumeData(**parsed_data),
        matching_results=matching_results,
        file_id=file_id
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
