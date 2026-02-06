# Ledger AI

A Django + React (Vite) personal finance app with expense tracking via manual entry, voice input, and receipt scanning (OCR), AI-powered budgeting, financial forecasting, and email reminders — all with optional local AI via Ollama.

## Completed Features

### Authentication & User Management
- Register / login / logout (session-based with CSRF protection)
- All data (transactions, budgets, reminders, conversations) scoped per user
- Profile page

### Transactions
- Add expenses manually with category selection
- Voice input with deterministic relative-date parsing ("yesterday", "last Friday", etc.)
- Receipt scanning (OCR) — extracts text, maps into transaction fields
- Receipt image storage (local or Cloudinary) and receipt gallery UI
- CSV export and import
- Bulk categorization

### Dashboard & Analytics
- Monthly spending overview with total expenses, income, and balance
- Spending trend chart (area chart for current month)
- Expenses by category (pie chart)
- Category analytics page with detailed breakdowns

### Income Sources
- CRUD for multiple income sources with monthly amounts
- Active/inactive toggle
- Used in budget and forecast analysis

### Budgets
- Monthly budget limits per category with CRUD
- Month-by-month navigation
- Progress bars showing spent vs. limit with over-budget warnings
- Summary cards for total budget, spent, and remaining

### AI-Assisted Budgeting
- "AI Suggest" analyzes 6 months of spending history per category
- Linear regression for trend detection (increasing / decreasing / stable)
- Smart budget limits with category-aware buffers (15% rising, 10% stable, 5% declining)
- Per-suggestion confidence scoring based on spending volatility
- Detailed reasoning for each suggestion
- Accept / Reject individual suggestions or Accept All at once
- Income-ratio analysis in the summary

### Financial Forecasting
- ML-powered spending predictions using linear regression with seasonality adjustments
- 6-month projected spending trend (area chart with actual vs. predicted)
- Category-wise spending predictions (bar chart)
- AI-generated insights and recommendations
- Trend indicators (rising/falling/stable with percentages)

### Email Reminders
- Bill payment reminders with title, amount, due date, and frequency (once / weekly / monthly / yearly)
- Filter by status: All, Pending, Overdue, Paid
- Toggle paid status
- Optional email notifications with configurable days-before reminder
- Styled HTML email templates
- Test email functionality
- `send_due_reminders()` utility for cron / Celery integration

### AI Assistant
- Chat UI for asking questions about your finances
- Persistent conversation history stored in DB (survives logout/login)
- Powered by local Ollama LLM

### Local AI Integration (Ollama)
- Optional enrichment of receipt and voice data via local Ollama server
- JSON-only prompting for predictable parsing
- AI forecast insights endpoint
- Debug fields to confirm when Ollama was used

### Repo & Code Quality
- Secrets excluded (uses `.env` / `.env.example`)
- Generated artifacts (`db.sqlite3`, `__pycache__`, `node_modules`) gitignored
- Clean animation-free UI (removed jank-causing CSS animations and 3D effects)

## Tech Stack

- **Backend:** Django 5.2 + Django REST Framework
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Charts:** Recharts (AreaChart, PieChart, BarChart)
- **OCR:** pytesseract + Pillow preprocessing
- **Storage:** Local filesystem (Cloudinary optional)
- **Email:** Django email framework (console backend for dev, SMTP configurable)
- **Optional LLM:** Ollama (default model: `llama3.1:8b`)

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

## Email Setup (Optional)

To send real reminder emails, set these in `.env`:

- `EMAIL_BACKEND` = `django.core.mail.backends.smtp.EmailBackend`
- `EMAIL_HOST` = your SMTP server (e.g., `smtp.gmail.com`)
- `EMAIL_PORT` = `587`
- `EMAIL_HOST_USER` = your email
- `EMAIL_HOST_PASSWORD` = app password
- `DEFAULT_FROM_EMAIL` = sender address

Without these, emails are printed to the console (development mode).

## Main API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register/` | POST | Register new user |
| `/api/auth/login/` | POST | Login |
| `/api/auth/logout/` | POST | Logout |
| `/api/auth/user/` | GET | Current user info |
| `/api/transactions/` | GET/POST | List / create transactions |
| `/api/transactions/export/` | GET | Export CSV |
| `/api/transactions/import/` | POST | Import CSV |
| `/api/income-sources/` | GET/POST | List / create income sources |
| `/api/budgets/` | GET/POST | List / create budgets |
| `/api/reminders/` | GET/POST | List / create reminders |
| `/api/ai/budget-suggestions/` | GET | AI budget suggestions |
| `/api/ai/forecast/` | GET | Financial forecast (ML) |
| `/api/ai/forecast-insights/` | POST | AI spending insights |
| `/api/ai/assistant/history/` | GET | Chat history |
| `/api/ai/assistant/send/` | POST | Send message to AI assistant |
| `/api/upload-receipt/` | POST | OCR receipt upload |

## Notes

- If you deploy to production, configure allowed hosts, CORS/CSRF, and replace SQLite with a production database.
