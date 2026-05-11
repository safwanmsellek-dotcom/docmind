from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    original_name: str
    file_type: str
    file_size: int
    page_count: Optional[int] = None
    status: str
    created_at: datetime


class DocumentListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    original_name: str
    file_type: str
    status: str
    page_count: Optional[int] = None
    created_at: datetime
