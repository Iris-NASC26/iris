import asyncio

from services import llm_router


def test_unqualified_message_does_not_extract_intent_or_call_gemini(monkeypatch):
    class UnexpectedClient:
        def __init__(self, *args, **kwargs):
            raise AssertionError("A greeting must not make an external request.")

    monkeypatch.setattr(llm_router.httpx, "AsyncClient", UnexpectedClient)

    intent, cache_hit = asyncio.run(llm_router.extract_scientific_intent("hi"))

    assert intent is None
    assert cache_hit is False


def test_llm_can_classify_a_science_question_as_not_a_dataset_search(monkeypatch):
    class MockResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {"text": '{"is_dataset_search_request": false}'}
                            ]
                        }
                    }
                ]
            }

    class MockClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, json, timeout):
            prompt = json["contents"][0]["parts"][0]["text"]
            assert "is_dataset_search_request" in prompt
            assert "general explanation" in prompt
            return MockResponse()

    async def resolved_default_region(prompt, client):
        return "Colombo", "regional", [79.8, 6.8, 80.0, 7.0], [6.9, 79.9]

    monkeypatch.setattr(llm_router, "get_gemini_api_key", lambda user_api_key=None: "test-key")
    monkeypatch.setattr(llm_router, "_resolve_live_region", resolved_default_region)
    monkeypatch.setattr(llm_router.httpx, "AsyncClient", MockClient)

    intent, cache_hit = asyncio.run(
        llm_router.extract_scientific_intent("Can climate patterns be understood?")
    )

    assert intent is None
    assert cache_hit is False
