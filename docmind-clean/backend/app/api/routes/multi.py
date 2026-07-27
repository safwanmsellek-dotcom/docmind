import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List

from app.core.database import get_db
from app.models.models import Document, DocumentAnalysis
from app.services.ai_analysis import chat_with_document

router = APIRouter()


class MultiRequest(BaseModel):
    document_ids: List[str]
    question: str
    mode: str = "compare"  # compare | summarize | contradictions | differences


@router.post("/analyze")
async def multi_analyze(body: MultiRequest, db: AsyncSession = Depends(get_db)):
    if len(body.document_ids) < 2:
        raise HTTPException(400, "Minimum 2 documents requis")
    if len(body.document_ids) > 5:
        raise HTTPException(400, "Maximum 5 documents")

    # Recupere les docs et leurs analyses
    docs_data = []
    for doc_id in body.document_ids:
        doc = await db.get(Document, doc_id)
        if not doc:
            continue
        result = await db.execute(
            select(DocumentAnalysis).where(DocumentAnalysis.document_id == doc_id)
        )
        analysis = result.scalar_one_or_none()
        docs_data.append({
            "id": doc_id,
            "name": doc.original_name,
            "text": doc.raw_text[:8000] if doc.raw_text else "",
            "summary": analysis.summary if analysis else "",
            "key_points": analysis.key_points if analysis else [],
        })

    if len(docs_data) < 2:
        raise HTTPException(400, "Documents non trouves ou non analyses")

    # Construit le contexte multi-documents
    context = ""
    for i, d in enumerate(docs_data):
        context += f"\n\n=== DOCUMENT {i+1}: {d['name']} ===\n"
        context += f"Résumé: {d['summary']}\n"
        context += f"Points clés: {', '.join(d['key_points'][:3]) if d['key_points'] else 'N/A'}\n"
        context += f"Contenu:\n{d['text'][:4000]}\n"

    mode_instructions = {
        "compare": "Compare ces documents en détail. Identifie les similitudes et différences clés.",
        "summarize": "Fais une synthèse globale de tous ces documents ensemble.",
        "contradictions": "Identifie toutes les contradictions, incohérences ou conflits entre ces documents.",
        "differences": "Liste précisément toutes les différences entre ces documents.",
    }

    instruction = mode_instructions.get(body.mode, mode_instructions["compare"])

    response = await chat_with_document(
        document_text=context,
        messages=[{
            "role": "user",
            "content": f"{instruction}\n\nQuestion spécifique: {body.question}\n\nRéponds de façon structurée avec des sections claires."
        }]
    )

    return {
        "question": body.question,
        "mode": body.mode,
        "documents": [{"id": d["id"], "name": d["name"]} for d in docs_data],
        "response": response
    }


@router.get("/documents")
async def get_analyzed_documents(db: AsyncSession = Depends(get_db)):
    """Retourne tous les documents analysés disponibles pour le multi-doc."""
    from app.models.models import DocumentStatus
    result = await db.execute(
        select(Document).where(Document.status == DocumentStatus.ANALYZED)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [{"id": d.id, "name": d.original_name, "file_type": d.file_type, "page_count": d.page_count} for d in docs]
