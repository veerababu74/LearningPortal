from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.llm import get_provider

app = FastAPI(title="Resume Extraction API", version="0.1.0")


class ExtractRequest(BaseModel):
    resume_text: str = Field(min_length=20)


class ExtractResponse(BaseModel):
    name: str
    skills: list[str]
    years_experience: float
    summary: str
    provider: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract", response_model=ExtractResponse)
def extract(body: ExtractRequest):
    provider = get_provider()
    result = provider.extract(body.resume_text)
    return ExtractResponse(**result, provider=provider.name)
