# Ledger AI

A Django + React (Vite) personal ledger app that supports expense tracking via manual entry, voice input, and receipt scanning (OCR), with optional local AI features powered by Ollama.

## Completed Features

- Authentication and user-scoped data
  - Register/login/logout (session-based)
  - All transactions, income sources, budgets, and assistant history are scoped per user

- Transactions
  - Add expenses manually
  - Add expenses from voice text with deterministic relative-date handling (e.g., “yesterday”, “today”)
  - Receipt scanning (OCR) flow for extracting bill text and mapping into transaction fields
  - Receipt image storage and a receipt gallery UI

- Analytics and dashboard
  - Category analytics
  - Correct handling of expense totals (no incorrect assumptions about negative values)
  - Budget/summary views (as implemented in the UI)

- Income sources
  - `IncomeSource` model and CRUD endpoints
  - Frontend UI integration for managing multiple income sources

- Local AI integration (Ollama)
  - Optional enrichment/refinement of extracted receipt + voice data via a local Ollama server
  - JSON-only prompting for predictable parsing
  - Debug fields to confirm when Ollama was used

- AI Insights + Assistant
  - Dashboard “AI insights” endpoint backed by Ollama (`/api/ai/forecast-insights/`)
  - “Ask AI Assistant” chat UI
  - Persistent assistant conversation/message history stored in the DB and preserved across logout/login

- Repo hygiene
  - Secrets are not committed (uses `.env.example`)
  - Generated artifacts (e.g., `db.sqlite3`, `__pycache__`) are ignored

## Tech Stack

- Backend: Django + Django REST Framework
- Frontend: React + Vite + TypeScript
- OCR: pytesseract + Pillow preprocessing
- Optional local LLM: Ollama (default model used during development: `llama3.1:8b`)

## Quick Start (Backend)

1. Create/activate venv and install dependencies:
   - `pip install -r requirements.txt`
2. Create `.env` based on `.env.example`.
3. Run migrations:
   - `python manage.py migrate`
4. Start backend:
   - `python manage.py runserver`

## Quick Start (Frontend)

From `ledger-ai-frontend/`:

- Install deps: `npm install`
- Start dev server: `npm run dev`

## Ollama Setup (Optional)

1. Install Ollama and start it.
2. Pull a model (example):
   - `ollama pull llama3.1:8b`
3. Enable in `.env`:

Key env vars used by the backend:

- `LEDGER_AI_USE_OLLAMA` = `1` to enable Ollama
- `LEDGER_AI_OLLAMA_URL` (default: `http://localhost:11434`)
- `LEDGER_AI_OLLAMA_MODEL` (example: `llama3.1:8b`)
- `LEDGER_AI_OLLAMA_TIMEOUT` (seconds)
- `LEDGER_AI_OLLAMA_DEBUG` = `1` to include debug fields in responses
- `LEDGER_AI_OLLAMA_ENRICH_ALWAYS` = `1` to force enrichment even when deterministic parse succeeds

## Main API Endpoints (Highlights)

- AI Insights: `GET /api/ai/forecast-insights/`
- Assistant:
  - `GET /api/ai/assistant/history/`
  - `POST /api/ai/assistant/send/`

## Notes

- If you deploy to production, configure allowed hosts, CORS/CSRF, and replace SQLite with a production database.
