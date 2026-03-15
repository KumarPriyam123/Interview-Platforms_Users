"""
API Gateway - Resume Routes
Endpoints for resume upload and parsing.
"""

import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, status
import httpx
import aiofiles


from models.api_models import ResumeUploadResponse, ParsedResumeData, ErrorResponse
from api.config import get_settings

router = APIRouter(prefix="/upload-resume", tags=["Resume"])
settings = get_settings()

# In-memory storage for parsed resumes (in production, use a database)
parsed_resumes_store: dict[str, dict] = {}


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file extension and content type."""
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


@router.post(
    "",
    response_model=ResumeUploadResponse,
    summary="Upload and parse a resume",
    description="Upload a PDF or DOCX resume file to parse and extract structured data.",
    responses={
        200: {"description": "Resume parsed successfully"},
        400: {"description": "Invalid file format or parsing error"},
        413: {"description": "File too large"},
        503: {"description": "Resume parser service unavailable"},
    }
)
async def upload_resume(
    file: UploadFile = File(..., description="Resume file (PDF or DOCX, max 10MB)")
):
    """
    Upload and parse a resume file.
    
    - **file**: Resume file in PDF or DOCX format
    
    Returns:
    - Parsed resume data with candidate information
    - Unique file ID for reference
    """
    # Validate file
    validate_file(file)
    
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
    
    # Generate unique file ID
    file_id = f"resume_{uuid.uuid4().hex[:8]}{os.path.splitext(file.filename)[1]}"
    
    # Save file to uploads directory
    file_path = os.path.join(settings.UPLOAD_DIR, file_id)
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Call resume parser service
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"file": (file.filename, content, file.content_type)}
            response = await client.post(
                f"{settings.RESUME_PARSER_URL}/parse",
                files=files
            )
            
            if response.status_code != 200:
                return ResumeUploadResponse(
                    success=False,
                    message="Failed to parse resume",
                    error=f"Parser returned status {response.status_code}",
                    file_id=file_id
                )
            
            parser_result = response.json()
            
            if not parser_result.get("success"):
                return ResumeUploadResponse(
                    success=False,
                    message="Resume parsing failed",
                    error=parser_result.get("error", "Unknown error"),
                    file_id=file_id
                )
            
            # Extract parsed data
            parsed_data = parser_result.get("data", {})
            
            # Store for later retrieval
            parsed_resumes_store[file_id] = {
                "parsed_data": parsed_data,
                "uploaded_at": datetime.utcnow().isoformat(),
                "original_filename": file.filename
            }
            
            return ResumeUploadResponse(
                success=True,
                message="Resume parsed successfully",
                data=ParsedResumeData(**parsed_data) if parsed_data else None,
                file_id=file_id
            )
            
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resume parser service is unavailable. Please try again later."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Resume parser service timed out. Please try again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with resume parser: {str(e)}"
        )


@router.get(
    "/{file_id}",
    response_model=ResumeUploadResponse,
    summary="Get parsed resume by file ID",
    description="Retrieve previously parsed resume data by file ID.",
)
async def get_parsed_resume(file_id: str):
    """
    Get previously parsed resume data.
    
    - **file_id**: The file ID returned from upload-resume endpoint
    """
    if file_id not in parsed_resumes_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume with ID '{file_id}' not found"
        )
    
    stored = parsed_resumes_store[file_id]
    return ResumeUploadResponse(
        success=True,
        message="Resume retrieved successfully",
        data=ParsedResumeData(**stored["parsed_data"]),
        file_id=file_id
    )
