# JENEUS HelpDesk — ITSM Ticketing System

JENEUS HelpDesk is a production-ready, full-stack IT Service Management (ITSM) ticketing system built for managed service providers and internal IT teams. It supports the full incident-to-problem lifecycle with SLA enforcement, real-time notifications, client portal access, knowledge base, and role-based access control across five permission tiers.

---

## 🏗️ Architecture & Tech Stack

```
                          +----------------------------------------+
                          |          User Browser / Client         |
                          +----------------------------------------+
                                            |
                            (HTTPS / JWT Bearer / httpOnly Cookie)
                                            v
                          +----------------------------------------+
                          |    React SPA (Vite + Tailwind CSS)     |
                          |   shadcn/ui · TanStack Query · Zustand |
                          +----------------------------------------+
                                            |
                                    (REST JSON API + Socket.io)
                                            v
                          +----------------------------------------+
                          |   Express + TypeScript Backend (API)   |
                          |  JWT Auth · RBAC · BullMQ · Socket.io  |
                          +----------------------------------------+
                           /                 |                   \
                          /                  |                    \
                         v                   v                     v
           +------------------+   +-------------------+   +---------------------+
           | PostgreSQL 16    |   |   Redis 7 Cache   |   |  BullMQ Background  |
           | (Prisma ORM)     |   | & BullMQ Broker   |   |  Jobs (SLA, Email)  |
           +------------------+   +-------------------+   +---------------------+
```

### Backend (Node.js / TypeScript)
- **Express 4** — RESTful HTTP API with middleware pipeline
- **Prisma ORM** — Type-safe PostgreSQL client with snake_case mapping
- **JWT Authentication** — 15-minute access tokens + 7-day refresh tokens (httpOnly cookies)
- **RBAC** — 5 roles: `super_admin`, `admin`, `team_lead`, `agent`, `client`
- **BullMQ** — Redis-backed background job queues for SLA checks and email delivery
- **Socket.io** — Real-time events: ticket updates, notifications, and room-per-user
- **Zod** — Request validation schemas with typed inference
- **Nodemailer** — HTML email templates for notifications

### Frontend (React / TypeScript)
- **Vite** — Fast HMR development server and production builds
- **Tailwind CSS v3** — Linear.app-inspired dark theme design system
- **shadcn/ui** — Accessible, headless UI component library (19 components)
- **TanStack Query** — Server state, caching, and optimistic updates
- **Zustand** — Lightweight client state management (auth, UI)
- **React Router v6** — Protected routes, role guards, portal routes
- **React Hook Form + Zod** — Form validation with schema inference
- **Recharts** — Dashboard charts (ticket volume, SLA compliance)
- **Socket.io Client** — Real-time notification bell and ticket updates

---

## ✨ Features

### Ticket Management
- Full CRUD with auto-generated ticket numbers (`INC-00001`, `PRB-00001`)
- 6-status workflow: Open → In Progress → Pending → Resolved → Closed (+ Cancelled)
- 4 priority levels: Critical, High, Medium, Low
- SLA deadline countdown with warning (30%) and breach notifications
- Comments (public/internal), file attachments, activity timeline
- Full-text search across title, description, and ticket number
- Multi-dimensional filtering: status, priority, category, agent, client, date range

### Incident → Problem Escalation
- Auto-detection of recurring incidents (3+ similar tickets in 30-day window)
- Manual escalation with problem linkage
- Parent-child relationship: problems own their child incidents
- Recurrence counter tracks incident frequency

### Client Management
- Company records with contract tiers (Basic, Standard, Premium, Enterprise)
- Multiple contacts per client with primary contact designation
- Contract-based SLA policy assignment
- Client portal with tenant-isolated ticket views

### Knowledge Base
- Rich-text articles organized by category
- Tag-based search and filtering
- Helpfulness voting (helpful / not helpful counters)
- Role-based publishing (visible/published only for staff)

### Dashboard & Analytics
- **Agent Dashboard** — My tickets, SLA at-risk widget, recent activity feed
- **Management Dashboard** — Ticket volume chart (Recharts bar), SLA compliance pie chart, team workload table
- **Reports Module** — SLA compliance, ticket volume trends, agent performance, problem frequency

### Notifications & Real-Time
- In-app notifications via Socket.io (populated bell icon)
- Email notifications (Nodemailer + HTML templates)
- Event types: ticket created, assigned, comment added, status changed, SLA warning, SLA breached, escalated
- Sent-via routing: in-app only, email only, or both

