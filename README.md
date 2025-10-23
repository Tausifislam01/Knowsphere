# KnowSphere

KnowSphere is a real-time knowledge sharing platform built with the MERN stack. It enables students and professionals to publish “insights,” discuss via threaded comments, and discover content through tags, following, search, and a trending feed—backed by moderation tools and live notifications.

## ✨ Features

- **Auth & Profiles**: JWT-based auth, profile editing (bio, skills, links, gender privacy), change password, delete account, shareable profile links.
- **Insights**: CRUD, public/private, real-time voting, AI tag suggestions, related insights (embeddings + tag overlap), keyword/tag search, trending (vote + recency).
- **Comments**: Threaded comments with replies; edit/delete; admin hide/unhide/delete; real-time updates; report with content snapshot.
- **Bookmarks**: Add/remove bookmarks; personal list; live updates.
- **Follow System**: Follow/unfollow users and tags; followed feed; suggested users (excludes admins).
- **Reports & Moderation**: Report rate limit (max 5/hour) with dedup; resolve/dismiss; hide/delete content; ban/unban; admin logs and work log (searchable).
- **Notifications**: Real-time unread counts; panel to read/clear.
- **Admin Tools**: Dashboard for reports, bans, logs; bulk actions supported by backend.
- **Quality**: Error handling and toast notifications throughout the UI.

## 🧱 Architecture

- **Frontend**: React (SPA), Socket.IO client, dark glossy UI.
- **Backend**: Node.js + Express, REST + Socket.IO.
- **Database**: MongoDB (users, insights, comments, bookmarks, reports, notifications, logs).
- **Media**: Cloudinary for profile images.
- **AI**: Hugging Face for embeddings and tag suggestions.

```text
[ React SPA ]  <->  [ Express API | Socket.IO ]  <->  [ MongoDB ]
         |                  |                             |
     Cloudinary         Auth / RBAC                 Embeddings (HF)
```

## 🚀 Getting Started

### 1) Prerequisites
- Node.js 18+ and npm
- MongoDB (locally or hosted)
- Cloudinary account (for profile images)
- Hugging Face token (for embeddings/tagging)

### 2) Environment
Create a `.env` for the server (or use a `.env.example`):

```
MONGO_URI=mongodb://localhost:27017/knowsphere
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
HUGGINGFACE_API_KEY=your_hf_token
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
CORS_ORIGINS=http://localhost:5173
```

### 3) Install & Run

**Backend**
```bash
cd backend
npm install
npm run dev       # or: npm run start
```

**Frontend**
```bash
cd frontend
npm install
npm run dev       # or: npm run build && npm run preview
```

## 🔌 API (Quick Glance)

- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/insights`, `POST /api/insights`, `GET /api/insights/:id`, `PATCH /api/insights/:id`, `DELETE /api/insights/:id`
- `POST /api/insights/:id/vote`, `POST /api/insights/:id/bookmark`
- `GET /api/insights/:id/related`, `GET /api/insights/followed`, `GET /api/insights/trending`
- `GET /api/insights/:id/comments`, `POST /api/insights/:id/comments`, `PATCH /api/comments/:id`, `DELETE /api/comments/:id`
- `POST /api/insights/:id/report`, `GET /api/admin/reports`, `POST /api/admin/reports/:id/{resolve|dismiss}`
- `POST /api/admin/users/:id/{ban|unban}`, `GET /api/admin/logs`, `GET /api/admin/work-log`
- `GET /api/notifications`, `POST /api/notifications/mark-read`, `DELETE /api/notifications/clear-read`
- `POST /api/users/:id/follow`, `POST /api/tags/:id/follow`

> Auth: most endpoints require `Authorization: Bearer <token>`.

## 🧮 Ranking & AI

- **Trending**: vote- and time-decayed scoring (weights configurable).
- **Related**: cosine similarity over embeddings with tag boost; display above threshold.

## 🔐 Security

- Password hashing with a modern KDF.
- JWT expiration & refresh strategy; revoke on pw change/ban.
- Input validation/sanitization, CORS, and rate limiting.
- Audit logs for all admin actions.

## 🧪 Testing

- Suggested: Jest + supertest for backend; React Testing Library + Vitest for frontend.
- CI: run tests & lint on PRs; enforce coverage thresholds.

## ♿ Accessibility

- Keyboard navigation, visible focus states, ARIA labels.
- Contrast-checked dark theme; semantic headings/landmarks.

## 📦 Deployment

- Provide environment variables for prod.
- Serve the built frontend via a static host or from Express.
- Consider PM2/Docker for process management; enable HTTPS and secure cookies.

## 🤝 Contributing

Contributions are welcome! Please open an issue or PR with a clear description, screenshots (if UI), and tests where applicable.

## 📜 License

MIT (or choose your preferred license).

## 🗺️ Roadmap (Ideas)

- In-app AI summarization for insights
- Richer bulk admin UI
- Auto-unban after duration
- Advanced search operators and filters

---

**Copy Insight Link** and **Admin Work Log**/**Admin Log Search** are documented features; ensure they’re enabled in the UI and RBAC where applicable.


## 🌐 Production Deployment (Render + Netlify)

### Backend on Render – Environment
For security, environment variables are **not listed inline**. Use the example file and Render's dashboard to set them:
- See `.env.server.production.example` in this repo (placeholders only; do not commit real secrets).


### Frontend on Netlify – Build Env (Vite)
Only **`VITE_*`** variables should be exposed client-side. Use the example file for reference and set them in Netlify's UI:
- See `.env.netlify.example` (no secrets).


### Render Service
- Start command: `node server.js` (or your start script)
- Health check path: `/health` (optional)
- Enforce HTTPS

### Example Local Dev
```
MONGO_URI=mongodb://localhost:27017/knowsphere
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
CORS_ORIGINS=http://localhost:5173
```


> **Note on testing/CI**: If you haven't set up tests yet, that's fine. You can add Jest + supertest (backend) and React Testing Library + Vitest (frontend) later. Keep ESLint/Prettier now to maintain code quality, and introduce CI when you're ready.


### Example Local `.env` (backend)
Use a local `.env` file with your own values. As a reference, copy from `.env.server.production.example` and adjust for local development. Ensure `.env` is listed in `.gitignore`.


## 🔧 Environment Variables (What They Do)

- `PORT` – Backend port (Render can override; keep default `5000`).
- `MONGO_URI` – MongoDB connection string (use MongoDB Atlas in prod).
- `JWT_SECRET` – Secret for signing JWTs (use a long random string in prod).
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` – Cloudinary credentials for media.
- `HUGGINGFACE_API_KEY` – Token for embedding/tagging calls.
- `CORS_ORIGINS` – Comma-separated allowed origins for the API (include Netlify site & Render API).
- `RESEND_API_KEY` – For sending emails (optional).
- `FROM_EMAIL` – From-address for outgoing email.
- `APP_BASE_URL` – Public URL of the frontend (used in auth/email links).
- `ENABLE_FORGOT_PASSWORD` – Toggle forgot-password flows.
- **Frontend (Netlify)** uses only `VITE_*` vars; everything else stays on the server.

## 🔒 Environment & Secrets Policy

- **Do not commit secrets** (.env files) to Git. Use example files with placeholders (e.g., `.env.server.production.example`, `.env.netlify.example`).
- Store production secrets in your platform's **Secrets/Environment** settings (Render/Netlify).
- Only client-safe variables (prefixed with **VITE_**) should appear in the frontend build environment.
- Rotate credentials if you suspect exposure and audit access regularly.
