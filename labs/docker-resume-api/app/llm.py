import os
from typing import Protocol


class LLMProvider(Protocol):
    name: str

    def extract(self, resume_text: str) -> dict: ...


class MockProvider:
    name = "mock"

    def extract(self, resume_text: str) -> dict:
        lower = resume_text.lower()
        skills = [s for s in ["python", "fastapi", "docker", "rag", "langchain"] if s in lower]
        if not skills:
            skills = ["python"]
        return {
            "name": "Alex Candidate",
            "skills": skills,
            "years_experience": 5.0,
            "summary": "Synthetic extraction from mock provider (no paid API key required).",
        }


class HostedProvider:
    """Optional hosted path. Requires OPENAI_API_KEY at runtime — never bake into the image."""

    name = "hosted"

    def extract(self, resume_text: str) -> dict:
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("OPENAI_API_KEY missing. Pass it with -e at runtime.")
        # Placeholder: real SDK call would go here.
        return MockProvider().extract(resume_text) | {"summary": "Hosted provider stub — wire your SDK here."}


def get_provider() -> MockProvider | HostedProvider:
    kind = os.getenv("LLM_PROVIDER", "mock").lower()
    if kind == "hosted":
        return HostedProvider()
    return MockProvider()
