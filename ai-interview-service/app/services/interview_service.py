import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import InterviewSession, InterviewQuestion, InterviewReport


class InterviewService:
    """Service for managing interview sessions"""

    @staticmethod
    async def create_session(db: AsyncSession, email: str, company: str, role: str,
                             resume_text: str, resume_data: dict) -> InterviewSession:
        """Create a new interview session"""
        session_id = str(uuid.uuid4())

        session = InterviewSession(
            id=session_id,
            email=email,
            company=company,
            role=role,
            resume_text=resume_text,
            resume_skills=resume_data.get("technical_skills", []),
            resume_experience=resume_data.get("experience_summary", ""),
            status="active"
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_session(db: AsyncSession, session_id: str) -> Optional[InterviewSession]:
        """Retrieve an interview session"""
        result = await db.execute(
            select(InterviewSession).filter(InterviewSession.id == session_id)
        )
        return result.scalars().first()

    @staticmethod
    async def add_question(db: AsyncSession, session_id: str, question_number: int,
                           question_text: str) -> InterviewQuestion:
        """Add a question to the interview"""
        question_id = str(uuid.uuid4())

        question = InterviewQuestion(
            id=question_id,
            session_id=session_id,
            question_number=question_number,
            question_text=question_text
        )
        db.add(question)
        await db.commit()
        await db.refresh(question)
        return question

    @staticmethod
    async def submit_answer(db: AsyncSession, session_id: str, question_number: int,
                            answer: str, feedback: str, score: int):
        """Store answer and evaluation for a question"""
        result = await db.execute(
            select(InterviewQuestion).filter(
                InterviewQuestion.session_id == session_id,
                InterviewQuestion.question_number == question_number
            )
        )
        question = result.scalars().first()

        if question:
            question.user_answer = answer
            question.feedback = feedback
            question.score = score
            await db.commit()
            await db.refresh(question)

        return question

    @staticmethod
    async def get_current_question_index(db: AsyncSession, session_id: str) -> int:
        """Get the current question index for a session"""
        session = await InterviewService.get_session(db, session_id)
        if session:
            return session.current_question_index
        return 0

    @staticmethod
    async def update_question_index(db: AsyncSession, session_id: str, index: int):
        """Update the current question index"""
        session = await InterviewService.get_session(db, session_id)
        if session:
            session.current_question_index = index
            await db.commit()

    @staticmethod
    async def get_all_questions(db: AsyncSession, session_id: str) -> List[InterviewQuestion]:
        """Get all questions for a session"""
        result = await db.execute(
            select(InterviewQuestion).filter(
                InterviewQuestion.session_id == session_id
            ).order_by(InterviewQuestion.question_number)
        )
        return result.scalars().all()

    @staticmethod
    async def create_report(db: AsyncSession, session_id: str, overall_score: int,
                            summary: str, strengths: list, weaknesses: list,
                            recommendations: list) -> InterviewReport:
        """Create an interview report"""
        report_id = str(uuid.uuid4())

        report = InterviewReport(
            id=report_id,
            session_id=session_id,
            overall_score=overall_score,
            summary=summary,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations
        )
        db.add(report)

        session = await InterviewService.get_session(db, session_id)
        if session:
            session.status = "completed"
            session.completed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(report)
        return report

    @staticmethod
    async def get_report(db: AsyncSession, session_id: str) -> Optional[InterviewReport]:
        """Retrieve an interview report"""
        result = await db.execute(
            select(InterviewReport).filter(InterviewReport.session_id == session_id)
        )
        return result.scalars().first()
