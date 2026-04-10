"""
Profile Matching Microservice
FastAPI application for matching candidates with interviewers.
"""

import os
import sys

# Add backend/src to path so we can import models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from models.matching_models import (
    InterviewerProfile, CandidateInput, MatchingResponse,
    InterviewerListResponse, ErrorResponse
)
from services.matching.database import get_all_interviewers, get_interviewer_by_id, filter_interviewers
from services.matching.matcher import find_best_interviewers

# App configuration
app = FastAPI(
    title="Profile Matching Service",
    description="Microservice for matching candidates with the best interviewers based on skills, experience, and domain expertise",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    service: str
    version: str


@app.get("/", response_model=HealthResponse, tags=["Health"])
async def root():
    """Root endpoint - health check."""
    return HealthResponse(
        status="healthy",
        service="profile-matching",
        version="1.0.0"
    )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="profile-matching",
        version="1.0.0"
    )


@app.post(
    "/match",
    response_model=MatchingResponse,
    tags=["Matching"],
    summary="Find best interviewer matches",
    description="Match a candidate with the most suitable interviewers based on skills, experience, and domain.",
    responses={
        200: {
            "description": "Successfully matched interviewers",
            "content": {
                "application/json": {
                    "example": {
                        "candidate_name": "John Doe",
                        "candidate_skills": ["Python", "Django", "AWS"],
                        "candidate_experience_years": 5.5,
                        "candidate_level": "senior",
                        "top_matches": [
                            {
                                "interviewer_id": "INT001",
                                "name": "Sarah Chen",
                                "overall_score": 0.89
                            }
                        ],
                        "total_interviewers_evaluated": 15,
                        "recommendation": "Sarah Chen is the best match..."
                    }
                }
            }
        },
        400: {"description": "Invalid input data"},
    }
)
async def match_interviewer(
    candidate: CandidateInput,
    top_n: int = Query(default=5, ge=1, le=10, description="Number of top matches to return")
):
    """
    Find the best interviewer matches for a candidate.
    
    - **candidate**: Candidate information including skills and experience
    - **top_n**: Number of top matches to return (1-10, default 5)
    
    Returns top matching interviewers with detailed score breakdowns.
    """
    if not candidate.skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate must have at least one skill"
        )
    
    try:
        result = find_best_interviewers(candidate, top_n=top_n)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during matching: {str(e)}"
        )


@app.get(
    "/interviewers",
    response_model=InterviewerListResponse,
    tags=["Interviewers"],
    summary="List all interviewers",
    description="Get a list of all available interviewers with optional filtering.",
)
async def list_interviewers(
    skills: Optional[str] = Query(None, description="Filter by skills (comma-separated)"),
    experience_level: Optional[str] = Query(None, description="Filter by candidate level they can interview"),
    domain: Optional[str] = Query(None, description="Filter by domain expertise"),
    interview_type: Optional[str] = Query(None, description="Filter by interview type"),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=10, ge=1, le=50, description="Items per page")
):
    """
    List all available interviewers with optional filtering.
    
    - **skills**: Filter by skills (comma-separated, e.g., "Python,Django")
    - **experience_level**: Filter by candidate level ("entry", "intermediate", "senior", "expert")
    - **domain**: Filter by domain expertise (e.g., "fintech", "e-commerce")
    - **interview_type**: Filter by interview type (e.g., "technical_coding", "system_design")
    """
    # Parse skills filter
    skills_list = None
    if skills:
        skills_list = [s.strip() for s in skills.split(",") if s.strip()]
    
    # Filter interviewers
    interviewers = filter_interviewers(
        skills=skills_list,
        experience_level=experience_level,
        domain=domain,
        interview_type=interview_type
    )
    
    # Paginate
    total = len(interviewers)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = interviewers[start:end]
    
    return InterviewerListResponse(
        interviewers=paginated,
        total=total,
        page=page,
        per_page=per_page
    )


@app.get(
    "/interviewers/{interviewer_id}",
    response_model=InterviewerProfile,
    tags=["Interviewers"],
    summary="Get interviewer details",
    description="Get detailed profile of a specific interviewer by ID.",
    responses={
        200: {"description": "Interviewer found"},
        404: {"description": "Interviewer not found"},
    }
)
async def get_interviewer(interviewer_id: str):
    """
    Get detailed profile of a specific interviewer.
    
    - **interviewer_id**: Unique identifier of the interviewer (e.g., "INT001")
    """
    interviewer = get_interviewer_by_id(interviewer_id)
    
    if not interviewer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interviewer with ID '{interviewer_id}' not found"
        )
    
    return interviewer


@app.get(
    "/stats",
    tags=["Interviewers"],
    summary="Get interviewer statistics",
    description="Get statistics about available interviewers.",
)
async def get_stats():
    """Get statistics about the interviewer pool."""
    interviewers = get_all_interviewers()
    
    # Calculate stats
    total = len(interviewers)
    avg_experience = sum(i.total_experience_years for i in interviewers) / total if total else 0
    avg_rating = sum(i.rating for i in interviewers if i.rating) / sum(1 for i in interviewers if i.rating)
    
    # Count by seniority
    seniority_counts = {}
    for i in interviewers:
        level = i.seniority_level.value
        seniority_counts[level] = seniority_counts.get(level, 0) + 1
    
    # Get all unique skills
    all_skills = set()
    for i in interviewers:
        all_skills.update(i.expertise_skills)
    
    # Get all unique domains
    all_domains = set()
    for i in interviewers:
        all_domains.update(i.domain_expertise)
    
    return {
        "total_interviewers": total,
        "average_experience_years": round(avg_experience, 1),
        "average_rating": round(avg_rating, 2),
        "seniority_distribution": seniority_counts,
        "unique_skills_count": len(all_skills),
        "unique_domains": list(all_domains),
        "top_skills": list(all_skills)[:20]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
