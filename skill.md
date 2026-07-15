# JENEUS HelpDesk — ITSM Web App Build Instructions

## Overview

Build **JENEUS HelpDesk**, a full-stack ITSM ticketing web application for **JENEUS CO LTD**. The platform manages client-reported issues using an ITIL-inspired workflow: every issue begins as an **Incident**, and recurring incidents can be promoted to **Problems** for root-cause analysis.

The build should follow clean architecture, use reusable components, include documentation, and be structured for long-term maintainability.

---

## 1. Technical Stack

> Default source: `claude.md`

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Routing | React Router v6 |
| Server state | TanStack Query (React Query v5) |
| Client/UI state | Zustand |
| Forms & validation | React Hook Form + Zod |
| Rich text editor | TipTap |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Component library | shadcn/ui |
| Date utilities | date-fns |
| File upload | react-dropzone |
| Real-time | socket.io-client |

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js (or Fastify) |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache / session store | Redis |
| Job queue | BullMQ |
| Real-time | Socket.io |
| Email | Nodemailer (SMTP) |
| File storage | AWS S3 (or Cloudflare R2 / MinIO) |
| Auth | JWT (`jsonwebtoken`) |
| Password hashing | bcrypt |
| Validation | Zod |

### Infrastructure

- Docker + Docker Compose (PostgreSQL + Redis + App containers)
- HTTPS enforced in production (TLS termination at reverse proxy)
- Environment variable templates (`.env.example`)

---

## 2. User Roles & Permissions

> Default source: `claude.md` / `deepseek.md`

### 2.1 Role Definitions

| Role | Description |
|------|-------------|
| **Super Admin** | JENEUS system owner — full access to all features, settings, billing |
| **Admin** | Department head / IT manager — manage users, clients, SLAs, reports |
| **Team Lead** | Senior agent / supervisor — all agent rights + team reports + reassignment |
| **Agent** | Support technician — create, assign, update, resolve tickets |
| **Client** | External client contact — submit tickets, view own tickets, add comments |

### 2.2 Permission Matrix

| Feature | Super Admin | Admin | Team Lead | Agent | Client |
|---------|:-----------:|:-----:|:---------:|:-----:|:------:|
| Create ticket | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all tickets | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ (own only) |
| Assign ticket | ✅ | ✅ | ✅ | ❌ | ❌ |
| Escalate to Problem | ✅ | ✅ | ✅ | ✅ | ❌ |
| Close ticket | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configure SLAs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage clients | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 3. Core Data Models

> Default source: `claude.md`

### 3.1 User (Staff)

```
User {
  id: UUID (PK)
  first_name: string
  last_name: string
  email: string (unique)
  password_hash: string
  role: enum ['super_admin', 'admin', 'team_lead', 'agent']
  team_id: FK → Team (nullable)
  avatar_url: string (nullable)
  is_active: boolean
  last_login_at: datetime
  created_at: datetime
  updated_at: datetime
  deleted_at: datetime (nullable, soft delete)
}
```

### 3.2 Client (Company)

```
Client {
  id: UUID (PK)
  name: string
  industry: string (nullable)
  contract_tier: enum ['basic', 'standard', 'premium', 'enterprise']
  sla_policy_id: FK → SLAPolicy (nullable)
  primary_contact_id: FK → ClientContact (nullable)
  account_manager_id: FK → User (nullable)
  is_active: boolean
  logo_url: string (nullable)
  created_at: datetime
  updated_at: datetime
  deleted_at: datetime (nullable)
}
```

### 3.3 ClientContact

```
ClientContact {
  id: UUID (PK)
  client_id: FK → Client
  first_name: string
  last_name: string
  email: string (unique)
  phone: string (nullable)
  role: string (job title at client company)
  is_primary: boolean
  portal_access: boolean
  created_at: datetime
  updated_at: datetime
}
```

### 3.4 Team

```
Team {
  id: UUID (PK)
  name: string (e.g., "Network Support", "Software Team")
  lead_id: FK → User (nullable)
  description: string (nullable)
  created_at: datetime
  updated_at: datetime
}
```

### 3.5 Ticket (Incident or Problem)

