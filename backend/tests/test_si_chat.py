import asyncio

import pytest

from schemas import ChatTurnRequest, ExtractedIntent
from services import si_chat


@pytest.mark.parametrize("message", ["hi", "what can you do?", "I need a dataset"])
def test_non_domain_message_asks_for_research_domain_without_keywords(monkeypatch, message):
    def unexpected_intent_extraction(*args, **kwargs):
        pytest.fail("A non-domain message must not trigger intent extraction.")

    monkeypatch.setattr(si_chat, "extract_scientific_intent", unexpected_intent_extraction)

    response = asyncio.run(
        si_chat.process_si_chat_turn(ChatTurnRequest(message=message))
    )

    assert response.next_stage == "topic_discovery"
    assert response.intent is None
    assert response.products == []
    assert response.llm_live_status == "awaiting_research_domain"
    assert "research domain or dataset topic" in response.assistant_reply


def test_research_domain_still_receives_keyword_suggestions(monkeypatch):
    intent = ExtractedIntent(
        subject_domain="Hydrometeorology & Precipitation Extremes",
        scientific_category="Water",
        keywords=["rainfall", "precipitation", "flood"],
        target_variables=["PRECTOTCORR"],
        inferred_region_name="Colombo",
        inferred_spatial_level="regional",
        inferred_bbox=[79.8, 6.8, 80.0, 7.0],
        inferred_Center=[6.9, 79.9],
        inferred_start_date="2015-01-01",
        inferred_end_date="2025-12-31",
        inferred_frequency="Monthly",
        target_apis=["NASA POWER"],
        interpretation_summary="Rainfall trend analysis.",
        llm_model_used="test-model",
    )

    async def extract_intent(*args, **kwargs):
        return intent, False

    async def no_gemini_reply(*args, **kwargs):
        return None, "http_403"

    monkeypatch.setattr(si_chat, "extract_scientific_intent", extract_intent)
    monkeypatch.setattr(si_chat, "_call_gemini_conversational", no_gemini_reply)

    response = asyncio.run(
        si_chat.process_si_chat_turn(
            ChatTurnRequest(message="I want to study rainfall in Colombo")
        )
    )

    assert response.next_stage == "keyword_confirmation"
    assert response.intent is intent
    assert response.intent.keywords == ["rainfall", "precipitation", "flood"]


def test_general_question_about_a_domain_does_not_propose_keywords():
    response = asyncio.run(
        si_chat.process_si_chat_turn(
            ChatTurnRequest(message="What is climate change?")
        )
    )

    assert response.next_stage == "topic_discovery"
    assert response.intent is None
    assert response.products == []
    assert "general science questions" in response.assistant_reply
