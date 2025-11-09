# Ledger AI - Intelligent Financial Management System

## Project Overview
Ledger AI is a modern financial management system that combines Django REST Framework for the backend and React for the frontend. The system provides user authentication, transaction management, and an intuitive interface for managing financial records.

## Current Progress

### Completed Features
1. **Backend Development (Django)**
   - User authentication system with session management
   - RESTful API endpoints for transactions
   - Database models for user and transaction management
   - CSRF protection implementation
   - Custom middleware for authentication

2. **Frontend Development (React)**
   - User authentication interface (Login/Register)
   - Transaction management components
   - API integration with axios
   - Session persistence implementation
   - Responsive user interface with Tailwind CSS

3. **Authentication System**
   - Combined session and token-based authentication
   - Persistent login across page refreshes
   - Secure API communication

## Project Setup Guide

### Prerequisites
- Python 3.8 or higher
- Node.js 14.x or higher
- npm (Node Package Manager)
- Git

### Backend Setup (Django)

1. Clone the repository:
   ```bash
   git clone [your-repository-url]
   cd ledger_ai
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # On Windows
   source .venv/bin/activate  # On Unix/MacOS
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

5. Run the Django development server:
   ```bash
   python manage.py runserver
   ```
   The backend will be available at http://localhost:8000

### Frontend Setup (React)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will be available at http://localhost:3000

## Project Structure
```
ledger_ai/
├── core/                   # Django app containing main backend logic
│   ├── models.py          # Database models
│   ├── views.py           # API views and logic
│   ├── urls.py           # URL routing
│   └── serializers.py     # Data serializers
├── frontend/              # React frontend application
│   ├── src/              
│   │   ├── components/    # React components
│   │   └── services/     # API and authentication services
│   └── public/           # Static files
└── ledger_ai_project/    # Django project settings
    └── settings.py       # Project configuration
```

## Configuration Notes
1. The Django backend uses SQLite as the default database
2. CORS settings are configured to allow frontend communication
3. Session-based authentication is enabled with CSRF protection
4. Frontend API calls are configured to include credentials

## Running Tests
- Backend Tests:
  ```bash
  python manage.py test
  ```
- Frontend Tests:
  ```bash
  cd frontend
  npm test
  ```

## Known Issues
- None Right Now.

## Next Steps
- Implementation of AI features for transaction analysis
- Enhanced security measures
- Additional financial reporting features

## Contact
[if i have to make changes, Sir you can contact me on teams.]
