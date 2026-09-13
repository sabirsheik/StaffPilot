# StaffPilot

StaffPilot is a role-based workforce operations platform for managing people, attendance, projects, tasks, notifications, and workspace settings. The repository contains a React client and an Express API backed by MongoDB.

## Product Scope

| Role | Primary capabilities |
| --- | --- |
| Super Admin | User and team administration, organization-wide attendance, settings |
| Team Lead | Team dashboard, intern supervision, attendance review, project and task coordination |
| Intern | Personal dashboard, attendance check-in/out, assigned projects and tasks |

## Architecture

```text
Browser
	│
	├── client/  React 19 + Vite + Tailwind CSS
	│       └── /api and /uploads proxied to the server in development
	│
	└── server/  Express + TypeScript + Mongoose
					└── MongoDB
```

The client stores the JWT for API authorization and also sends credentials for the server's cookie-based flows. The API applies role protection, request validation, CORS, security headers, and centralized error handling.

## Features

- Authentication with registration, login, logout, and current-user lookup
- Role-based route protection for `super_admin`, `team_lead`, and `intern`
- User and team administration
- Attendance check-in/out and attendance review
- Project creation, tracking, details, and file uploads
- Task assignment and status workflows
- In-app notifications
- Persisted workspace and security settings
- Responsive dashboards and reusable form, table, dialog, loading, and pagination components

## Technology

- **Client:** React 19, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS, Lucide React
- **Server:** Node.js, TypeScript, Express, Mongoose, MongoDB, JSON Web Tokens, cookie-parser, CORS, Express Validator, Multer

## Repository Layout

```text
StaffOS/
├── client/              # Browser application
│   ├── public/          # Static assets, including the StaffPilot logo
│   ├── src/             # Pages, layouts, components, API hooks, and auth context
│   └── package.json
├── server/              # REST API and persistence layer
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication, validation, and errors
│   ├── models/          # Mongoose models
│   ├── routes/          # API route definitions
│   ├── uploads/         # Uploaded project and task files
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 18 or newer
- npm
- A local MongoDB instance or MongoDB Atlas database

## Configuration

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/staffpilot
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE=6d
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=admin123
CLIENT_URL=http://localhost:5173
```

`MONGO_URI` defaults to the local value shown above and `PORT` defaults to `5000` when omitted. Keep secrets out of source control. In production, use a strong unique `JWT_SECRET`, a non-default administrator password, and the public client origin in `CLIENT_URL`.

## Local Development

Install dependencies in both applications:

```bash
cd server
npm install

cd ../client
npm install
```

Run the API and client in separate terminals:

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

Open <http://localhost:5173>. The Vite development server forwards `/api` and `/uploads` to <http://localhost:5000>.

Verify the API is available:

```bash
curl http://localhost:5000/api/health
```

## Production Build

Build the browser application:

```bash
cd client
npm run build
npm run preview
```

Start the API:

```bash
cd server
npm run build
npm start
```

The Vite proxy is a development feature. For production, serve the client through a web server or hosting platform and configure that layer to route `/api` and `/uploads` to the API service. Configure CORS with the deployed client URL.

For a separately hosted API, create `client/.env.local` (or configure the variable in the frontend hosting dashboard) before building:

```env
VITE_API_BASE_URL=https://api.example.com/api
```

The client reads this value at build time. Keep `VITE_API_BASE_URL=/api` when the frontend host proxies `/api` and `/uploads` to the backend. Set the server's `CLIENT_URL` to the exact deployed frontend origin.

## Quality Checks

```bash
cd client
npm run lint
npm run typecheck
npm run build

cd ../server
npm run typecheck
```

## API Modules

All API routes are under `/api`: `/auth`, `/users`, `/attendance`, `/projects`, `/tasks`, `/notifications`, and `/settings`. The complete server-side module and operational notes are documented in [server/README.md](server/README.md).

## Further Documentation

- [Client documentation](client/README.md)
- [Server and API documentation](server/README.md)

## Security Notes

- Never commit `server/.env` or uploaded files containing sensitive data.
- Restrict `CLIENT_URL` to trusted origins in production.
- Use HTTPS in production so tokens and credentials are protected in transit.
- Configure persistent, access-controlled storage for MongoDB and uploaded files.
