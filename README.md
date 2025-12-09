# FedLearn Industrial

## Federated Learning Platform for Industrial IoT & Automation

A comprehensive federated learning management platform for industrial IoT environments. This application enables distributed machine learning across edge devices without centralizing sensitive operational data.

### Key Features

- **Device Fleet Management**: Register, configure, and monitor edge devices across facilities
- **Model Management**: Create, version, and deploy ML models with full lifecycle control
- **Training Orchestration**: Configure and monitor federated training rounds with privacy controls
- **Predictive Maintenance**: Equipment failure prediction and maintenance scheduling
- **Quality Inspection**: Visual inspection model management and defect tracking
- **Anomaly Detection**: Real-time sensor anomaly detection with AI-powered root cause analysis
- **Data Privacy Governance**: Differential privacy, audit logs, and compliance reporting
- **AI Insights**: Natural language queries about system status via Claude API

### Technology Stack

**Frontend:**
- React with Vite
- Tailwind CSS
- Lucide React (icons)
- React Router
- Recharts (data visualization)
- date-fns (date handling)

**Backend:**
- Node.js with Express
- SQLite with better-sqlite3
- WebSocket for real-time updates
- Claude API for AI-powered insights

### Getting Started

#### Prerequisites

- Node.js 18+
- pnpm or npm

#### Installation

1. Clone the repository
2. Run the initialization script:

```bash
./init.sh
```

3. Start the development servers:

**Terminal 1 - Backend:**
```bash
cd server && npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client && npm run dev
```

Or run both together:
```bash
npm run dev
```

#### Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001

### Project Structure

```
fedlearn-industrial/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── context/       # React context providers
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── controllers/   # Business logic
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # External services
│   │   └── utils/         # Utility functions
│   └── db/                # SQLite database
└── init.sh                # Setup script
```

### Industrial Standards

- **Units**: SI units (meters, kilograms, seconds, Celsius)
- **Time Format**: 24-hour format (HH:mm:ss)
- **Date Format**: ISO 8601 (YYYY-MM-DD)
- **Number Format**: Engineering notation where appropriate
- **Timezone**: UTC with local timezone display option

### Configuration

Environment variables can be configured in:
- `server/.env` - Backend configuration
- `client/.env` - Frontend configuration

### License

MIT
