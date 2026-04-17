"""Service for processing text using the custom Agent."""

import logging
from datetime import date
from typing import Any

from src.d_brain.config import get_settings
from src.d_brain.database import get_async_session_maker, get_db_path
from src.d_brain.services.agent import Agent

logger = logging.getLogger(__name__)

class ProcessorService:
    """Service that coordinates data processing with the Agent."""

    def __init__(self) -> None:
        """Initialize processor service."""
        self.settings = get_settings()

    async def execute_prompt(
        self, user_prompt: str, user_id: int = 0
    ) -> dict[str, Any]:
        """Execute prompt with Agent.

        Args:
            user_prompt: User's natural language request
            user_id: Telegram user ID for session context

        Returns:
            Execution report as dict
        """
        db_path = get_db_path()
        maker = get_async_session_maker(db_path)

        try:
            async with maker() as session:
                agent = Agent(session, todoist_api_key=self.settings.todoist_api_key)

                # Combine prompt with some context
                today = date.today()
                full_prompt = (
                    f"Date: {today}\n"
                    f"User Request: {user_prompt}\n"
                    "Please analyze the request, save notes or create tasks as needed, "
                    "and return a raw HTML summary."
                )

                result = await agent.process_prompt(full_prompt)
                return result

        except Exception as e:
            logger.exception("Unexpected error during execution")
            return {"error": str(e), "processed_entries": 0}

    async def process_daily(self, day: date | None = None) -> dict[str, Any]:
        """Process daily summary. (Mocked for new architecture)"""
        if day is None:
            day = date.today()

        return {
            "report": (
                f"📊 <b>Daily Processing for {day}</b>\n"
                "Processing daily notes is now handled natively."
            ),
            "processed_entries": 1,
        }

    async def generate_weekly(self) -> dict[str, Any]:
        """Generate weekly digest. (Mocked for new architecture)"""
        today = date.today()

        return {
            "report": (
                f"📅 <b>Weekly Digest for {today}</b>\n"
                "Weekly digest generation is now handled natively."
            ),
            "processed_entries": 1,
        }
