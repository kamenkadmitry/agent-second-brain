import json
import logging
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from todoist_api_python.api_async import TodoistAPIAsync

from src.d_brain.database import MemoryTier, Note, Settings

logger = logging.getLogger(__name__)

# Basic system prompt
SYSTEM_PROMPT = """
You are an intelligent personal assistant and "second brain".
Your job is to parse incoming text or voice transcriptions and organize them.
You have access to tools to save notes to a database and create tasks in Todoist.
If you recognize a task, create it in Todoist.
If you recognize a note, idea, or information, save it to the database.
You must process the user's input and then output a brief summary in raw HTML.
Use only: <b>, <i>, <code>, <s>, <u>
Start directly with a relevant emoji and a <b>header</b>.
"""

class Agent:
    def __init__(self, db_session: AsyncSession, todoist_api_key: str = ""):
        self.db = db_session
        self.todoist = TodoistAPIAsync(todoist_api_key) if todoist_api_key else None

        # Tools definition for OpenAI function calling
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "create_todoist_task",
                    "description": "Create a task in Todoist",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "The task content",
                            },
                            "due_string": {
                                "type": "string",
                                "description": "Due date, e.g. 'tomorrow at 10am'",
                            },
                        },
                        "required": ["content"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "save_note",
                    "description": "Save a note to the database",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "A short, descriptive title",
                            },
                            "content": {
                                "type": "string",
                                "description": "The detailed content of the note",
                            },
                        },
                        "required": ["title", "content"],
                    },
                },
            },
        ]

    async def _get_base_url(self) -> str | None:
        """Get custom base URL from settings, if any."""
        result = await self.db.execute(
            select(Settings).where(Settings.key == "model_base_url")
        )
        setting = result.scalar_one_or_none()
        return setting.value if setting else None

    async def _get_api_key(self) -> str:
        """Get API key from settings, or return default."""
        result = await self.db.execute(
            select(Settings).where(Settings.key == "model_api_key")
        )
        setting = result.scalar_one_or_none()
        return setting.value if setting else "dummy-key-for-local-models"

    async def _get_model_name(self) -> str:
        """Get model name from settings, or return default."""
        result = await self.db.execute(
            select(Settings).where(Settings.key == "model_name")
        )
        setting = result.scalar_one_or_none()
        return setting.value if setting else "gpt-4o-mini"

    async def execute_tool(self, name: str, args: dict[str, Any]) -> str:
        """Execute a tool called by the LLM."""
        if name == "create_todoist_task":
            if not self.todoist:
                return "Error: Todoist API key not configured."
            try:
                task = await self.todoist.add_task(
                    content=args["content"], due_string=args.get("due_string")
                )
                return f"Successfully created task: {task.content} (ID: {task.id})"
            except Exception as e:
                logger.error(f"Todoist error: {e}")
                return f"Failed to create task: {e}"

        elif name == "save_note":
            try:
                note = Note(
                    title=args["title"],
                    content=args["content"],
                    memory_tier=MemoryTier.ACTIVE,
                )
                self.db.add(note)
                await self.db.commit()
                return f"Successfully saved note: '{args['title']}'"
            except Exception as e:
                logger.error(f"Database error: {e}")
                await self.db.rollback()
                return f"Failed to save note: {e}"

        return f"Unknown tool: {name}"

    async def process_prompt(self, prompt: str) -> dict[str, Any]:
        """Process a prompt using the LLM and return the HTML response."""
        base_url = await self._get_base_url()
        api_key = await self._get_api_key()
        model = await self._get_model_name()

        client = AsyncOpenAI(api_key=api_key, base_url=base_url)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore
                tools=self.tools,  # type: ignore
                tool_choice="auto",
            )

            message = response.choices[0].message
            tool_calls = message.tool_calls

            # If the model wants to call tools, execute them and send results back
            if tool_calls:
                messages.append(message)  # type: ignore

                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)

                    logger.info(f"Tool: {function_name} with {function_args}")
                    tool_result = await self.execute_tool(function_name, function_args)

                    messages.append(
                        {
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": tool_result,
                        }
                    )

                # Get the final response after tools
                second_response = await client.chat.completions.create(
                    model=model,
                    messages=messages,  # type: ignore
                )
                return {
                    "report": second_response.choices[0].message.content,
                    "processed_entries": 1,
                }

            # If no tools called, just return the content
            return {
                "report": message.content,
                "processed_entries": 1,
            }

        except Exception as e:
            logger.exception("LLM processing error")
            return {
                "error": f"Failed to process with LLM: {str(e)}",
                "processed_entries": 0,
            }