```
Ticket {
  id: UUID (PK)
  ticket_number: string (unique, auto-generated: INC-XXXXX or PRB-XXXXX)
  type: enum ['incident', 'problem']
  title: string
  description: text
  status: enum ['open', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled']
  priority: enum ['critical', 'high', 'medium', 'low']
  category_id: FK → Category
  subcategory_id: FK → Subcategory (nullable)
  client_id: FK → Client
  contact_id: FK → ClientContact (who reported it)
  assigned_agent_id: FK → User (nullable)
  assigned_team_id: FK → Team (nullable)
  created_by: FK → User
  parent_problem_id: FK → Ticket (nullable, links incident to a Problem)
  sla_policy_id: FK → SLAPolicy (nullable)
  sla_breach: boolean (default: false)
  response_due_at: datetime (nullable)
  resolution_due_at: datetime (nullable)
  first_response_at: datetime (nullable)
  resolved_at: datetime (nullable)
  closed_at: datetime (nullable)
  recurrence_count: integer (default: 0, auto-incremented)
  tags: string[] (or text[] in PostgreSQL)
  source: enum ['portal', 'email', 'phone'] (nullable)
  created_at: datetime
  updated_at: datetime
  deleted_at: datetime (nullable, soft delete)
}
```

### 3.6 Category & Subcategory

```
Category {
  id: UUID (PK)
  name: string (e.g., "Network", "Software", "Hardware", "Access & Security")
  icon: string (nullable)
  default_team_id: FK → Team (nullable, auto-route tickets)
  created_at: datetime
}

Subcategory {
  id: UUID (PK)
  category_id: FK → Category
  name: string
  created_at: datetime
}
```

### 3.7 SLA Policy

```
SLAPolicy {
  id: UUID (PK)
  name: string (e.g., "Premium SLA", "Basic SLA")
  description: string (nullable)
  rules: jsonb (array of { priority, response_time_hours, resolution_time_hours })
  business_hours_only: boolean (default: false)
  business_hours: jsonb (nullable, day-of-week → open/close time)
  created_at: datetime
  updated_at: datetime
}
```

### 3.8 Comment / Activity Log

```
Comment {
  id: UUID (PK)
  ticket_id: FK → Ticket
  author_id: UUID
  author_type: enum ['staff', 'client']
  body: text
  is_internal: boolean (internal notes hidden from client)
  created_at: datetime
}

ActivityLog {
  id: UUID (PK)
  ticket_id: FK → Ticket
  actor_id: UUID
  actor_type: enum ['staff', 'client', 'system']
  action: string (e.g., "status_changed", "assigned_to", "escalated_to_problem")
  old_value: string (nullable)
  new_value: string (nullable)
  created_at: datetime
}
```

### 3.9 Attachment

```
Attachment {
  id: UUID (PK)
  ticket_id: FK → Ticket
  comment_id: FK → Comment (nullable)
  filename: string
  file_url: string (S3 path or URL)
  file_size: integer (bytes)
  mime_type: string
  uploaded_by: UUID
  created_at: datetime
}
```

### 3.10 Notification

```
Notification {
  id: UUID (PK)
  recipient_id: UUID
  recipient_type: enum ['staff', 'client']
  ticket_id: FK → Ticket (nullable)
  type: enum ['ticket_created', 'ticket_assigned', 'comment_added',
              'status_changed', 'sla_warning', 'sla_breached', 'escalated']
  message: string
  is_read: boolean (default: false)
  sent_via: enum ['in_app', 'email', 'both']
  created_at: datetime
}
```

### 3.11 KnowledgeArticle

```
KnowledgeArticle {
  id: UUID (PK)
  title: string
  body: text (rich text)
  category_id: FK → Category (nullable)
  tags: string[]
  view_count: integer (default: 0)
  helpful_count: integer (default: 0)
  not_helpful_count: integer (default: 0)
  is_published: boolean (default: false)
  created_by: FK → User
  created_at: datetime
  updated_at: datetime
}
```

### 3.12 CustomerFeedback

```
CustomerFeedback {
  id: UUID (PK)
  ticket_id: FK → Ticket
  client_contact_id: FK → ClientContact
  rating: integer (1-5)
  comment: text (nullable)
  created_at: datetime
}
```

### Database Indexes

- Index on: `ticket.client_id`, `ticket.assigned_agent_id`, `ticket.status`, `ticket.type`, `ticket.created_at`, `ticket.category_id`, `ticket.parent_problem_id`
- Full-text search index on: `ticket.title`, `ticket.description` (PostgreSQL `tsvector`)
- Use PostgreSQL enums for status, priority, role, type fields
- Use **soft deletes** (`deleted_at` timestamp) on tickets, clients, users — never hard delete

---

## 4. API Design

> Default source: `claude.md`

