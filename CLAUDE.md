# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FedLearn Industrial is a federated learning platform for industrial IoT environments. It enables distributed machine learning across edge devices without centralizing sensitive operational data, featuring device fleet management, training orchestration, predictive maintenance, quality inspection, anomaly detection, and AI-powered insights via Claude API.

## Development Commands

```bash
# Initial Setup
./init.sh                     # Run once: installs deps, creates .env, initializes DB

# Run Development Servers
npm run dev                   # Both client (5173) and server (3001) concurrently
npm run dev:client            # Frontend only - http://localhost:5173
npm run dev:server            # Backend only - http://localhost:3001

# Database
cd server && npm run init-db       # Initialize/reset SQLite database
cd server && npm run migrate-db    # Run database migrations

# Build
cd client && npm run build    # Production build to client/dist/
cd client && npm run preview  # Preview production build
```

## Architecture

### Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router + Recharts
- **Backend**: Node.js + Express (ES modules) + SQLite (better-sqlite3) + WebSocket
- **AI**: Claude API via Anthropic SDK for insights and anomaly explanations

### Directory Structure

```
client/src/
├── pages/          # Route components (Dashboard, Devices, Models, Training, etc.)
├── components/     # Reusable UI (Layout, Modal, ui/Button, ui/Card, etc.)
├── context/        # AuthContext, ThemeContext
├── utils/api.js    # Fetch wrapper with auth
└── styles/         # index.css (Tailwind), design-system.css

server/src/
├── routes/         # Express route handlers (15 route files)
├── services/       # websocket.js (pub/sub), trainingSimulator.js
├── utils/db.js     # SQLite connection
└── utils/initDb.js # Schema creation and seed data
```

### API Patterns
- All endpoints under `/api/*`
- Response format: `{ data: [...] }` or `{ error: { message, code } }`
- WebSocket at `/ws` with topic-based subscriptions: `devices`, `metrics:{deviceId}`, `training:{roundId}`, `anomalies`, `notifications:{userId}`

### Frontend Patterns
- React Context for auth and theme (dark mode via class-based Tailwind)
- Protected routes via `ProtectedRoute` wrapper in App.jsx
- API proxy configured in vite.config.js (no CORS issues in dev)

### Database
- SQLite with UUID primary keys, foreign key constraints enabled
- Direct SQL queries (no ORM) using better-sqlite3 prepared statements
- JSON columns for flexible nested data (capabilities, preferences, metrics)

## Key Configuration

**vite.config.js**: Proxies `/api` and `/ws` to localhost:3001

**tailwind.config.js**: Custom colors for status indicators (online/offline/warning), model types (classification/regression/anomaly/detection), dark mode support

**Environment Variables** (in respective `.env` files):
- `ANTHROPIC_API_KEY` - Required for AI features
- `JWT_SECRET` - Token generation
- `DATABASE_PATH` - SQLite database location (default: `./db/fedlearn.db`)

## Design Constraints

- **No emojis** - Use Lucide React icons exclusively
- **Industrial formatting**: SI units, 24-hour time (HH:mm:ss), ISO 8601 dates (YYYY-MM-DD), UTC default
- **Demo auth**: admin@fedlearn.io / admin123 (passwords stored plaintext - dev only)

## File Upload

Dataset uploads handled via Multer on `POST /api/devices/upload`:
- Supports CSV, JSON, Parquet (100MB limit)
- Files stored in `server/datasets/`
- Used for creating simulated devices with training data
