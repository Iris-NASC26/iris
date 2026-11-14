import asyncio

from schemas import AssistantChatRequest
from services import assistant_chat


def _request() -> AssistantChatRequest:
    return AssistantChatRequest(
        message="What can I do on this page?",
        page_context={
            "pathname": "/workspace/data-preview",
            "page_title": "Data Preview",
            "active_dataset_id": "temperature",
        },
    )


def test_assistant_returns_clear_fallback_without_gemini_key(monkeypatch):
    monkeypatch.setattr(assistant_chat, "get_gemini_api_key", lambda: "")

    response = asyncio.run(assistant_chat.process_assistant_chat(_request()))

    assert "Gemini API key" in response.assistant_reply


def test_assistant_returns_fallback_when_gemini_fails(monkeypatch):
    class FailedResponse:
        status_code = 503

    class MockClient:
        def __init__(self, timeout):
            assert timeout == 30.0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, json):
            assert ":generateContent?key=test-key" in url
            return FailedResponse()

    monkeypatch.setattr(assistant_chat, "get_gemini_api_key", lambda: "test-key")
    monkeypatch.setattr(assistant_chat.httpx, "AsyncClient", MockClient)

    response = asyncio.run(assistant_chat.process_assistant_chat(_request()))

    assert "temporarily unavailable" in response.assistant_reply
