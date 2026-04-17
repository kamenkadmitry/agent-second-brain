import logging
from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.d_brain.database import Note, Settings, get_async_session_maker, get_db_path

logger = logging.getLogger(__name__)

app = FastAPI(title="Agent Second Brain Web UI")

# Setup templates
templates_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(templates_dir))

# Database session dependency
async def get_db_session() -> AsyncSession:
    db_path = get_db_path()
    maker = get_async_session_maker(db_path)
    async with maker() as session:
        yield session

@app.get("/", response_class=HTMLResponse)
async def read_vault(request: Request):
    """View all notes in the vault."""
    db_path = get_db_path()
    maker = get_async_session_maker(db_path)
    async with maker() as session:
        result = await session.execute(
            select(Note).order_by(Note.updated_at.desc())
        )
        notes = result.scalars().all()

    return templates.TemplateResponse(
        "index.html", {"request": request, "notes": notes}
    )

@app.get("/settings", response_class=HTMLResponse)
async def view_settings(request: Request):
    """View application settings."""
    db_path = get_db_path()
    maker = get_async_session_maker(db_path)
    async with maker() as session:
        result = await session.execute(select(Settings))
        settings_rows = result.scalars().all()
        settings_dict = {row.key: row.value for row in settings_rows}

    return templates.TemplateResponse(
        "settings.html", {"request": request, "settings": settings_dict}
    )

@app.post("/settings", response_class=RedirectResponse)
async def update_settings(
    request: Request,
    model_base_url: str = Form(""),
    model_api_key: str = Form(""),
    model_name: str = Form("gpt-4o-mini"),
):
    """Update application settings."""
    db_path = get_db_path()
    maker = get_async_session_maker(db_path)

    updates = {
        "model_base_url": model_base_url,
        "model_api_key": model_api_key,
        "model_name": model_name,
    }

    async with maker() as session:
        for key, value in updates.items():
            result = await session.execute(select(Settings).where(Settings.key == key))
            setting = result.scalar_one_or_none()
            if setting:
                setting.value = value
            else:
                session.add(Settings(key=key, value=value))

        await session.commit()

    # Redirect back to settings page
    return RedirectResponse(url="/settings", status_code=303)
