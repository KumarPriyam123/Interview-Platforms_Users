# Interview Platform

A modular platform for resume parsing and interviewer matching, with a Node.js/Express backend, Python FastAPI microservices, a React frontend, and a dedicated WebRTC signaling service for live P2P interviews.

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
| WebRTC Signaling | 9000 / 9001 | Socket.io + PeerJS |

### 2a. Start Just The P2P Interview Stack

```powershell
npm run dev:p2p
```

This starts:
- `frontend` on `http://localhost:5173`
- `webrtc-service` on `http://localhost:9000` and `http://localhost:9001`

Use this when you only need the live peer interview flow.

### 2b. Test P2P Between Two Laptops On The Same WiFi

1. Start the frontend and WebRTC service on one laptop:

```powershell
npm run dev:p2p
```

2. Find that laptop's LAN IP:

```powershell
ipconfig
```

3. Open the app from both laptops with the host laptop's IP, not `localhost`:

```text
http://<HOST_LAN_IP>:5173/p2p-interview
```

4. Keep the signaling service reachable on the same host:

```text
http://<HOST_LAN_IP>:9000/health
http://<HOST_LAN_IP>:9001/peerjs
```

5. If Windows Defender prompts for Node.js network access, allow it on the private network. If the second laptop still cannot connect, open TCP ports `5173`, `9000`, and `9001` on the host machine.

The frontend now derives `VITE_SIGNALING_URL` and `VITE_PEERJS_URL` from the page hostname by default, so loading `http://192.168.x.x:5173` will automatically target `http://192.168.x.x:9000` and `http://192.168.x.x:9001`.

### 2c. ICE, STUN, and TURN

- Same WiFi often works with host candidates or public STUN only.
- Different networks, VPNs, strict NAT, or corporate firewalls usually need TURN.
- The signaling service exposes ICE config at `/api/ice-servers`; update [iceServers.js](/c:/Users/kumar/OneDrive/Desktop/Projects/Job Saarthi/webrtc-service/src/config/iceServers.js) or replace it with dynamic TURN credentials in production.
- If STUN-only calls stay in `checking` or move to `failed`, add a TURN relay and verify that relay candidates are being gathered.

Example development ICE config:

```js
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:turn.example.com:3478',
    username: 'turn-user',
    credential: 'turn-password',
  },
]
```

### 2d. Start The Code Execution Stack

If you only need the backend execution API used by the collaborative editor, run:

```powershell
npm run start:code-execution
```

For auto-reload during development:

```powershell
npm run start:code-execution:dev
```

This starts:
- Redis in Docker on `localhost:6379`
- The Node backend on `http://localhost:8000`
- The BullMQ worker in a separate PowerShell window

If Redis is already running elsewhere, you can call the script directly with:

```powershell
.\scripts\start_code_execution_stack.ps1 -SkipRedis
```

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
- **WebRTC Health**: http://localhost:9000/health

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