RESTful API at base path `/api/v1`. All list endpoints support:
`?page=1&limit=25&sort=created_at&order=desc` plus relevant filter query params.

### 4.1 Authentication

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
```

### 4.2 Tickets

```
GET    /api/v1/tickets              (list + filter + sort + pagination)
POST   /api/v1/tickets
GET    /api/v1/tickets/:id
PATCH  /api/v1/tickets/:id
DELETE /api/v1/tickets/:id          (admin only, soft delete)
POST   /api/v1/tickets/:id/escalate
POST   /api/v1/tickets/:id/link-problem
GET    /api/v1/tickets/:id/comments
POST   /api/v1/tickets/:id/comments
GET    /api/v1/tickets/:id/activity
POST   /api/v1/tickets/:id/attachments
```

### 4.3 Clients

```
GET    /api/v1/clients
POST   /api/v1/clients
GET    /api/v1/clients/:id
PATCH  /api/v1/clients/:id
GET    /api/v1/clients/:id/tickets
GET    /api/v1/clients/:id/contacts
POST   /api/v1/clients/:id/contacts
```

### 4.4 Users

```
GET    /api/v1/users
POST   /api/v1/users/invite
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

### 4.5 Teams

```
GET    /api/v1/teams
POST   /api/v1/teams
PATCH  /api/v1/teams/:id
```

### 4.6 Categories

```
GET    /api/v1/categories
POST   /api/v1/categories
PATCH  /api/v1/categories/:id
GET    /api/v1/categories/:id/subcategories
POST   /api/v1/categories/:id/subcategories
```

### 4.7 SLA

```
GET    /api/v1/sla-policies
POST   /api/v1/sla-policies
PATCH  /api/v1/sla-policies/:id
```

### 4.8 Dashboard

```
GET    /api/v1/dashboard/summary    (overall stats for admin/manager)
GET    /api/v1/dashboard/agent      (agent-specific stats)
```

### 4.9 Reports

```
GET    /api/v1/reports/sla          (SLA Compliance Report)
GET    /api/v1/reports/volume       (Ticket Volume Report)
GET    /api/v1/reports/agents       (Agent Performance Report)
GET    /api/v1/reports/problems     (Problem Frequency Report)
```

### 4.10 Knowledge Base

```
GET    /api/v1/kb/articles
POST   /api/v1/kb/articles
GET    /api/v1/kb/articles/:id
PATCH  /api/v1/kb/articles/:id
```

### 4.11 Notifications

```
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
```

### 4.12 Client Portal (separate auth)

```
POST   /api/v1/portal/auth/login
GET    /api/v1/portal/tickets
POST   /api/v1/portal/tickets
GET    /api/v1/portal/tickets/:id
POST   /api/v1/portal/tickets/:id/comments
PATCH  /api/v1/portal/tickets/:id/reopen
PATCH  /api/v1/portal/tickets/:id/confirm-resolved
```

### 4.13 Search

```
GET    /api/v1/search?q=keyword     (full-text search across tickets, clients, comments)
```

---

## 5. Authentication & Security

> Default source: `claude.md`

- **Email + password login** with bcrypt hashing (cost factor 12)
- **JWT sessions** with refresh tokens (access token: 15 min, refresh: 7 days)
- **Client Portal Login**: separate login at `/portal` route — clients see only their company's tickets (strict tenant isolation)
- **Forgot Password** flow via email reset link (expires in 1 hour)
- **2FA (TOTP)** optional, toggleable per user by Admin
- **RBAC** enforced both client-side and server-side on every protected endpoint
- HTTP-only cookies for refresh token storage
- CSRF Protection
- Rate limiting on auth endpoints (max 10 attempts per 15 min per IP)
- Input validation via Zod on every write endpoint
- XSS protection via content sanitization on rich text (DOMPurify client-side, sanitize-html server-side)
- CORS configured to allow only the frontend origin
- File uploads: validate MIME type server-side, enforce size limits (max 10 files, 25MB each)
- Passwords: min 8 characters
- HTTPS enforced in production
- Every ticket mutation recorded in ActivityLog (audit trail)

---

## 6. Core Feature Specifications

> Default source: `claude.md` / `deepseek.md`

### 6.1 Ticket Management

#### Creating a Ticket

