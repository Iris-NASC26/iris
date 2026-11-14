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


def test_assistant_explains_unexpected_gemini_status(monkeypatch):
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

    assert "HTTP 503" in response.assistant_reply
    assert "backend logs" in response.assistant_reply


def test_assistant_explains_gemini_project_access_error(monkeypatch):
    class FailedResponse:
        status_code = 403

    class MockClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, json):
            return FailedResponse()

    monkeypatch.setattr(assistant_chat, "get_gemini_api_key", lambda: "test-key")
    monkeypatch.setattr(assistant_chat.httpx, "AsyncClient", MockClient)

    response = asyncio.run(assistant_chat.process_assistant_chat(_request()))

    assert "billing" in response.assistant_reply


def test_assistant_passes_processed_data_and_selection_to_gemini(monkeypatch):
    request_data = _request().model_dump()
    request_data["page_context"]["selected_products"] = [
        {
            "id": "NASA_POWER_T2M",
            "title": "Temperature at 2 Meters",
            "variable_id": "T2M",
            "variable_name": "Temperature at 2 Meters",
            "source_api": "NASA POWER",
            "unit": "C",
            "native_frequency": "Daily",
        }
    ]
    request_data["page_context"]["processed_data"] = {
        "result_id": "result-1",
        "product_name": "Temperature at 2 Meters",
        "total_rows": 24,
        "summary_stats": {
            "count": 24,
            "valid_count": 24,
            "flagged_count": 0,
            "missing_count": 0,
            "completeness_pct": 100,
            "missing_pct": 0,
            "mean": 27.5,
            "median": 27.4,
            "std_dev": 1.2,
            "min_val": 25.1,
            "min_date": "2023-01-01",
            "max_val": 29.8,
            "max_date": "2024-12-01",
            "decadal_slope": 0.3,
            "unit": "C",
        },
        "sampled_observations": [
            {
                "timestamp": "2024-12-01",
                "value": 28.1,
                "rolling_avg": 27.9,
                "anomaly_z": 0.6,
                "unit": "C",
                "qa_flag": "Valid",
            }
        ],
    }
    request = AssistantChatRequest.model_validate(request_data)

    class SuccessfulResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "candidates": [
                    {"content": {"parts": [{"text": "The mean is 27.5 C."}]}}
                ]
            }

    class MockClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, json):
            prompt = json["contents"][-1]["parts"][0]["text"]
            assert "NASA_POWER_T2M" in prompt
            assert "27.5" in prompt
            assert "2024-12-01" in prompt
            return SuccessfulResponse()

    monkeypatch.setattr(assistant_chat, "get_gemini_api_key", lambda: "test-key")
    monkeypatch.setattr(assistant_chat.httpx, "AsyncClient", MockClient)

    response = asyncio.run(assistant_chat.process_assistant_chat(request))

    assert response.assistant_reply == "The mean is 27.5 C."
