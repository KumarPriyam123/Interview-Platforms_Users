"""
Profile Matching - Pydantic Models
Data models for interviewer profiles and matching results.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class SeniorityLevel(str, Enum):
    """Seniority level enumeration."""
    JUNIOR = "junior"
    INTERMEDIATE = "intermediate"
    SENIOR = "senior"
    EXPERT = "expert"


class InterviewType(str, Enum):
    """Types of interviews an interviewer can conduct."""
    TECHNICAL_CODING = "technical_coding"
    SYSTEM_DESIGN = "system_design"
    BEHAVIORAL = "behavioral"
    LEADERSHIP = "leadership"
    DATA_STRUCTURES = "data_structures"
    FRONTEND = "frontend"
    BACKEND = "backend"
    MOBILE = "mobile"
    DEVOPS = "devops"
    DATA_SCIENCE = "data_science"


class CandidateLevel(str, Enum):
    """Candidate experience levels."""
    ENTRY = "entry"
    INTERMEDIATE = "intermediate"
    SENIOR = "senior"
    EXPERT = "expert"


class TimeSlot(BaseModel):
    """Model for interviewer availability."""
    day: str = Field(..., description="Day of week")
    start_time: str = Field(..., description="Start time (HH:MM)")
    end_time: str = Field(..., description="End time (HH:MM)")
    timezone: str = Field("UTC", description="Timezone")


class InterviewerProfile(BaseModel):
    """Complete interviewer profile model."""
    interviewer_id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Full name")
    title: str = Field(..., description="Current job title")
    company: str = Field(..., description="Current/previous company")
    
    # Experience
    total_experience_years: float = Field(..., description="Years of experience")
    seniority_level: SeniorityLevel = Field(..., description="Seniority level")
    
    # Skills and Expertise
    expertise_skills: list[str] = Field(..., description="Technical skills they can assess")
    domain_expertise: list[str] = Field(..., description="Industry domains")
    
    # Interview Capabilities
    interview_types: list[InterviewType] = Field(..., description="Types of interviews they conduct")
    can_interview_levels: list[CandidateLevel] = Field(..., description="Candidate levels they can interview")
    
    # Additional Info
    languages: list[str] = Field(default=["English"], description="Spoken languages")
    rating: Optional[float] = Field(None, ge=0, le=5, description="Average rating (0-5)")
    total_interviews_conducted: int = Field(0, description="Number of interviews conducted")
    availability: list[TimeSlot] = Field(default_factory=list, description="Available time slots")
    
    # Bio
    bio: Optional[str] = Field(None, description="Short bio/description")
    
    class Config:
        json_schema_extra = {
            "example": {
                "interviewer_id": "INT001",
                "name": "Sarah Chen",
                "title": "Staff Software Engineer",
                "company": "Google",
                "total_experience_years": 10.0,
                "seniority_level": "expert",
                "expertise_skills": ["Python", "Go", "System Design", "Kubernetes", "AWS"],
                "domain_expertise": ["cloud", "fintech", "saas"],
                "interview_types": ["technical_coding", "system_design"],
                "can_interview_levels": ["intermediate", "senior", "expert"],
                "languages": ["English", "Mandarin"],
                "rating": 4.8
            }
        }


class ScoreBreakdown(BaseModel):
    """Breakdown of matching scores."""
    skill_match_score: float = Field(..., ge=0, le=1, description="Skill matching score")
    experience_compatibility_score: float = Field(..., ge=0, le=1, description="Experience level compatibility")
    domain_match_score: float = Field(..., ge=0, le=1, description="Domain/industry match")
    interview_type_match_score: float = Field(..., ge=0, le=1, description="Interview type match")


class InterviewerMatch(BaseModel):
    """Model for a single interviewer match result."""
    interviewer_id: str
    name: str
    title: str
    company: str
    overall_score: float = Field(..., ge=0, le=1)
    
    score_breakdown: ScoreBreakdown
    
    matched_skills: list[str] = Field(..., description="Skills that matched")
    missing_skills: list[str] = Field(..., description="Candidate skills interviewer doesn't have")
    interviewer_expertise: list[str] = Field(..., description="All interviewer skills")
    interview_types: list[str] = Field(..., description="Interview types they can conduct")
    
    match_explanation: str = Field(..., description="Human-readable explanation of match")


class CandidateInput(BaseModel):
    """Input model for candidate data (from parsed resume)."""
    name: Optional[str] = Field(None, description="Candidate name")
    skills: list[str] = Field(..., description="Candidate skills")
    experience_years: float = Field(..., ge=0, description="Years of experience")
    experience_level: str = Field(..., description="Experience level: entry, intermediate, senior, expert")
    current_role: Optional[str] = Field(None, description="Current job title")
    target_role: Optional[str] = Field(None, description="Target role for interview")
    industries: list[str] = Field(default_factory=list, description="Industries worked in")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "skills": ["Python", "Django", "PostgreSQL", "AWS", "Docker"],
                "experience_years": 5.5,
                "experience_level": "senior",
                "current_role": "Senior Backend Engineer",
                "target_role": "Staff Engineer",
                "industries": ["fintech", "e-commerce"]
            }
        }


class MatchingResponse(BaseModel):
    """Complete matching response with all results."""
    candidate_name: Optional[str]
    candidate_skills: list[str]
    candidate_experience_years: float
    candidate_level: str
    
    top_matches: list[InterviewerMatch]
    
    total_interviewers_evaluated: int
    recommendation: str = Field(..., description="Top recommendation summary")


class InterviewerListResponse(BaseModel):
    """Response model for listing interviewers."""
    interviewers: list[InterviewerProfile]
    total: int
    page: int = 1
    per_page: int = 10


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
