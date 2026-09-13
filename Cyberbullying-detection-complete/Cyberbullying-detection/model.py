from pydantic import BaseModel
from typing import Optional
from typing import TypedDict


class SentimentRequest(BaseModel):
    text: Optional[str]
    request_id: Optional[str]

    class Config:
        arbitrary_types_allowed = True
        schema_extra = {
            "example": {
                "text": "You are annoying.",
                "request_id": "1234-04x4-894"
            }
        }


class SentimentResponse(BaseModel):
    status_code: Optional[int]
    message: Optional[str]
    post: Optional[str]
    confidence: Optional[dict]
    sentiment: Optional[list]
