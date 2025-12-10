# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FedLearn Industrial backend - a federated learning platform for industrial IoT environments. Node.js/Express server with SQLite database, WebSocket real-time updates, and Claude API integration for AI-powered insights.

## Commands

```bash
# Install dependencies
npm install

# Initialize database (creates schema and seed data)
npm run init-db

# Run development server (with --watch)
npm run dev

# Run production server
npm start
```

Server runs on port 3001. Frontend CORS origin is http://localhost:5173.

## Architecture

### Tech Stack
- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **Framework**: Express.js
- **Database**: SQLite with better-sqlite3 (raw SQL, no ORM)
- **Real-time**: WebSocket (ws library) with topic-based pub/sub
- **AI**: Claude API (@anthropic-ai/sdk) for insights and anomaly explanations

### Directory Structure
```
server/
├── src/
│   ├── index.js              # Entry point, Express setup, route mounting
│   ├── routes/               # API endpoint handlers (business logic here)
│   ├── services/
│   │   └── websocket.js      # WebSocket pub/sub management
│   └── utils/
│       ├── db.js             # Database connection
│       └── initDb.js         # Schema creation and seed data
└── db/
    └── fedlearn.db           # SQLite database file
```

### API Routes
All routes under `/api`:
- `/auth` - User authentication (register/login/profile)
- `/facilities` - Manufacturing facility management
- `/devices` - Device registration and management
- `/device-groups` - Device grouping by zones
- `/models` - ML model lifecycle management
- `/training` - Federated training round orchestration
- `/ai` - Claude API integration (queries, insights, recommendations)
- `/anomalies` - Sensor anomaly detection
- `/maintenance` - Predictive maintenance
- `/quality` - Quality inspection records
- `/reports`, `/notifications`, `/audit`, `/simulation`

### Database Schema
15 tables with UUID primary keys, JSON columns for flexible data, and foreign key constraints:
- Core: `users`, `facilities`, `device_groups`, `devices`, `device_metrics`
- ML: `models`, `model_versions`, `training_rounds`, `device_training_contributions`, `model_deployments`
- Operations: `anomalies`, `maintenance_predictions`, `quality_inspections`
- Admin: `notifications`, `audit_logs`, `privacy_budget_logs`

### WebSocket Topics
- `devices` - Device status updates
- `metrics:{deviceId}` - Per-device metrics
- `training:{roundId}` - Training progress
- `anomalies` - Real-time anomaly detection
- `notifications:{userId}` - User notifications

## Code Patterns

### Response Format
```javascript
// Success with list
{ data: [...], total: count }

// Success with single item
{ ...item }

// Error
{ error: { message: "...", code: "ERROR_CODE" } }
```

### Database Access
Direct SQL with better-sqlite3 prepared statements:
```javascript
import { db } from '../utils/db.js';
const result = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
```

### Status Enums
- **Device**: online, offline, warning, error, maintenance
- **Model**: draft, active, deprecated
- **Training**: pending, in_progress, aggregating, completed, failed, cancelled

## Environment Variables

```
PORT=3001
DATABASE_PATH=./db/fedlearn.db
JWT_SECRET=<secret>
ANTHROPIC_API_KEY_PATH=/tmp/api-key
CORS_ORIGIN=http://localhost:5173
```

## Industrial Standards

- **Units**: SI system (meters, kilograms, seconds, Celsius)
- **Dates**: ISO 8601 (YYYY-MM-DD)
- **Time**: 24-hour format (HH:mm:ss)
- **Timezone**: UTC by default
