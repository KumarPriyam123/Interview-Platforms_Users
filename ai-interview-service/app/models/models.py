from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, DateTime, Integer, Text, JSON, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, index=True)
    company = Column(String)
    role = Column(String)
    resume_text = Column(Text)
    resume_skills = Column(JSON, default={})
    resume_experience = Column(JSON, default={})
    interview_plan = Column(JSON, default={})
    status = Column(String, default="active")  # active, completed
    current_question_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    questions = relationship("InterviewQuestion", back_populates="session")
    report = relationship("InterviewReport", back_populates="session", uselist=False)


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("interview_sessions.id"), index=True)
    question_number = Column(Integer)
    question_text = Column(Text)
    user_answer = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="questions")


class InterviewReport(Base):
    __tablename__ = "interview_reports"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("interview_sessions.id"), index=True)
    overall_score = Column(Integer)
    summary = Column(Text)
    strengths = Column(JSON, default=[])
    weaknesses = Column(JSON, default=[])
    recommendations = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="report")
