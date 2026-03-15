"""
API Gateway - Pydantic Models
Request and response models for the API Gateway.
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum


# =====================
# Resume Parser Models
# =====================

class WorkExperience(BaseModel):
    """Work experience entry from parsed resume."""
    company: str
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_months: Optional[int] = None
    description: Optional[str] = None
    location: Optional[str] = None


class Education(BaseModel):
    """Education entry from parsed resume."""
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[int] = None
    gpa: Optional[float] = None


class ParsedResumeData(BaseModel):
    """Parsed resume data structure."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    total_experience_years: float = 0.0
    experience_level: str = "entry"
    work_experiences: list[WorkExperience] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    raw_text: Optional[str] = None
    file_name: Optional[str] = None
    parse_confidence: float = 0.0


class ResumeUploadResponse(BaseModel):
    """Response for resume upload endpoint."""
    success: bool
    message: str
    data: Optional[ParsedResumeData] = None
    file_id: Optional[str] = None
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Resume parsed successfully",
                "data": {
                    "name": "John Doe",
                    "email": "john@example.com",
                    "skills": ["Python", "Django", "AWS"],
                    "total_experience_years": 5.5,
                    "experience_level": "senior"
                },
                "file_id": "resume_abc123.pdf"
            }
        }


# =====================
# Profile Matching Models
# =====================

class MatchInterviewerRequest(BaseModel):
    """Request to match interviewers from parsed resume data."""
    name: Optional[str] = None
    skills: list[str] = Field(..., min_length=1, description="Candidate skills")
    experience_years: float = Field(..., ge=0, description="Years of experience")
    experience_level: str = Field(..., description="Experience level")
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    industries: list[str] = Field(default_factory=list)
    top_n: int = Field(default=5, ge=1, le=10, description="Number of matches")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "skills": ["Python", "Django", "PostgreSQL", "AWS"],
                "experience_years": 5.5,
                "experience_level": "senior",
                "current_role": "Senior Backend Engineer",
                "top_n": 5
            }
        }


class ScoreBreakdown(BaseModel):
    """Breakdown of matching scores."""
    skill_match_score: float
    experience_compatibility_score: float
    domain_match_score: float
    interview_type_match_score: float


class InterviewerMatch(BaseModel):
    """Single interviewer match result."""
    interviewer_id: str
    name: str
    title: str
    company: str
    overall_score: float
    score_breakdown: ScoreBreakdown
    matched_skills: list[str]
    missing_skills: list[str]
    interviewer_expertise: list[str]
    interview_types: list[str]
    match_explanation: str


class MatchInterviewerResponse(BaseModel):
    """Response for interviewer matching."""
    success: bool
    candidate_name: Optional[str] = None
    candidate_skills: list[str] = Field(default_factory=list)
    candidate_experience_years: float = 0.0
    candidate_level: str = ""
    top_matches: list[InterviewerMatch] = Field(default_factory=list)
    total_interviewers_evaluated: int = 0
    recommendation: str = ""
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "candidate_name": "John Doe",
                "candidate_skills": ["Python", "Django"],
                "top_matches": [
                    {
                        "interviewer_id": "INT001",
                        "name": "Sarah Chen",
                        "overall_score": 0.89
                    }
                ],
                "recommendation": "Sarah Chen is the best match..."
            }
        }


# =====================
# Interviewer Models
# =====================

class InterviewerProfile(BaseModel):
    """Complete interviewer profile."""
    interviewer_id: str
    name: str
    title: str
    company: str
    total_experience_years: float
    seniority_level: str
    expertise_skills: list[str]
    domain_expertise: list[str]
    interview_types: list[str]
    can_interview_levels: list[str]
    languages: list[str] = Field(default=["English"])
    rating: Optional[float] = None
    total_interviews_conducted: int = 0
    bio: Optional[str] = None


class InterviewerListResponse(BaseModel):
    """Response for listing interviewers."""
    success: bool
    interviewers: list[InterviewerProfile] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    per_page: int = 10
    error: Optional[str] = None


class InterviewerDetailResponse(BaseModel):
    """Response for single interviewer detail."""
    success: bool
    interviewer: Optional[InterviewerProfile] = None
    error: Optional[str] = None


# =====================
# Combined Parse and Match
# =====================

class ParseAndMatchResponse(BaseModel):
    """Response for combined parse and match endpoint."""
    success: bool
    message: str
    parsed_resume: Optional[ParsedResumeData] = None
    matching_results: Optional[MatchInterviewerResponse] = None
    file_id: Optional[str] = None
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Resume parsed and interviewers matched successfully",
                "parsed_resume": {
                    "name": "John Doe",
                    "skills": ["Python", "Django"]
                },
                "matching_results": {
                    "top_matches": [],
                    "recommendation": "..."
                }
            }
        }


# =====================
# Error Models
# =====================

class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    error: str
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    dependencies: dict[str, str] = Field(default_factory=dict)