Fields on the creation form:
- **Type** (Incident / Problem) — defaults to Incident
- **Title** (required)
- **Description** (rich text with bold, lists, code blocks via TipTap)
- **Client** (searchable dropdown — staff only; auto-filled for client portal)
- **Contact** (filtered by selected client)
- **Category** (required) → auto-loads subcategories
- **Subcategory** (optional)
- **Priority** (required: Critical / High / Medium / Low)
- **Attachments** (drag-and-drop, max 10 files, 25MB each)
- **Tags** (free-form, comma-separated)
- **Assign to agent/team** (optional at creation, auto-routed by category rule)

On submission:
- Ticket number auto-generated (INC-XXXXX or PRB-XXXXX)
- SLA deadlines calculated based on client's SLA policy + priority
- Notification sent to assigned agent + client contact

#### Ticket Detail View

Shows:
- Header: ticket number, type badge, status badge, priority badge
- Title and description (editable by agent/admin)
- SLA countdown timer (turns red at risk, flashes if breached)
- Client info panel (name, contact, contract tier)
- Assignment panel (agent, team — reassignable)
- Timeline / Activity feed (chronological: comments + system events)
- Comment box with toggle: **Public Reply** vs **Internal Note** (staff only)
- Linked Incidents panel (if viewing a Problem)
- Related Problem banner (if Incident linked to a Problem)
- Attachment gallery

#### Ticket Status Flow

```
Open → In Progress → Pending (waiting on client/third party) → Resolved → Closed
                                                         ↘ Re-Opened → In Progress
```

Rules:
- Only agents/team leads/admins can change status
- **Pending** requires a reason note (auto-pauses SLA clock)
- **Resolved** triggers email to client contact asking for confirmation
- Client can re-open a resolved ticket within 5 days (configurable)
- **Closed** is final and locks the ticket (no further edits)
- **Cancelled** only available to admins (mistake/duplicate tickets)

#### Priority & Escalation

- Priority changeable by agents+ with a mandatory reason
- **SLA Warning**: email + in-app notification when 30% of SLA time remains
- **SLA Breach**: notification to agent, team lead, and admin when deadline missed
- Manual escalation button — promotes ticket to higher priority with a log entry

### 6.2 Incident → Problem Escalation (Signature Workflow)

#### Auto-Detection of Recurrence

The system monitors for recurring incidents:
- **Same client + same category/subcategory + resolved in last 30 days**: if 3+ such incidents exist → system flags them
- A banner appears on the latest incident: *"⚠ This appears to be a recurring issue (3 similar incidents in 30 days). Consider escalating to a Problem."*
- The `recurrence_count` field on each ticket auto-increments
- Background job runs every hour to detect patterns

#### Manual Escalation

Any agent or team lead can escalate:
1. Click **"Escalate to Problem"** button on an incident
2. Modal opens: **Create new Problem** or **Link to existing Problem**
3. If creating new Problem: pre-fills title, category, client; agent adds root cause; Problem ticket created (PRB-XXXXX); original incident linked as child
4. If linking to existing Problem: search/select existing Problem; incident linked as child

#### Problem Ticket Behavior

- Shows all linked incidents in a "Related Incidents" panel
- Closing a Problem can optionally bulk-resolve all linked open incidents
- Problems have their own SLA (longer resolution windows)
- Problems have "Root Cause" and "Workaround" fields (rich text)

### 6.3 Client Portal

Clients access a simplified interface at `/portal`:

**Portal features:**
- Submit a new ticket (limited fields: title, description, category, attachments)
- View list of their company's tickets with status filters
- View ticket detail and timeline (public comments only)
- Add public replies to their tickets
- Receive email notifications on status changes and public replies
- See SLA deadline as a plain due date
- Mark resolved ticket as confirmed or re-open it

**Portal restrictions:**
- Cannot change priority, assign agents, or access analytics
- Only sees their own company's tickets (strict tenant isolation)
- Cannot see other client companies

### 6.4 Search & Filtering

**Global search** (top navbar):
- Search across: ticket number, title, description, client name, tags
- Results grouped by type (Incidents, Problems)
- Deep-link to ticket from results

**Ticket list filters:**
- Status (multi-select), Type (Incident/Problem), Priority (multi-select)
- Assigned agent / team, Client (multi-select)
- Category / Subcategory
- Date range (created, updated, resolved)
- SLA status (on track / at risk / breached)
- Tags

**Saved filters:** agents and team leads can save filter presets ("My Critical Open Tickets")

### 6.5 Dashboard & Analytics

#### Agent Dashboard

- **My Tickets** widget: count by status (open, in progress, pending)
- **SLA at Risk** widget: tickets where SLA deadline is within 20% of time
- **Recent Activity** feed: latest updates on my tickets
- **Quick Create** button

