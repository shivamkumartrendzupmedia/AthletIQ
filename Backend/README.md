# ATHLETIQ Backend API

Robust, scalable backend service for the **ATHLETIQ Sports Academy & Tournament Management Platform**. Built with Node.js, Express, TypeScript, and MongoDB/Mongoose.

---

## 📋 Overview & Architecture

- **Runtime**: Node.js (ES Modules, `"type": "module"`)
- **Language**: TypeScript (Strict mode enabled, NodeNext module resolution)
- **Framework**: Express 4.x
- **Database**: MongoDB via Mongoose ODM
- **Validation**: Zod schema-based validation
- **Security**: Helmet, CORS origin restriction, Cookie Parser, Rate Limiting (100 req/15min)
- **Logging & Compression**: Morgan (dev mode), Gzip compression

---

## 🛠️ Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **MongoDB**: MongoDB Atlas cluster account (or local MongoDB v6+)

---

## 🚀 Setup Instructions

### 1. Install Dependencies
From the `/Backend` directory, install all required production and development dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template `.env.example` file to create your local `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell, use: `Copy-Item .env.example .env`)*

Open `.env` and fill in your configuration:
- `PORT=5000`
- `NODE_ENV=development`
- `CLIENT_URL=http://localhost:5173`
- `MONGODB_URI=<your-connection-string>`
- `JWT_ACCESS_SECRET=<your-secret>`
- `JWT_REFRESH_SECRET=<your-secret>`

---

## 🌐 MongoDB Atlas Setup Guide

1. **Create an Atlas Cluster**:
   - Log into [MongoDB Atlas](https://cloud.mongodb.com).
   - Create or select an existing cluster.

2. **Database User Credentials**:
   - Go to **Security > Database Access**.
   - Create a database user with `Read and write to any database` privileges.
   - Note your username and password.

3. **URL-Encoding Special Characters in Password**:
   - If your password contains special characters (such as `@`, `:`, `/`, `?`, `#`, `[`, `]`, `%`), you **must URL-encode** them.
   - For example:
     - `@` becomes `%40`
     - `#` becomes `%23`
     - `:` becomes `%3A`
     - `/` becomes `%2F`

4. **IP Access List (Network Access)**:
   - Go to **Security > Network Access**.
   - Click **Add IP Address**.
   - For development, add your current IP address or `0.0.0.0/0` (allow from anywhere during local testing).

5. **Obtaining Connection String**:
   - Go to **Database > Deployment > Connect**.
   - Select **Drivers** (Node.js).
   - Copy the connection string format:
     ```text
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/athletiq?retryWrites=true&w=majority
     ```
   - Paste it into your `MONGODB_URI` in `.env`.

---

## 📜 Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `tsx watch src/server.ts` | Runs the server in development mode with hot-reloading on file change |
| `npm run build` | `tsc` | Compiles TypeScript code to `dist/` |
| `npm start` | `node dist/server.js` | Runs the compiled production code |
| `npm run lint` | `oxlint` | Runs fast Oxlint linter across the codebase |

---

## 📁 Project Folder Structure

```text
Backend/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules for node_modules, dist, .env
├── .oxlintrc.json            # Oxlint configuration
├── package.json              # Project scripts and dependencies
├── README.md                 # Setup and documentation
├── tsconfig.json             # TypeScript configuration (strict, NodeNext)
└── src/
    ├── app.ts                # Express app initialization & middleware stack
    ├── server.ts             # Server entrypoint, DB boot & graceful shutdown
    ├── config/
    │   ├── db.ts             # Mongoose connection & lifecycle events
    │   └── env.ts            # Zod-based environment variable validation
    ├── controllers/          # Business logic controllers (.gitkeep)
    ├── middlewares/
    │   ├── errorHandler.ts   # Centralized error response formatter
    │   └── notFound.ts       # 404 handler for undefined routes
    ├── models/               # Mongoose schemas & models (.gitkeep)
    ├── routes/
    │   ├── health.routes.ts  # GET /api/health endpoint
    │   └── index.ts          # Central API router (/api/...)
    ├── services/             # Reusable service layer logic (.gitkeep)
    ├── utils/
    │   ├── ApiError.ts       # Operational HTTP error class
    │   └── asyncHandler.ts   # Async route wrapper for Express 4.x
    └── validators/           # Zod request validation schemas (.gitkeep)
```

---

## 🩺 System Health Check

When the server is running, verify the connection status at:
```http
GET http://localhost:5000/api/health
```

Expected Response:
```json
{
  "success": true,
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-10-07T12:00:00.000Z",
  "environment": "development",
  "database": "connected"
}
```
