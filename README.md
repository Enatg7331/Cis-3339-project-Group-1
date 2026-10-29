# Data Platform

MEVN application for nonprofit organizations and their Community Health Workers. A backend instance serves one organization, using the organization ID in each verified JWT to scope client, event, and service data.

## Requirements

- Node.js 22.12 or newer (Vite 8 requirement) and npm
- MongoDB 6 or newer, local or a dedicated course-project database
- Git

## Local setup

Copy the example environment files, then replace the backend example's Mongo connection, organization ID, and JWT secret with values for a database dedicated to this project:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

`backend/.env`:

| Variable | Purpose |
|---|---|
| `MONGO_URL` | MongoDB connection string for the dedicated project database |
| `PORT` | Backend HTTP port (3000 by default) |
| `ORG_ID` | 24-character ObjectId for this deployment's organization |
| `JWT_SECRET` | Project-only secret used to sign access tokens; use at least 32 characters |
| `CORS_ORIGIN` | Exact frontend origin permitted by the API |
| `SEED_VIEWER_USERNAME` / `SEED_VIEWER_PASSWORD` | Credentials for the viewer seed account |
| `SEED_EDITOR_USERNAME` / `SEED_EDITOR_PASSWORD` | Credentials for the editor seed account |
| `ORG_NAME` | Optional name shown in the application |

`frontend/.env`:

| Variable | Purpose |
|---|---|
| `VITE_ROOT_API` | Backend API URL embedded in a Vite build; overridden by `frontend/public/config.js` at runtime |

Install dependencies and initialize the database:

```powershell
cd backend
npm install
npm run db:init
npm start
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The database initializer validates its configuration before connecting, hashes both passwords with bcrypt, creates the organization, demo accounts, and linked sample client/service/event/registration records, and can be safely rerun. It does not delete existing data. The default demo logins are `user` / `user` (viewer) and `admin` / `admin` (editor). Change these passwords before exposing the app outside a local course environment.

The example Mongo URL targets `mongodb://127.0.0.1:27017/cis3339`; MongoDB must be running locally for that example to work. A hosted database must be configured by the project team. Do not put personal, production, or shared credentials in this repository. Local `.env` files are ignored by Git; submit project-provided grading credentials through the instructor-approved secure process.

## API and authorization

- `GET /health` reports API and MongoDB connection state without authentication.
- Login returns an expiring JWT with the user's role and `orgId`.
- Client, event, and service reads require authentication. Every query is scoped to the JWT's organization.
- All create, update, delete, register, and deregister operations require the editor role on the server.
- CORS allows only the configured `CORS_ORIGIN`.
- Registration is idempotent and verifies that both records belong to the authenticated organization.
- Errors use `{ "error": "Human readable message" }`.

## Build and verification

```powershell
cd frontend
npm run lint
npm run build
npm run serve
```

`npm run serve` runs Vite Preview (default `http://localhost:4173`) against `frontend/dist`. Vite's history fallback and the included Netlify `public/_redirects` rule support refreshing nested SPA routes. No automated test suites are currently included; verify the viewer/editor, registration, and tenant-isolation workflows against a non-production test database before grading.

## Static deployment

Build the frontend with the correct API URL:

```powershell
cd frontend
$env:VITE_ROOT_API = "https://your-api-host.example"
npm run build
```

Alternatively, deploy `frontend/dist` and set `window.__APP_CONFIG__.apiUrl` in its `config.js` to the backend URL; this is runtime configuration and avoids rebuilding when only the API hostname changes. Configure the static host to serve `index.html` for unknown paths (Netlify uses the included `_redirects` file; other hosts need the equivalent SPA rewrite). Set backend `CORS_ORIGIN` to the exact deployed frontend origin, restart the backend, and ensure the backend URL uses HTTPS when the site uses HTTPS. The production demonstration should use the built `dist` output served by `npm run serve` or the deployed static host, not Vite's development server.

## Known limitations and submission notes

- This repository does not include course-provided MongoDB credentials, a deployed service, or the Sprint 1/3 Canvas PDF/video deliverables. Those require the team and instructor's secure course environment.
- Demo passwords are intentionally simple for grading only. Do not reuse them or expose the demo accounts on a public production deployment.
- Automated regression tests and an end-to-end browser demonstration remain to be added/run by the team.
