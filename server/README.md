# StaffPilot Server

The server is the StaffPilot REST API. It owns authentication, authorization, validation, persistence, notifications, file uploads, and the business workflows used by the client.

## Responsibilities

- Issue and validate JWT-based sessions
- Enforce role-based access for `super_admin`, `team_lead`, and `intern`
- Persist users, attendance, projects, tasks, notifications, and settings in MongoDB
- Validate incoming request bodies with Express Validator
- Serve uploaded files from `/uploads`
- Apply CORS, security headers, JSON body limits, and centralized error responses

## Stack

- Node.js and TypeScript
- Express 4
- MongoDB with Mongoose 8
- JSON Web Tokens and cookie-parser
- CORS and Express Validator
- Multer for multipart file uploads
- `tsx` for development and runtime TypeScript execution

## Source Layout

```text
server/
├── config/db.ts          # MongoDB connection and retry handling
├── controllers/          # Request handlers and business logic
├── middleware/           # Auth, validation, and error middleware
├── models/               # Mongoose schemas
├── routes/               # Express route modules
├── types/                # Server-side TypeScript types
├── uploads/              # Project and task uploads
├── utils/                # Async, error, and notification helpers
├── server.ts             # Express app bootstrap
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/staffpilot
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE=6d
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=replace-before-use
CLIENT_URL=http://localhost:5173
```

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port; defaults to `5000` |
| `NODE_ENV` | Runtime mode; production uses the configured client origin |
| `MONGO_URI` | MongoDB connection string; defaults to local StaffPilot MongoDB |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `JWT_EXPIRE` | Token lifetime accepted by the authentication layer |
| `SUPER_ADMIN_USERNAME` | Administrator bootstrap username |
| `SUPER_ADMIN_PASSWORD` | Administrator bootstrap password; replace before deployment |
| `CLIENT_URL` | Trusted frontend origin used by production CORS |

Never commit `.env`, credentials, or sensitive uploads. Use a secrets manager in production where available.

## Installation and Operations

```bash
cd server
npm install
npm run dev
```

`npm run dev` starts `tsx watch server.ts`. For a production process:

```bash
npm start
```

The API listens on `http://localhost:5000` by default. Check readiness with:

```bash
curl http://localhost:5000/api/health
```

The health response includes `success`, a status message, an ISO timestamp, and the API version.

## API Surface

All application routes are prefixed with `/api`:

| Module | Base path | Scope |
| --- | --- | --- |
| Health | `/api/health` | API readiness |
| Authentication | `/api/auth` | Login, registration, logout, current user |
| Users | `/api/users` | User administration and role-aware user access |
| Attendance | `/api/attendance` | Check-in/out and attendance review |
| Projects | `/api/projects` | Project lifecycle, details, and uploads |
| Tasks | `/api/tasks` | Task lifecycle, assignment, and status updates |
| Notifications | `/api/notifications` | User notifications and read state |
| Settings | `/api/settings` | Persisted workspace settings |

Authentication routes include `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, and protected `GET /api/auth/me`. Consult the route files for request fields and role restrictions.

## Request and Response Conventions

- JSON requests use `Content-Type: application/json`.
- Authenticated requests may provide `Authorization: Bearer <token>` and credentials.
- Successful responses use the API's `success` envelope.
- Errors use a consistent `success: false` response with an `error` message; development responses may include a stack trace.
- Multipart uploads are stored beneath `uploads/` and exposed at `/uploads/*`.
- Unknown `/api/*` routes return HTTP 404.

## Security and Reliability

- CORS allows localhost client origins during development and `CLIENT_URL` in production.
- Security headers include content-type sniffing, clickjacking, referrer, and permissions policies.
- Request bodies are limited to 10 MB.
- MongoDB connection failures are logged and retried; connection events are also monitored.
- Use HTTPS, rotate secrets, restrict MongoDB network access, and place uploaded files on durable access-controlled storage in production.

## Verification

```bash
npm run typecheck
```

The server currently has no automated test script in `package.json`; validate endpoint changes with the health check and an authenticated API workflow in a controlled environment.
