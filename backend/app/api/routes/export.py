from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Document, DocumentAnalysis

router = APIRouter()


@router.get("/{doc_id}/pdf")
async def export_pdf_summary(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")

    result = await db.execute(
        select(DocumentAnalysis).where(DocumentAnalysis.document_id == doc_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Analyse non disponible")

    try:
        from weasyprint import HTML as WP_HTML
        html = _build_html(doc, analysis)
        pdf_bytes = WP_HTML(string=html).write_pdf()
        safe_name = doc.original_name.rsplit(".", 1)[0]
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_analyse.pdf"'},
        )
    except ImportError:
        raise HTTPException(500, "WeasyPrint non installe")


def _build_html(doc, analysis) -> str:
    meta = analysis.metadata_extracted or {}
    kp_html = "".join(f"<li>{kp}</li>" for kp in (analysis.key_points or []))
    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>body{{font-family:Arial,sans-serif;color:#1a1a2e;padding:40px}}
h1{{font-size:24px;margin-bottom:8px}}
h2{{font-size:13px;font-weight:600;color:#7C6BF5;letter-spacing:1px;text-transform:uppercase;margin-top:24px}}
p{{font-size:14px;line-height:1.8;color:#374151}}
ul{{font-size:14px;color:#374151}}
</style></head><body>
<h1>{meta.get('title', doc.original_name)}</h1>
<p style="color:#6B7280;font-size:12px">{doc.original_name} · {doc.page_count or '?'} pages</p>
<h2>Resume executif</h2><p>{analysis.summary or ''}</p>
<h2>Points cles</h2><ul>{kp_html}</ul>
<p style="margin-top:40px;font-size:11px;color:#9CA3AF">Genere par DocMind AI</p>
</body></html>"""
