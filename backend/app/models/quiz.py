from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

QuestionType = Literal["mcq", "multi", "truefalse", "short", "essay"]


class QuestionInDB(BaseModel):
    id: str  # local id within the quiz (e.g. "q1")
    type: QuestionType
    prompt: str
    options: list[str] = []       # for mcq/multi/truefalse
    correctAnswers: list[int] = [] # indices; for truefalse [0]=True [1]=False
    expectedText: str = ""        # for short answer (case-insensitive match)
    points: int = Field(default=1, ge=1, le=100)
    explanation: str = ""


class QuizInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    courseId: PyObjectId
    sessionId: Optional[PyObjectId] = None
    title: str
    description: str = ""
    questions: list[QuestionInDB]
    timerSeconds: int = 0        # 0 = no time limit
    passMark: int = 50            # percent
    maxAttempts: int = 1
    published: bool = False
    createdBy: PyObjectId
    createdByName: str = ""
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class QuestionCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=20)
    type: QuestionType
    prompt: str = Field(..., min_length=1, max_length=2000)
    options: list[str] = []
    correctAnswers: list[int] = []
    expectedText: str = ""
    points: int = Field(default=1, ge=1, le=100)
    explanation: str = ""


class QuizCreate(BaseModel):
    courseId: str
    sessionId: Optional[str] = None
    title: str = Field(..., min_length=2, max_length=200)
    description: str = ""
    questions: list[QuestionCreate] = Field(..., min_length=1)
    timerSeconds: int = Field(default=0, ge=0, le=14400)
    passMark: int = Field(default=50, ge=0, le=100)
    maxAttempts: int = Field(default=1, ge=1, le=20)
    published: bool = False


class AnswerInDB(BaseModel):
    questionId: str
    selected: list[int] = []      # indices chosen
    text: str = ""                # for short/essay


class AttemptInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    quizId: PyObjectId
    courseId: PyObjectId
    studentId: PyObjectId
    studentName: str
    attemptNumber: int
    answers: list[AnswerInDB]
    autoScore: int = 0
    manualScore: Optional[int] = None
    maxScore: int
    percent: Optional[float] = None
    passed: Optional[bool] = None
    status: Literal["in_progress", "pending_manual", "graded"] = "in_progress"
    startedAt: datetime
    submittedAt: Optional[datetime] = None
    gradedBy: Optional[PyObjectId] = None
    gradedAt: Optional[datetime] = None

    model_config = {"populate_by_name": True}


class AttemptSubmit(BaseModel):
    answers: list[AnswerInDB]


class AttemptGrade(BaseModel):
    """Manual grading by staff for essay/short-answer questions."""
    manualScore: int = Field(..., ge=0)
    feedback: str = ""
