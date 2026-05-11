import io
from pathlib import Path
from typing import Tuple
import pdfplumber
from docx import Document as DocxDocument
from app.core.config import settings


async def extract_text_from_file(file_bytes: bytes, filename: str) -> Tuple[str, int]:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _extract_pdf(file_bytes)
    elif ext == ".docx":
        return _extract_docx(file_bytes)
    else:
        raise Exception(f"Format non supporte: {ext}")


def _extract_pdf(file_bytes: bytes) -> Tuple[str, int]:
    pages_text = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text.strip())
    return "\n\n".join(pages_text), page_count


def _extract_docx(file_bytes: bytes) -> Tuple[str, int]:
    doc = DocxDocument(io.BytesIO(file_bytes))
    sections = []
    for para in doc.paragraphs:
        if para.text.strip():
            sections.append(para.text.strip())
    full_text = "\n\n".join(sections)
    page_count = max(1, len(full_text.split()) // 500)
    return full_text, page_count


def chunk_text(text: str) -> list:
    chunk_size = settings.CHUNK_SIZE
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) < chunk_size:
            current += para + "\n\n"
        else:
            if current:
                chunks.append(current.strip())
            current = para + "\n\n"
    if current.strip():
        chunks.append(current.strip())
    return chunks or [text[:chunk_size]]


def save_file(file_bytes: bytes, filename: str) -> str:
    import os
    upload_dir = Path(settings.STORAGE_PATH)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / filename
    dest.write_bytes(file_bytes)
    return str(dest)
