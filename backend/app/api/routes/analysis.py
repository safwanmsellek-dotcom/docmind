from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Document, DocumentAnalysis, DocumentStatus, DocumentChunk
from app.services.ai_analysis import chat_with_document

router = APIRouter()


@router.get("/{doc_id}")
async def get_analysis(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")

    if doc.status == DocumentStatus.PROCESSING:
        return {"status": "processing", "message": "Analyse en cours..."}

    if doc.status == DocumentStatus.FAILED:
        return {"status": "failed", "message": "L'analyse a echoue"}

    result = await db.execute(
        select(DocumentAnalysis).where(DocumentAnalysis.document_id == doc_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        return {"status": "processing", "message": "Analyse en cours..."}

    return {
        "status": "analyzed",
        "document_id": doc_id,
        "filename": doc.original_name,
        "page_count": doc.page_count,
        "summary": analysis.summary,
        "key_points": analysis.key_points,
        "entities": analysis.entities,
        "obligations": analysis.obligations,
        "risk_flags": analysis.risk_flags,
        "metadata": analysis.metadata_extracted,
        "complexity_score": analysis.complexity_score,
        "fiche_synthese": analysis.fiche_synthese,
        "analyzed_at": analysis.created_at.isoformat() if analysis.created_at else None,
    }


@router.get("/{doc_id}/status")
async def get_status(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")
    return {"status": doc.status, "filename": doc.original_name}


class SearchRequest(BaseModel):
    query: str


@router.post("/search/semantic")
async def semantic_search(body: SearchRequest, db: AsyncSession = Depends(get_db)):
    """Recherche semantique sur tous les documents."""
    if not body.query.strip():
        raise HTTPException(400, "Query requise")

    # Recupere tous les chunks de tous les documents
    result = await db.execute(select(DocumentChunk))
    all_chunks = result.scalars().all()

    if not all_chunks:
        return {"query": body.query, "results": [], "message": "Aucun document indexe"}

    # Groupe les chunks par document
    from collections import defaultdict
    chunks_by_doc = defaultdict(list)
    for chunk in all_chunks:
        chunks_by_doc[chunk.document_id].append(chunk)

    # Pour chaque document, cherche les passages pertinents avec l'IA
    all_results = []
    for doc_id, chunks in list(chunks_by_doc.items())[:5]:  # Max 5 docs
        doc = await db.get(Document, doc_id)
        if not doc:
            continue

        # Prend les 10 premiers chunks du doc
        chunks_text = "\n\n---\n\n".join(
            [f"[Passage {i+1}]: {c.content}" for i, c in enumerate(chunks[:10])]
        )

        try:
            response = await chat_with_document(
                document_text=chunks_text,
                messages=[{
                    "role": "user",
                    "content": f"""Recherche dans le document les passages pertinents pour la requete: "{body.query}"

Reponds en JSON uniquement:
{{
  "passages": [
    {{"text": "passage pertinent exact", "relevance": "pourquoi c'est pertinent", "score": 0.9}},
    {{"text": "autre passage", "relevance": "raison", "score": 0.7}}
  ]
}}

Si aucun passage n'est pertinent, retourne {{"passages": []}}"""
                }]
            )

            import json, re
            raw = response.strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'^```\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            data = json.loads(raw)

            for p in data.get("passages", [])[:3]:
                if p.get("text"):
                    all_results.append({
                        "document_id": doc_id,
                        "document_name": doc.original_name,
                        "text": p["text"],
                        "relevance": p.get("relevance", ""),
                        "score": p.get("score", 0.5)
                    })
        except Exception as e:
            print(f"Search error for {doc_id}: {e}")
            continue

    # Trie par score
    all_results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "query": body.query,
        "results": all_results[:10],
        "total": len(all_results)
    }