### Client Portal
- Separate JWT-authenticated login for client contacts
- Ticket submission with category and priority selection
- Ticket detail with timeline, public comments, and re-open/confirm resolve
- Client-scoped data isolation (clients see only their own tickets)

### Security
- Argon2id / bcrypt password hashing
- JWT refresh rotation with httpOnly cookies
- Role-based access control enforced server-side (middleware) and client-side (route guards)
- Input validation via Zod schemas
- Soft deletes on all major entities (users, tickets, clients)
- Rate limiting, CORS, Helmet headers

---

## 📁 Directory Structure

```text
jeneus-helpdesk/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 14 models, 11 enums, snake_case mapping
│   │   └── seed.ts                # Demo data seeder (1214 lines)
│   └── src/
│       ├── config/                # Environment config loader
│       ├── controllers/           # 11 route handlers (auth, tickets, clients, ...)
│       ├── jobs/                  # BullMQ queue definitions + processors
│       ├── lib/                   # Prisma client singleton
│       ├── middleware/            # Auth, RBAC, error handler, validation
│       ├── routes/                # 12 route modules → index.ts aggregator
│       ├── services/              # Business logic (ticket service, SLA calc)
│       ├── socket/                # Socket.io setup + auth
│       ├── utils/                 # AppError utility
│       ├── validators/            # Zod schemas for request validation
│       └── server.ts              # Express app entry point
├── frontend/
│   ├── public/                    # Static assets (logo, favicon)
│   └── src/
│       ├── components/
│       │   ├── layout/            # AppLayout, Sidebar, Navbar, NotificationBell
│       │   └── ui/                # 19 shadcn/ui components (button, card, dialog, ...)
│       ├── hooks/                 # TanStack Query hooks (useTickets, useClients, ...)
│       ├── lib/                   # Axios client, API functions, cn() utility
│       ├── pages/
│       │   ├── auth/              # Login, ForgotPassword, ResetPassword
│       │   ├── clients/           # ClientList, ClientDetail
│       │   ├── dashboard/         # DashboardPage, AgentDashboard, ManagementDashboard
│       │   ├── knowledge-base/    # KBList, KBArticle
│       │   ├── portal/            # PortalLogin, Dashboard, CreateTicket, TicketDetail
│       │   ├── reports/           # ReportsPage (SLA, Volume, Agents, Problems)
│       │   ├── settings/          # SettingsPage (8 config sections)
│       │   └── tickets/           # TicketList, TicketDetail, CreateTicket, EditTicket
│       ├── stores/                # Zustand stores (auth, UI)
│       ├── types/                 # TypeScript type definitions
│       ├── App.tsx                # Root router with guards
│       ├── main.tsx               # React entry point
│       └── index.css              # Tailwind directives + custom scrollbar
├── docker-compose.yml             # 5 services: postgres, redis, backend, frontend, mailhog
├── Dockerfile                     # Multi-stage root build (backend + frontend)
└── package.json                   # Monorepo root package
```

---

## 💻 Local Development Setup

### Prerequisites
- Node.js v20+ / npm v10+
- PostgreSQL 16+ (or Docker Desktop)
- Redis 7+ (or Docker Desktop)

### 1. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in `backend/` (copy from `.env.example`):
   ```env
   NODE_ENV=development
   PORT=4000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jeneus_helpdesk?schema=public"
   REDIS_URL="redis://localhost:6379"
   JWT_ACCESS_SECRET=your-access-secret-key-here
   JWT_REFRESH_SECRET=your-refresh-secret-key-here
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_USER=
   SMTP_PASS=
   EMAIL_FROM="noreply@jeneusco.com"
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Push schema to database and generate Prisma client:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Seed the database** (populates demo data — 10 users, 3 clients, 19 tickets, SLA policies, KB articles, etc.):
   ```bash
   npx tsx prisma/seed.ts
   ```

6. **Start the backend development server:**
   ```bash
   npm run dev
   ```
   The API starts at `http://localhost:4000/api/v1`.

### 2. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in `frontend/`:
   ```env
   VITE_API_URL=http://localhost:4000/api/v1
   VITE_SOCKET_URL=http://localhost:4000
   ```

4. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   The app launches at `http://localhost:5173`.

---

## 🚀 Docker Deployment (Production)

```bash
# Clone and navigate
git clone https://github.com/mukombradon/JENEUS-HelpDesk-.git
cd JENEUS-HelpDesk-

# Create environment file
cp backend/.env.example .env
# Edit .env with production values (postgres/redis credentials, JWT secrets)

# Start all services
docker compose up -d

# Run database migration and seed
docker compose exec app npx prisma db push
docker compose exec app npx tsx prisma/seed.ts
```

