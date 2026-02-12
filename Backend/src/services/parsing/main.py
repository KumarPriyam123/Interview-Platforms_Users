"""
Resume Parser Microservice
FastAPI application for parsing resumes from PDF and DOCX files.
"""

import os
import sys

# Add backend/src to path so we can import models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from models.parser_models import ParsedResume, ParseResumeResponse, ParseResumeRequest
from services.parsing.parser import parse_resume, extract_text

# App configuration
app = FastAPI(
    title="Resume Parser Service",
    description="Microservice for parsing resumes from PDF and DOCX files",
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

# Constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.docx'}
ALLOWED_CONTENT_TYPES = {
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}


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
        service="resume-parser",
        version="1.0.0"
    )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="resume-parser",
        version="1.0.0"
    )


@app.post(
    "/parse",
    response_model=ParseResumeResponse,
    tags=["Parser"],
    summary="Parse a resume file",
    description="Upload a PDF or DOCX resume file to extract structured information including skills, experience, and education.",
    responses={
        200: {
            "description": "Successfully parsed resume",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "data": {
                            "name": "John Doe",
                            "email": "john@example.com",
                            "skills": ["Python", "Django", "AWS"],
                            "total_experience_years": 5.5,
                            "experience_level": "senior"
                        },
                        "error": None
                    }
                }
            }
        },
        400: {"description": "Invalid file format or parsing error"},
        413: {"description": "File too large"},
    }
)
async def parse_resume_file(
    file: UploadFile = File(..., description="Resume file (PDF or DOCX)")
):
    """
    Parse an uploaded resume file and extract structured data.
    
    - **file**: Resume file in PDF or DOCX format (max 10MB)
    
    Returns parsed resume data including:
    - Personal information (name, email, phone)
    - Skills extracted from the resume
    - Total experience in years
    - Work experience history
    - Education history
    """
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ''
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate content type
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content type. Please upload a PDF or DOCX file."
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}"
        )
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Parse the resume
    try:
        parsed_data = parse_resume(content, file.filename)
        return ParseResumeResponse(
            success=True,
            data=parsed_data,
            error=None
        )
    except ValueError as e:
        return ParseResumeResponse(
            success=False,
            data=None,
            error=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error while parsing resume: {str(e)}"
        )


@app.post(
    "/parse-text",
    response_model=ParseResumeResponse,
    tags=["Parser"],
    summary="Parse resume from raw text",
    description="Parse resume data from raw text input instead of a file.",
)
async def parse_resume_text(request: ParseResumeRequest):
    """
    Parse resume data from raw text.
    
    - **text**: Raw resume text content
    
    Returns parsed resume data with extracted information.
    """
    if not request.text or len(request.text.strip()) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text content too short. Please provide valid resume content."
        )
    
    try:
        # Create a pseudo-file to use the parser
        from services.parsing.parser import (
            extract_name, extract_email, extract_phone,
            extract_linkedin, extract_github, extract_skills,
            extract_experience_years, determine_experience_level,
            extract_work_experiences, extract_education
        )
        
        text = request.text
        experience_years = extract_experience_years(text)
        
        parsed_data = ParsedResume(
            name=extract_name(text),
            email=extract_email(text),
            phone=extract_phone(text),
            linkedin=extract_linkedin(text),
            github=extract_github(text),
            skills=extract_skills(text),
            total_experience_years=experience_years,
            experience_level=determine_experience_level(experience_years),
            work_experiences=extract_work_experiences(text),
            education=extract_education(text),
            raw_text=text[:5000],
            file_name=None,
            parse_confidence=0.7,
        )
        
        return ParseResumeResponse(
            success=True,
            data=parsed_data,
            error=None
        )
    except Exception as e:
        return ParseResumeResponse(
            success=False,
            data=None,
            error=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
