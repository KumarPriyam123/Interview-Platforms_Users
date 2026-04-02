from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class InterviewSessionCreate(BaseModel):
    email: EmailStr
    company: str
    role: str


class InterviewSessionResponse(BaseModel):
    session_id: str
    email: str
    company: str
    role: str
    created_at: datetime


class AnswerSubmission(BaseModel):
    answer: str


class QuestionResponse(BaseModel):
    question: str
    status: str


class FeedbackResponse(BaseModel):
    feedback: str
    score: int


class QuestionItemReport(BaseModel):
    question: str
    answer: str
    score: int
    feedback: str


class InterviewReport(BaseModel):
    overall_score: int
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    questions: List[QuestionItemReport]
