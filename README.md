# Interview Platform

A modular platform for resume parsing and interviewer matching, with a Node.js/Express backend, Python FastAPI microservices, and a React frontend.

## Repository Structure

```
interview_platform/
├── backend/               # Dual backend
│   ├── src/
│   │   ├── api/           # Python API Gateway (Port 8000)
│   │   ├── services/
│   │   │   ├── parsing/   # Resume Parser service (Port 8001)
│   │   │   └── matching/  # Profile Matching service (Port 8002)
│   │   ├── db/            # MongoDB & PostgreSQL connectors
│   │   ├── models/        # Mongoose/Sequelize models
│   │   ├── middlewares/   # Express middlewares
│   │   └── index.js       # Node.js Express server (Port 3000)
│   ├── requirements.txt   # Python dependencies
│   └── package.json       # Node.js dependencies
├── frontend/              # React + Vite (Port 5173)
├── shared/                # Shared utilities
├── data/                  # Uploads & storage
└── scripts/               # Setup & start scripts
```

## Quick Start

### 1. Setup (install all dependencies)

```powershell
.\scripts\setup.ps1
```

This will:
- Verify Python, Node.js, and npm are installed
- Create a Python virtual environment and install FastAPI packages
- Run `npm install` for the Node.js backend and React frontend
- Copy `.env.example` → `.env` (if not present)
- Create data directories

**Skip flags** (optional):
```powershell
.\scripts\setup.ps1 -SkipPython       # Skip Python venv
.\scripts\setup.ps1 -SkipNode         # Skip Node.js backend deps
.\scripts\setup.ps1 -SkipFrontend     # Skip React frontend deps
```

### 2. Start All Services

```powershell
.\scripts\start_services.ps1
```

Each service launches in its own titled PowerShell window:

| Service | Port | Technology |
|---------|------|------------|
| API Gateway | 8000 | Python FastAPI |
| Resume Parser | 8001 | Python FastAPI |
| Profile Matching | 8002 | Python FastAPI |
| Node.js Backend | 3000 | Express |
| React Frontend | 5173 | Vite |

**Skip flags** (optional):
```powershell
.\scripts\start_services.ps1 -SkipFrontend    # Run backends only
.\scripts\start_services.ps1 -SkipPython       # Run Node.js + frontend only
```

### 3. Access API Documentation

- **API Gateway (Main)**: http://localhost:8000/docs
- **Resume Parser**: http://localhost:8001/docs
- **Profile Matching**: http://localhost:8002/docs
- **Node.js Backend**: http://localhost:3000/health
- **React Frontend**: http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload-resume` | Upload and parse a resume (PDF/DOCX) |
| POST | `/api/match-interviewer` | Match candidate with interviewers |
| GET | `/api/interviewers` | List all interviewers (with filters) |
| GET | `/api/interviewers/{id}` | Get interviewer details |
| POST | `/api/parse-and-match` | Upload, parse, and match in one call |

## License

MIT
