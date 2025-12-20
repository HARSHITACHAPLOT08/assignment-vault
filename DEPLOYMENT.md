Deployment plan — make this app publicly reachable

Overview
- Frontend: Vite + React app (frontend/). Build produces static assets that can be hosted on Vercel, Netlify, or any static host.
- Backend: Express app (backend/). Run as a Node web service on a host like Render, Fly, Heroku, or in a Docker container.

Option A — Vercel (frontend) + Render (backend) — recommended

1) Push repository to GitHub
   - Create a GitHub repository and push the entire project.

2) Deploy backend to Render (or any Node host)
   - In Render dashboard, create a new Web Service.
   - Connect your GitHub repo and choose the `backend` folder/branch.
   - Use start command: `npm start` (render.yaml present as a hint for IaC).
   - Set env var `AV_SECRET` to a strong random secret in Render's dashboard.
   - (Optional) Create a persistent disk mount or configure S3 for file uploads.
   - After deployment, note the backend URL (e.g., https://assignment-vault-backend.onrender.com).

3) Deploy frontend to Vercel
   - Create a new Vercel project, connect to the same GitHub repo, set root to `frontend`.
   - In `vercel.json`, replace `<BACKEND_HOST>` with your backend URL from Render (without trailing slash).
   - Set the build command (Vercel usually detects): `npm run build` and output dir `dist`.
   - Deploy; Vercel will give you a permanent URL (e.g., https://assignment-vault.vercel.app).

4) Configure DNS / domain (optional)
   - Add a custom domain in Vercel and Render if you own one, and set DNS records accordingly.

Option B — Single host (Docker)

- Build the backend Docker image (backend/Dockerfile provided) and serve frontend static files from a small static server (or pre-build and copy into a simple nginx container). Use Docker Compose or a single VM/container host.

Security notes for production
- Replace the demo passcodes with proper auth (SSO/OAuth) if this will be used by many people.
- Store uploads in durable storage (S3) and serve via signed URLs.
- Use HTTPS everywhere, store `AV_SECRET` in host secrets.

Automation (CI)
- Use GitHub Actions to build the frontend and deploy to Vercel (Vercel action) and deploy backend to Render (Render has API + GitHub integration).

Need me to proceed?
- I cannot finish the deploy automatically without a GitHub repo and service credentials (Vercel/Render API keys). If you grant one of the following, I can complete deployment for you:
  - Add this project to a GitHub repo and tell me the URL, or
  - Give me permission/credentials for Vercel/Render (recommended: create API tokens and set them as GitHub secrets; I will show the exact keys to add).

I can also produce the GitHub Actions YAML that will auto-deploy when you push. Tell me which host(s) you prefer and I will generate the CI files.
