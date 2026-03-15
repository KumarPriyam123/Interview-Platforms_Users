"""
API Gateway - Matching Routes
Endpoints for interviewer matching.
"""

from fastapi import APIRouter, HTTPException, status
import httpx


from models.api_models import (
    MatchInterviewerRequest, MatchInterviewerResponse,
    InterviewerMatch, ScoreBreakdown
)
from api.config import get_settings
from api.routes.resume import parsed_resumes_store

router = APIRouter(prefix="/match-interviewer", tags=["Matching"])
settings = get_settings()


@router.post(
    "",
    response_model=MatchInterviewerResponse,
    summary="Match candidate with interviewers",
    description="Find the best interviewer matches based on candidate skills, experience, and background.",
    responses={
        200: {"description": "Matching successful"},
        400: {"description": "Invalid input data"},
        503: {"description": "Matching service unavailable"},
    }
)
async def match_interviewer(request: MatchInterviewerRequest):
    """
    Match a candidate with the most suitable interviewers.
    
    - **skills**: List of candidate's technical skills (required)
    - **experience_years**: Total years of experience
    - **experience_level**: "entry", "intermediate", "senior", or "expert"
    - **current_role**: Current job title (optional)
    - **target_role**: Target role for interview (optional)
    - **industries**: Industries worked in (optional)
    - **top_n**: Number of matches to return (1-10, default 5)
    
    Returns top matching interviewers with detailed score breakdowns.
    """
    if not request.skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one skill is required"
        )
    
    # Prepare request for matching service
    match_payload = {
        "name": request.name,
        "skills": request.skills,
        "experience_years": request.experience_years,
        "experience_level": request.experience_level,
        "current_role": request.current_role,
        "target_role": request.target_role,
        "industries": request.industries
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.PROFILE_MATCHING_URL}/match",
                json=match_payload,
                params={"top_n": request.top_n}
            )
            
            if response.status_code != 200:
                return MatchInterviewerResponse(
                    success=False,
                    error=f"Matching service returned status {response.status_code}"
                )
            
            result = response.json()
            
            # Transform to response model
            return MatchInterviewerResponse(
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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile matching service is unavailable. Please try again later."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Profile matching service timed out. Please try again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with matching service: {str(e)}"
        )


@router.post(
    "/from-resume/{file_id}",
    response_model=MatchInterviewerResponse,
    summary="Match interviewer from previously uploaded resume",
    description="Use a previously parsed resume to find matching interviewers.",
)
async def match_from_resume(
    file_id: str,
    top_n: int = 5
):
    """
    Match interviewers using a previously uploaded and parsed resume.
    
    - **file_id**: File ID from a previous upload-resume call
    - **top_n**: Number of matches to return (default 5)
    """
    # Get stored resume data
    if file_id not in parsed_resumes_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume with ID '{file_id}' not found. Please upload first."
        )
    
    stored = parsed_resumes_store[file_id]
    parsed_data = stored["parsed_data"]
    
    # Create match request from parsed data
    request = MatchInterviewerRequest(
        name=parsed_data.get("name"),
        skills=parsed_data.get("skills", []),
        experience_years=parsed_data.get("total_experience_years", 0),
        experience_level=parsed_data.get("experience_level", "entry"),
        current_role=None,  # Could extract from work experiences
        top_n=top_n
    )
    
    if not request.skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No skills found in parsed resume. Cannot match interviewers."
        )
    
    # Delegate to main matching function
    return await match_interviewer(request)
