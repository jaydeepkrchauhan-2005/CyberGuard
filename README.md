# CyberGuard — Integrated Security Assessment & Report Generator

CyberGuard combines the report-generation workflow from the supplied Ethical Hacking Report Generator with the project, asset and findings-management workflow described in the supplied Penetration Test Findings Dashboard documentation.

## What is included
- Overview dashboard with live counts and severity distribution
- Project management (create projects and track status)
- Asset inventory (register approved web, network, mobile, API and server assets)
- Findings management (create, edit, search, filter, track status and delete)
- Report generator (project-filtered report preview, Markdown export, browser Print / Save as PDF)
- Node.js API with JSON-file persistence, request validation, basic security headers and restricted CORS
- Fictional starter records to demonstrate the workflow

## Important scope note
This is an assessment findings and reporting platform. It does **not** perform live scanning, exploitation or network probing. The “Run demo assessment” action only adds clearly labelled simulated examples and does not contact a target. Use the workspace only for systems you own or have explicit written permission to assess. Replace sample records with verified observations and sanitized evidence.

## Requirements
- Node.js 20.19+ or 22.12+ (recommended for the included Vite version)
- npm

## Run on Windows
1. Extract the ZIP.
2. Open the extracted `CyberGuard-Integrated` folder in VS Code.
3. Open Terminal in that folder and run:

```bash
npm install
```

4. Start the backend API in Terminal 1:

```bash
npm run server
```

You should see: `CyberGuard API running at http://localhost:4000`

5. Start the frontend in Terminal 2:

```bash
npm run dev
```

6. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

Keep both terminals running while using the app.

## Data storage
The backend creates `backend/data.json` automatically on first run. Projects, assets and findings are stored there and remain after restarting the server. Delete this file only if you want to reset the local demo data; the seed data will be recreated on the next server start.

## Useful API routes
- `GET /api/health`
- `GET /api/overview`
- `GET|POST /api/projects`
- `GET|POST /api/assets`
- `GET|POST /api/findings`
- `PUT|DELETE /api/findings/:id`
- `POST /api/demo-assessment` (simulated records only)

## Project structure
```text
CyberGuard-Integrated/
├── backend/
│   └── server.js
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## Troubleshooting
- If the page says the API is unavailable, start `npm run server` in a separate terminal.
- If port 4000 is already in use, set `PORT=4001` before starting the server and update `API` in `src/App.jsx` to `http://localhost:4001/api`.
- If port 5173 is already in use, stop the other process or change the Vite port in `vite.config.js` and set `FRONTEND_ORIGIN` on the backend to match the new frontend origin.
