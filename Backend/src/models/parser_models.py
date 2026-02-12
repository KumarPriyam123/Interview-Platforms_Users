"""
Resume Parser - Pydantic Models
Data models for parsed resume information.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class WorkExperience(BaseModel):
    """Model representing a single work experience entry."""
    company: str = Field(..., description="Company name")
    title: str = Field(..., description="Job title")
    start_date: Optional[str] = Field(None, description="Start date")
    end_date: Optional[str] = Field(None, description="End date or 'Present'")
    duration_months: Optional[int] = Field(None, description="Duration in months")
    description: Optional[str] = Field(None, description="Job description")
    location: Optional[str] = Field(None, description="Job location")


class Education(BaseModel):
    """Model representing education entry."""
    institution: str = Field(..., description="School/University name")
    degree: Optional[str] = Field(None, description="Degree type (BS, MS, PhD)")
    field_of_study: Optional[str] = Field(None, description="Major/Field of study")
    graduation_year: Optional[int] = Field(None, description="Year of graduation")
    gpa: Optional[float] = Field(None, description="GPA if available")


class ParsedResume(BaseModel):
    """Model representing fully parsed resume data."""
    # Personal Information
    name: Optional[str] = Field(None, description="Candidate's full name")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    location: Optional[str] = Field(None, description="City/State/Country")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    github: Optional[str] = Field(None, description="GitHub profile URL")
    portfolio: Optional[str] = Field(None, description="Portfolio website URL")
    
    # Professional Summary
    summary: Optional[str] = Field(None, description="Professional summary/objective")
    
    # Skills
    skills: list[str] = Field(default_factory=list, description="List of technical and soft skills")
    
    # Experience
    total_experience_years: float = Field(0.0, description="Total years of experience")
    experience_level: str = Field("entry", description="Experience level: entry, intermediate, senior, expert")
    work_experiences: list[WorkExperience] = Field(default_factory=list, description="List of work experiences")
    
    # Education
    education: list[Education] = Field(default_factory=list, description="Education history")
    
    # Certifications
    certifications: list[str] = Field(default_factory=list, description="Professional certifications")
    
    # Additional
    languages: list[str] = Field(default_factory=list, description="Languages spoken")
    
    # Metadata
    raw_text: Optional[str] = Field(None, description="Raw text extracted from resume")
    file_name: Optional[str] = Field(None, description="Original file name")
    parse_confidence: float = Field(0.0, description="Confidence score of parsing (0-1)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john.doe@email.com",
                "phone": "+1-555-123-4567",
                "location": "San Francisco, CA",
                "skills": ["Python", "Django", "PostgreSQL", "AWS", "Docker"],
                "total_experience_years": 5.5,
                "experience_level": "senior",
                "work_experiences": [
                    {
                        "company": "Tech Corp",
                        "title": "Senior Software Engineer",
                        "start_date": "2020-01",
                        "end_date": "Present",
                        "duration_months": 48
                    }
                ],
                "education": [
                    {
                        "institution": "MIT",
                        "degree": "BS",
                        "field_of_study": "Computer Science",
                        "graduation_year": 2018
                    }
                ]
            }
        }


class ParseResumeRequest(BaseModel):
    """Request model for parsing resume from text."""
    text: str = Field(..., description="Raw resume text to parse")


class ParseResumeResponse(BaseModel):
    """Response model for parsed resume."""
    success: bool = Field(..., description="Whether parsing was successful")
    data: Optional[ParsedResume] = Field(None, description="Parsed resume data")
    error: Optional[str] = Field(None, description="Error message if parsing failed")
