# Assignment Vault — Private academic sharing

This project is a lightweight private academic-sharing app designed for a single-owner (uploader) and viewer passcode model. It includes a Vite + React frontend and a minimal Express backend for uploads.

Features
- Dual-passcode authentication (viewer / owner)
- Upload images or PDFs (owner only)
- Drag-and-drop uploads, previews, downloads
- Light / Dark theme, watermark toggle, responsive UI

Run locally
1. Install and run backend

```powershell
cd backend
npm.cmd install
npm.cmd start
```

2. Run frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173

Default passcodes (for local/demo only)
- Viewer passcode: `H...`
- Owner passcode: `c...`

Deployment
- Frontend: build with `npm run build` and host on any static site host (Vercel, Netlify, GitHub Pages). If you use Vercel, configure rewrites or proxy to point `/api` to the backend.
- Backend: deploy the `backend` folder to any Node host (Render, Render Free, Heroku, DigitalOcean App Platform). Ensure `DATA_DIR` and `uploads` are persisted or use S3 for file storage in production.

Simple Docker idea
- Create a multi-container setup with frontend served by Vite build or static server and backend Node app. Use a reverse proxy (nginx) to serve both under one domain.

Security notes
- Passcodes are for demonstration only. In production, use proper identity (OAuth or university SSO) and secure storage of secrets.
- Store uploads on durable storage (S3) and protect direct download URLs with signed tokens for private content.

Branding
Footer on every page: Harshita Chaplot