Services:
| Service   | Port  |
|-----------|-------|
| Frontend  | 80    |
| Backend   | 4000  |
| PostgreSQL| 5432  |
| Redis     | 6379  |
| MailHog   | 8025  |

---

## 🧪 Seed Data

The included seed script (`backend/prisma/seed.ts`) creates:

| Entity            | Count | Details |
|-------------------|-------|---------|
| Teams             | 3     | Tier 1, Tier 2, Tier 3 support |
| Users             | 10    | Across all 4 staff roles |
| Clients           | 3     | Acme Corp, Globex Inc, Initech Ltd |
| Client Contacts   | 6     | 2 per client |
| Categories        | 6     | Account, Billing, Network, Email, Hardware, Software |
| Subcategories     | 24    | 4 per category |
| SLA Policies      | 2     | Standard (24h), Premium (4h) |
| Tickets           | 19    | 2 problems + 17 incidents |
| Comments          | 10    | Public and internal |
| Activity Logs     | 25    | Status changes, assignments, escalations |
| KB Articles       | 6     | Wi-Fi troubleshooting, password reset, etc. |
| Notifications     | 11    | Various event types |
| Customer Feedback | 5     | Ratings and comments |

**Default login credentials:**
| Role         | Email                       | Password    |
|--------------|-----------------------------|-------------|
| Super Admin  | `super_admin@jeneusco.com`  | `password123` |
| Admin        | `admin@jeneusco.com`        | `password123` |
| Team Lead    | `teamlead@jeneusco.com`     | `password123` |
| Agent        | `agent1@jeneusco.com`       | `password123` |
| Agent        | `agent2@jeneusco.com`       | `password123` |

---

## 🔌 API Endpoints

All routes are mounted under `/api/v1`.

| Module         | Prefix           | Key Endpoints |
|----------------|------------------|---------------|
| Auth           | `/auth`          | `POST /login`, `POST /refresh`, `POST /logout`, `POST /forgot-password`, `POST /reset-password/:token`, `GET /me` |
| Tickets        | `/tickets`       | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `POST /:id/escalate`, `POST /:id/link-problem` |
| Clients        | `/clients`       | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `GET /:id/contacts` |
| Users          | `/users`         | `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| Teams          | `/teams`         | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| Categories     | `/categories`    | `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`, `GET /:id/subcategories` |
| SLA Policies   | `/sla-policies`  | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| Dashboard      | `/dashboard`     | `GET /summary`, `GET /agent`, `GET /management` |
| Knowledge Base | `/kb/articles`   | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| Notifications  | `/notifications` | `GET /`, `PATCH /:id/read`, `POST /read-all` |
| Portal         | `/portal`        | `POST /login`, `GET /tickets`, `POST /tickets`, `GET /tickets/:id`, `PATCH /tickets/:id/confirm`, `PATCH /tickets/:id/reopen` |
| Reports        | `/reports`       | `GET /sla`, `GET /volume`, `GET /agents`, `GET /problems` |

---

## 🎨 Design System

The UI follows a Linear.app-inspired dark theme:

```text
Canvas (BG):    #010102
Surface 1:      #0b0b0d
Surface 2:      #111113
Surface 3:      #18181b
Hairline:       rgba(255,255,255,0.06)
Primary:        #5e6ad2
Ink (text):     #e1e1e1
Ink Dimmed:     #7f7f7f
Border Radius:  6px (sm), 10px (md), 14px (lg)
Shadows:        None (flat design)
```

Components are built on shadcn/ui (Radix primitives) with custom theme tokens.

---

## 📈 Future Enhancements

See [`future-enhancements.md`](future-enhancements.md) for the full post-v1 roadmap, including:

- **Quick Wins:** Satisfaction surveys, canned responses, @mentions, attachment previews, table/grid view toggle
- **Agent Productivity:** Collision detection, time tracking, Kanban board, ticket merging, auto-close
- **System Automation:** Email-to-ticket, configurable problem patterns, agent skills matrix, scheduled reports, automation rules engine
- **Module Expansion:** Asset/CMDB management, client KB access, threaded comments, live chat, billing
- **Long-Term:** Webhooks (Slack/Teams/Jira), AI-powered features, i18n, change management, mobile apps

---

*Built with Express · TypeScript · Prisma · React · Tailwind · shadcn/ui · Linear.app dark theme*
