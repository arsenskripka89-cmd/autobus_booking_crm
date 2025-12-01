from pathlib import Path
import json
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

BASE_DIR = Path(__file__).parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(exist_ok=True)

CONFIG_PATH = BASE_DIR / "config.json"
PRODUCTS_PATH = STORAGE_DIR / "products.json"
MATCH_PATH = STORAGE_DIR / "match.json"
COMPETITOR_PATH = STORAGE_DIR / "competitor.json"

app = FastAPI()
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "frontend")), name="static")


class MatchItem(BaseModel):
    product: str
    code: str
    link: str
    confidence: float


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return default


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_config() -> Dict[str, Any]:
    return load_json(CONFIG_PATH, {})


def load_products() -> List[Dict[str, Any]]:
    return load_json(PRODUCTS_PATH, [])


def load_match() -> List[Dict[str, Any]]:
    return load_json(MATCH_PATH, [])


def load_competitor_root() -> str:
    data = load_json(COMPETITOR_PATH, {})
    return data.get("root_url", "Не вказано")


def normalize_product(record: Dict[str, Any]) -> Dict[str, str]:
    def first_available(keys: List[str], fallback: str) -> str:
        for key in keys:
            value = record.get(key)
            if value:
                return str(value)
        if record:
            return str(next(iter(record.values())))
        return fallback

    name = first_available(["name", "product", "title", "Наименование"], "Невідомий товар")
    code = first_available(["code", "код", "sku", "article"], "")
    return {"product": name, "code": code}


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "current_tab": "dashboard",
        },
    )


@app.get("/upload", response_class=HTMLResponse)
async def upload_page(request: Request):
    return templates.TemplateResponse(
        "upload.html",
        {
            "request": request,
            "current_tab": "upload",
        },
    )


@app.post("/upload")
async def upload_products(file: UploadFile = File(...)):
    df = pd.read_excel(file.file, dtype=str)
    df = df.fillna("")
    records = df.to_dict(orient="records")
    save_json(PRODUCTS_PATH, records)
    return RedirectResponse(url="/upload?success=1", status_code=303)


@app.get("/competitor", response_class=HTMLResponse)
async def competitor_page(request: Request):
    root_url = load_competitor_root()
    return templates.TemplateResponse(
        "competitor.html",
        {
            "request": request,
            "root_url": root_url,
            "current_tab": "competitor",
        },
    )


@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request, saved: Optional[int] = None):
    config = load_config()
    return templates.TemplateResponse(
        "settings.html",
        {
            "request": request,
            "api_key": config.get("openai_api_key", ""),
            "saved": bool(saved),
            "current_tab": "settings",
        },
    )


@app.post("/settings")
async def save_settings(api_key: str = Form("")):
    save_json(CONFIG_PATH, {"openai_api_key": api_key.strip()})
    return RedirectResponse(url="/settings?saved=1", status_code=303)


@app.get("/test-parser", response_class=HTMLResponse)
async def test_parser_page(request: Request):
    matches = load_match()
    root_url = load_competitor_root()
    return templates.TemplateResponse(
        "test_parser.html",
        {
            "request": request,
            "root_url": root_url,
            "matches": matches,
            "current_tab": "test_parser",
        },
    )


@app.post("/match")
async def run_match():
    config = load_config()
    api_key = config.get("openai_api_key")
    if not api_key:
        return JSONResponse({"error": "OpenAI API key не встановлено"}, status_code=400)

    products = load_products()
    root_url = load_competitor_root()
    generated_matches: List[Dict[str, Any]] = []

    for record in products:
        info = normalize_product(record)
        link = f"{root_url.rstrip('/')}/search?q={info['code']}" if info["code"] else root_url
        generated_matches.append(
            {
                "product": info["product"],
                "code": info["code"],
                "link": link,
                "confidence": 0.42,
            }
        )

    save_json(MATCH_PATH, generated_matches)
    return {"matches": generated_matches}


@app.post("/save-match")
async def save_match_data(matches: List[MatchItem]):
    data = [match.dict() for match in matches]
    save_json(MATCH_PATH, data)
    return {"status": "ok"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}