#### Management Dashboard (Admin / Team Lead)

- Open Tickets by Priority — bar chart
- Tickets by Status — donut chart
- SLA Compliance Rate — % resolved within SLA this month
- Top Clients by Ticket Volume — ranked list
- Recurring Issue Heatmap — category × frequency matrix
- Agent Workload — agent name | open tickets | avg resolution time | SLA breach count
- Incident to Problem Ratio — line chart over time
- First Response Time Average — by priority
- Resolution Time Average — by category

All charts filterable by: date range, client, team, category.

### 6.6 Reports (Admin only)

Exportable reports: **PDF** and **CSV**:
- SLA Compliance Report (by client, by period)
- Ticket Volume Report (by category, by agent, by client)
- Problem Frequency Report (recurring issues)
- Agent Performance Report

### 6.7 Notifications

#### In-App
- Bell icon in navbar with unread count badge
- Dropdown shows last 20 notifications with timestamps
- Click navigates to relevant ticket

#### Email (configurable per event per role)

| Event | Notified Parties |
|-------|-----------------|
| New ticket created | Assigned agent, client contact (confirmation) |
| Ticket assigned | Newly assigned agent |
| New public comment | Client contact, assigned agent |
| New internal note | Assigned agent, team lead |
| Status changed | Client contact (on resolve/close), assigned agent |
| SLA warning (30% left) | Assigned agent, team lead |
| SLA breach | Assigned agent, team lead, admin |
| Escalated to Problem | Admin, team lead |
| Ticket re-opened | Assigned agent |

#### Real-Time Events (Socket.io)

Events pushed to connected clients:
```
ticket:created         → broadcast to assigned agent + team lead
ticket:updated         → broadcast to all viewers of that ticket
ticket:comment_added   → broadcast to all viewers
ticket:status_changed  → broadcast to all viewers + client portal if public
ticket:assigned        → send to newly assigned agent
sla:warning            → send to assigned agent + team lead
sla:breached           → send to agent + team lead + admin
notification:new       → send to specific user (in-app bell)
```

### 6.8 Knowledge Base (Internal)

- Articles organized by category
- Rich text editor for content (TipTap)
- Agents can link a KB article to a ticket (shows in ticket sidebar)
- Searchable from within a ticket as "Suggested articles"
- Articles track view count and "Was this helpful?" rating
- Admin-only: publish / unpublish / archive articles

### 6.9 SLA Management (Admin)

- Create named SLA policies ("Enterprise 24/7", "Standard Business Hours")
- Define response time and resolution time per priority level
- Toggle business hours only mode (define hours per day + timezone)
- Assign SLA policy to a client
- SLA clock auto-pauses when ticket is in "Pending" status
- Override SLA on a per-ticket basis (with mandatory reason logged)

### 6.10 Background Jobs (BullMQ)

- **SLA Check Job**: runs every 5 minutes — scans all open/in-progress tickets, fires warning/breach events
- **Recurrence Detection Job**: runs every hour — checks for recurring incident patterns, sets recurrence flags
- **Email Queue**: processes queued notification emails (non-blocking)
- **Report Generation**: on-demand PDF export jobs run in background, notify when ready

### 6.11 Settings & Configuration (Admin)

- **General:** company name, logo, timezone, default language
- **Users:** invite users by email, assign roles, deactivate accounts
- **Teams:** create teams, assign agents, set team leads
- **Clients:** add/edit clients, manage contacts, assign SLA
- **Categories:** manage categories and subcategories, set auto-routing rules
- **SLA Policies:** create and manage SLA tiers
- **Email:** SMTP configuration, notification template customization
- **Ticket Settings:** recurrence detection window (default 30 days), threshold (default 3), re-open window (default 5 days)
- **Portal Settings:** enable/disable client portal, customize portal branding

---

## 7. Non-Functional Requirements

> Default source: `claude.md` / `deepseek.md`

| Requirement | Target |
|-------------|--------|
| Page load time | < 2 seconds (LCP) |
| API response time (p95) | < 300ms for list endpoints |
| Uptime | 99.5% monthly |
| Concurrent users | 100+ simultaneous users |
| File storage | Up to 10GB (S3 or equivalent) |
| Email delivery | < 2 min for SLA alerts |
| Accessibility | WCAG 2.1 AA for core flows |
| Browser support | Chrome, Firefox, Edge, Safari (last 2 versions) |

---

## 8. Out of Scope (v1)

