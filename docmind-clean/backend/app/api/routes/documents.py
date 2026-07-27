import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Document, DocumentStatus
from app.services.extraction import extract_text_from_file, chunk_text, save_file
from app.schemas.documents import DocumentResponse, DocumentListResponse

router = APIRouter()
MAX_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Format non supporte. Accepte: {settings.ALLOWED_EXTENSIONS}")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(413, "Fichier trop volumineux")

    safe_name = f"{uuid.uuid4()}{ext}"
    storage_path = save_file(file_bytes, safe_name)

    try:
        raw_text, page_count = await extract_text_from_file(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(422, f"Impossible d'extraire le texte: {str(e)}")

    doc = Document(
        id=str(uuid.uuid4()),
        filename=safe_name,
        original_name=file.filename,
        file_type=ext.lstrip("."),
        file_size=len(file_bytes),
        page_count=page_count,
        storage_path=storage_path,
        raw_text=raw_text,
        status=DocumentStatus.PROCESSING,
    )
    db.add(doc)
    await db.flush()
    doc_id = doc.id

    background_tasks.add_task(_analyze_background, doc_id, raw_text)
    return DocumentResponse.model_validate(doc)


@router.get("/", response_model=list[DocumentListResponse])
async def list_documents(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc()).offset(skip).limit(limit)
    )
    return [DocumentListResponse.model_validate(d) for d in result.scalars().all()]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")
    return DocumentResponse.model_validate(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")
    try:
        Path(doc.storage_path).unlink(missing_ok=True)
    except Exception:
        pass
    await db.delete(doc)


async def _analyze_background(doc_id: str, raw_text: str):
    from app.core.database import AsyncSessionLocal
    from app.models.models import DocumentAnalysis, DocumentChunk
    from app.services.ai_analysis import analyze_document

    async with AsyncSessionLocal() as db:
        try:
            doc = await db.get(Document, doc_id)
            if not doc:
                return

            print(f"[ANALYSE] Debut pour {doc_id}")
            analysis_data = await analyze_document(raw_text)
            print(f"[ANALYSE] Succes !")

            analysis = DocumentAnalysis(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                summary=analysis_data.get("summary"),
                key_points=analysis_data.get("key_points", []),
                entities=analysis_data.get("entities", {}),
                obligations=analysis_data.get("obligations", {}),
                risk_flags=analysis_data.get("risk_flags", []),
                metadata_extracted=analysis_data.get("metadata", {}),
                complexity_score=analysis_data.get("complexity_score"),
                fiche_synthese=analysis_data.get("fiche_synthese", {}),
            )
            db.add(analysis)

            chunks = chunk_text(raw_text)
            for i, chunk_content in enumerate(chunks):
                db.add(DocumentChunk(
                    id=str(uuid.uuid4()),
                    document_id=doc_id,
                    chunk_index=i,
                    content=chunk_content,
                ))

            doc.status = DocumentStatus.ANALYZED
            await db.commit()
            print(f"[ANALYSE] Document {doc_id} analyse avec succes !")

        except Exception as e:
            print(f"[ERREUR ANALYSE] {e}")
            import traceback
            traceback.print_exc()
            try:
                async with AsyncSessionLocal() as db2:
                    doc2 = await db2.get(Document, doc_id)
                    if doc2:
                        doc2.status = DocumentStatus.FAILED
                        await db2.commit()
            except Exception:
                pass
