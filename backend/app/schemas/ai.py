from pydantic import BaseModel, Field


class AITextRequest(BaseModel):
    text: str = Field(min_length=3, max_length=5000)


class AIFollowUpRequest(BaseModel):
    visit_note: str = Field(min_length=3, max_length=5000)


class AITextResponse(BaseModel):
    output: str
    source: str


class AIClassificationResponse(BaseModel):
    classification: str
    source: str
