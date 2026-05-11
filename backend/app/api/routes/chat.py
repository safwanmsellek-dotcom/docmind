import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.models import Document, DocumentStatus, ChatSession, ChatMessage
from app.services.ai_analysis import chat_with_document

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


@router.post("/{doc_id}/message")
async def send_message(doc_id: str, body: ChatRequest, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")

    if body.session_id:
        session = await db.get(ChatSession, body.session_id)
        if not session:
            session = ChatSession(id=str(uuid.uuid4()), document_id=doc_id)
            db.add(session)
            await db.flush()
    else:
        session = ChatSession(id=str(uuid.uuid4()), document_id=doc_id)
        db.add(session)
        await db.flush()

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    history = [{"role": m.role, "content": m.content} for m in result.scalars().all()]
    history.append({"role": "user", "content": body.message})

    response_text = await chat_with_document(
        document_text=doc.raw_text or "",
        messages=history,
    )

    db.add(ChatMessage(id=str(uuid.uuid4()), session_id=session.id, role="user", content=body.message))
    db.add(ChatMessage(id=str(uuid.uuid4()), session_id=session.id, role="assistant", content=response_text))
    await db.commit()

    return {"session_id": session.id, "message": response_text}
