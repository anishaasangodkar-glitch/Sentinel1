from pydantic import BaseModel, Field

from .labels import MAX_TEXT_LENGTH


class PredictRequest(BaseModel):
    request_id: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=MAX_TEXT_LENGTH)


class PredictResponse(BaseModel):
    status_code: int
    message: str
    post: str
    confidence: dict[str, float]
    sentiment: list[str]