The following are explicitly deferred:
- Live chat widget on client portal
- Mobile native app (iOS/Android)
- AI-powered ticket categorization or auto-assignment
- Billing and invoice management
- Multi-language / i18n support
- Webhooks for third-party integrations (Slack, Teams, Jira)
- Asset / CMDB management
- Change Management module
- Canned responses / templates

---

## 9. Build Order (Milestones)

> Default source: `claude.md`

Build sequentially in this order:

1. **Foundation** — DB schema (Prisma), auth system (login, JWT, RBAC), user management
2. **Core Tickets** — create, view, list, update, status flow, comments, activity log
3. **Client & SLA** — client management, SLA policies, SLA timer engine, background SLA job
4. **Incident → Problem** — recurrence detection, escalation workflow, problem linking
5. **Notifications** — in-app bell, email notifications, real-time socket events
6. **Dashboard & Analytics** — agent dashboard, management dashboard, charts (Recharts)
7. **Client Portal** — portal auth, portal ticket views, portal comments
8. **Knowledge Base** — articles CRUD, ticket linking, helpfulness rating
9. **Reports** — export PDF/CSV reports
10. **Settings** — category management, team management, configuration pages
11. **Polish** — search, bulk actions, saved filters, keyboard shortcuts, responsive polish

---

## 10. Environment Variables

```env
# App
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jeneus_helpdesk

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<generate 64-char random string>
JWT_REFRESH_SECRET=<generate 64-char random string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@jeneusco.com
SMTP_PASS=<email password>
EMAIL_FROM="JENEUS HelpDesk <noreply@jeneusco.com>"

# File Storage (S3 or Cloudflare R2)
S3_BUCKET=jeneus-helpdesk-attachments
S3_REGION=us-east-1
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>
S3_ENDPOINT=<optional, for R2 or MinIO>

# App Config
SLA_CHECK_INTERVAL_MINUTES=5
RECURRENCE_WINDOW_DAYS=30
RECURRENCE_THRESHOLD=3
TICKET_REOPEN_WINDOW_DAYS=5
```

---

## 11. Application Routes

### Staff Application

```
/login                          → Login page
/forgot-password                → Password reset request
/reset-password/:token          → Password reset form

/dashboard                      → Role-appropriate dashboard (default home)
/tickets                        → All tickets list
/tickets/new                    → Create ticket form
/tickets/:id                    → Ticket detail
/tickets/:id/edit               → Edit ticket

/problems                       → All problem tickets list
/problems/new                   → Create problem form
/problems/:id                   → Problem detail

/clients                        → Client list
/clients/new                    → Add client
/clients/:id                    → Client detail + ticket history

/knowledge-base                 → KB article list
/knowledge-base/new             → Create article
/knowledge-base/:id             → Article detail

/reports                        → Reports page
/reports/sla                    → SLA Compliance Report
/reports/volume                 → Ticket Volume Report
/reports/agents                 → Agent Performance Report

/settings                       → Settings hub
/settings/general               → General settings
/settings/users                 → User management
/settings/teams                 → Team management
/settings/clients               → Client management
/settings/categories            → Category management
/settings/sla                   → SLA policy management
/settings/email                 → Email & notification settings
/settings/portal                → Portal settings

/profile                        → My profile (all users)
/notifications                  → All notifications
```

### Client Portal

```
/portal                         → Portal login
/portal/dashboard               → My tickets overview
/portal/tickets/new             → Submit new ticket
/portal/tickets/:id             → Ticket detail (read + comment)
/portal/profile                 → My contact profile
```

---

## 12. Deliverables

The generated project must include:

- Complete Express.js + TypeScript backend
- Complete React + TypeScript frontend (Vite)
- PostgreSQL schema (Prisma migrations)
- REST API at `/api/v1`
- JWT authentication system with refresh tokens
- Role-based permission enforcement (client + server)
- Ticket management (create, view, update, status flow, comments, attachments)
- Incident ↔ Problem escalation workflow with recurrence detection
- Client management, SLA policies, and SLA timer engine
- Notification system (in-app + email + real-time socket events)
- Dashboard with charts (agent + management views)
- Client portal with strict tenant isolation
- Knowledge base with article management
- Reports (PDF/CSV export)
- Settings pages for all configuration
- Global search with full-text search
- Docker + Docker Compose configuration
- `.env.example` file
- `package.json` with all dependencies
- API documentation
- Deployment guide
- Testing suite (unit + integration)
- Seed data
- README.md
