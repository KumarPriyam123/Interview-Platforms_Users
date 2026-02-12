"""
API Gateway - Interviewer Routes
Endpoints for listing and retrieving interviewers.
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
import httpx


from models.api_models import (
    InterviewerListResponse, InterviewerDetailResponse, InterviewerProfile
)
from api.config import get_settings

router = APIRouter(prefix="/interviewers", tags=["Interviewers"])
settings = get_settings()


@router.get(
    "",
    response_model=InterviewerListResponse,
    summary="List all interviewers",
    description="Get a list of all available interviewers with optional filtering.",
    responses={
        200: {"description": "Interviewers retrieved successfully"},
        503: {"description": "Matching service unavailable"},
    }
)
async def list_interviewers(
    skills: Optional[str] = Query(
        None,
        description="Filter by skills (comma-separated, e.g., 'Python,Django')"
    ),
    experience_level: Optional[str] = Query(
        None,
        description="Filter by candidate level they can interview: entry, intermediate, senior, expert"
    ),
    domain: Optional[str] = Query(
        None,
        description="Filter by domain expertise (e.g., 'fintech', 'e-commerce')"
    ),
    interview_type: Optional[str] = Query(
        None,
        description="Filter by interview type (e.g., 'technical_coding', 'system_design')"
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=10, ge=1, le=50, description="Items per page")
):
    """
    List all available interviewers with optional filtering.
    
    **Filters:**
    - **skills**: Comma-separated skills (e.g., "Python,Django,AWS")
    - **experience_level**: Candidate level they can interview
    - **domain**: Industry domain expertise
    - **interview_type**: Type of interview they conduct
    
    **Pagination:**
    - **page**: Page number (default 1)
    - **per_page**: Items per page (default 10, max 50)
    """
    try:
        params = {
            "page": page,
            "per_page": per_page
        }
        if skills:
            params["skills"] = skills
        if experience_level:
            params["experience_level"] = experience_level
        if domain:
            params["domain"] = domain
        if interview_type:
            params["interview_type"] = interview_type
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{settings.PROFILE_MATCHING_URL}/interviewers",
                params=params
            )
            
            if response.status_code != 200:
                return InterviewerListResponse(
                    success=False,
                    error=f"Matching service returned status {response.status_code}"
                )
            
            result = response.json()
            
            # Transform interviewers to response model
            interviewers = []
            for i in result.get("interviewers", []):
                interviewers.append(InterviewerProfile(
                    interviewer_id=i["interviewer_id"],
                    name=i["name"],
                    title=i["title"],
                    company=i["company"],
                    total_experience_years=i["total_experience_years"],
                    seniority_level=i["seniority_level"],
                    expertise_skills=i["expertise_skills"],
                    domain_expertise=i["domain_expertise"],
                    interview_types=i["interview_types"],
                    can_interview_levels=i["can_interview_levels"],
                    languages=i.get("languages", ["English"]),
                    rating=i.get("rating"),
                    total_interviews_conducted=i.get("total_interviews_conducted", 0),
                    bio=i.get("bio")
                ))
            
            return InterviewerListResponse(
                success=True,
                interviewers=interviewers,
                total=result.get("total", len(interviewers)),
                page=result.get("page", page),
                per_page=result.get("per_page", per_page)
            )
            
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile matching service is unavailable. Please try again later."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Service timed out. Please try again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving interviewers: {str(e)}"
        )


@router.get(
    "/{interviewer_id}",
    response_model=InterviewerDetailResponse,
    summary="Get interviewer details",
    description="Get detailed profile of a specific interviewer by ID.",
    responses={
        200: {"description": "Interviewer found"},
        404: {"description": "Interviewer not found"},
        503: {"description": "Matching service unavailable"},
    }
)
async def get_interviewer(interviewer_id: str):
    """
    Get detailed profile of a specific interviewer.
    
    - **interviewer_id**: Unique identifier (e.g., "INT001")
    
    Returns complete interviewer profile including:
    - Skills and expertise areas
    - Experience and seniority level
    - Interview types they conduct
    - Candidate levels they can interview
    - Rating and bio
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{settings.PROFILE_MATCHING_URL}/interviewers/{interviewer_id}"
            )
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Interviewer with ID '{interviewer_id}' not found"
                )
            
            if response.status_code != 200:
                return InterviewerDetailResponse(
                    success=False,
                    error=f"Service returned status {response.status_code}"
                )
            
            i = response.json()
            
            interviewer = InterviewerProfile(
                interviewer_id=i["interviewer_id"],
                name=i["name"],
                title=i["title"],
                company=i["company"],
                total_experience_years=i["total_experience_years"],
                seniority_level=i["seniority_level"],
                expertise_skills=i["expertise_skills"],
                domain_expertise=i["domain_expertise"],
                interview_types=i["interview_types"],
                can_interview_levels=i["can_interview_levels"],
                languages=i.get("languages", ["English"]),
                rating=i.get("rating"),
                total_interviews_conducted=i.get("total_interviews_conducted", 0),
                bio=i.get("bio")
            )
            
            return InterviewerDetailResponse(
                success=True,
                interviewer=interviewer
            )
            
    except HTTPException:
        raise
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile matching service is unavailable. Please try again later."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving interviewer: {str(e)}"
        )
