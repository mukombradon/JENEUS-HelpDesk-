# JENEUS HelpDesk — Future Enhancements (Post-v1)

Features and functionalities collected from the product specs (`chatgpt.md`, `claude.md`, `deepseek.md`, `gemini.md`) that did **not** make it into the v1 build spec (`skill.md`) but remain useful candidates for future releases.

> **Note:** Items listed as "Out of Scope (v1)" in `skill.md` are included here with fuller description.

---

# Batch 1 — Quick Wins

**Theme:** Smallest effort, highest daily-value impact. These features leverage existing v1 infrastructure (models, jobs, libraries already in place) so they can be delivered quickly with minimal risk.

---

### 1. Satisfaction Surveys

**Source:** `chatgpt.md` (Reports), `deepseek.md` (Client Portal)
**Effort:** Small | **Dependency:** `CustomerFeedback` model already exists in v1 schema

A post-resolution survey sent to the client contact asking them to rate their support experience.

**Features:**
- **Automated trigger** — survey email sent when ticket status changes to "Resolved" or "Closed"
- **Rating scale** — 1-5 stars (or numeric) with optional open-ended comment
- **Dashboard widget** — average satisfaction score, trend line, response rate
- **Report** — Customer Satisfaction Report exportable to PDF/CSV
- **Follow-up** — reminder email if survey not completed within 48 hours

**Note:** The `CustomerFeedback` model already exists in v1 — this feature builds the survey flow around it.

---

### 2. Canned Responses / Templates

**Source:** `deepseek.md` (Agent Workspace)
**Effort:** Small–Medium | **Dependency:** None (new model + UI)

Pre-written reply templates that agents can insert into comments with one click. Speeds up common responses.

**Features:**
- Admin/Team Lead can create, edit, and organize canned responses
- Grouped by category (e.g., "Greetings", "Password Reset Instructions", "Escalation Notice")
- Shortcut keys or quick-insert button in the comment box
- Personal saved responses (per-agent) vs shared team responses

**Suggested Data Model:**
```
CannedResponse {
  id: UUID (PK)
  title: string
  body: text (rich text)
  category: string (nullable)
  is_shared: boolean (shared across team vs personal)
  created_by: FK → User
  created_at: datetime
  updated_at: datetime
}
```

---

### 3. Mentions (@username) in Comments

**Source:** `deepseek.md` (Agent Workspace)
**Effort:** Small | **Dependency:** Notification system already exists in v1

Allow agents to tag colleagues in comments and internal notes, triggering a targeted notification.

**Features:**
- Type `@` in the comment box to trigger an autocomplete dropdown of staff users
- Mentioned user receives an in-app + email notification: *"You were mentioned in ticket INC-00123"*
- Mentioned text is highlighted in the comment body
- Only staff users can be mentioned (not clients)

---

### 4. Attachment Preview & Inline Viewing

**Source:** `deepseek.md` (Ticket Detail View)
**Effort:** Small | **Dependency:** File storage already in place in v1

Preview images, PDFs, and other common file types directly in the ticket detail page without downloading.

**Features:**
- Thumbnail grid in the attachment gallery
- Click to open a lightbox/modal preview
- Supported types: images (PNG, JPG, GIF), PDF, plain text
- File type icons for unsupported formats

---

### 5. Table / Grid View Toggle & Column Customization

**Source:** `deepseek.md` (Ticket List View)
**Effort:** Small | **Dependency:** Ticket list already built in v1

Let agents personalise the ticket list layout.

**Features:**
- Toggle between table (rows) and grid (cards) view
- Show/hide columns in table view
- Column reorder by drag-and-drop
- Persist view preferences per user (localStorage or server-side saved views)

---

---

# Batch 2 — Agent Productivity

**Theme:** Directly improves the day-to-day workflow for agents and team leads. All items have their core infrastructure already present in v1 (Socket.io, BullMQ, existing models).

---

### 6. Collision Detection

**Source:** `deepseek.md` (Agent Workspace)
**Effort:** Small | **Dependency:** Socket.io already wired in v1

Warn agents when another user is viewing the same ticket, preventing conflicting simultaneous updates.

**Features:**
- When an agent opens a ticket detail page, the system broadcasts a "user viewing" event via Socket.io
- A small banner in the ticket header: *"👤 John (Agent) is also viewing this ticket"*
- List of current viewers in the ticket sidebar
- Auto-remove from viewers list on navigation away or disconnect

**Implementation Notes:**
- Use Socket.io rooms per ticket ID
- Track active viewers in Redis with a 30-second heartbeat/auto-expiry

---

### 7. Time Tracking Per Ticket

**Source:** `deepseek.md` (Agent Workspace), `chatgpt.md` (Ticket Management)
**Effort:** Medium | **Dependency:** None (new model + UI)

Allow agents to log time spent on each ticket. Useful for billing, agent performance reporting, and workload balancing.

**Features:**
- **Manual time entries** — agent clicks start/stop or enters duration manually
- **Running timer** — start/pause/resume from the ticket detail page
- **Time log** — visible in the ticket's activity feed
- **Total time per ticket** — aggregated and displayed in the ticket header
- **Time-based reporting** — average resolution time, agent billable hours

**Suggested Data Model:**
```
TimeEntry {
  id: UUID (PK)
  ticket_id: FK → Ticket
  agent_id: FK → User
  description: string (nullable, e.g., "Investigated network config")
  duration_minutes: integer
  started_at: datetime
  ended_at: datetime (nullable, null = still running)
  is_billable: boolean (default: false)
  created_at: datetime
}
```

---

### 8. Kanban Board View

**Source:** `deepseek.md` (Agent Workspace)
**Effort:** Medium | **Dependency:** Status workflow already built in v1

An alternative visual layout for the ticket list, organised as columns by status (Open → In Progress → Pending → Resolved). Agents can drag tickets between columns to change status.

**Features:**
- Toggle between table view and kanban board view
- Columns: Open, In Progress, Pending, Resolved, Closed
- Drag-and-drop to change status with optimistic UI update
- WIP (Work in Progress) limits per column (configurable)
- Filter by agent/priority within the board

---

### 9. Ticket Merging

**Source:** `deepseek.md` (Ticket Management)
**Effort:** Medium | **Dependency:** Soft-delete already in place in v1

Merge duplicate tickets into a single parent ticket, preserving all comments and activity from the children.

**Features:**
- Admin or Agent can select 2+ tickets and merge them
- One ticket designated as the "survivor" — it inherits all comments and attachments
- Merged tickets are soft-deleted and show a banner: *"This ticket was merged into INC-00123"*
- ActivityLog records the merge event

---

### 10. Auto-Close After Inactivity

**Source:** `deepseek.md` (Automation Rules)
**Effort:** Small | **Dependency:** BullMQ job system already exists in v1

Automatically close resolved tickets that have remained in "Resolved" status for a configurable number of days without the client re-opening them.

**Features:**
- Background job runs daily, checks resolved tickets past the threshold
- Sends a final notification before auto-closing (24-hour grace)
- Configurable threshold in Settings (default: 3 days)
- Logged in ActivityLog as "auto_closed"

---

---

# Batch 3 — System Automation

**Theme:** Reduces manual overhead by making the system smarter and more self-operating. These features expand on the v1 background job infrastructure and add new configuration layers.

---

### 11. Email-to-Ticket Integration

**Source:** `deepseek.md` (Ticket Management)
**Effort:** Medium | **Dependency:** Email parsing library

Allow clients to submit tickets by sending an email to a designated support address. The system parses the email and creates a ticket automatically.

**Features:**
- Dedicated inbound email address (e.g., `support@jeneusco.com`)
- Email parsing: subject → title, body → description, attachments → ticket attachments
- Auto-detect client by sender email address
- Replies to notification emails are appended as comments on the existing ticket
- Configurable per-client email addresses

---

### 12. Problem Patterns (Configurable Recurrence)

**Source:** `deepseek.md` (`problem_patterns` table)
**Effort:** Small | **Dependency:** Recurrence detection already exists in v1

A dedicated configuration table for defining what constitutes a recurring problem pattern, rather than using hard-coded logic.

**Features:**
- Admin defines named patterns (e.g., "VPN Outage", "Email Delivery Failure")
- Each pattern has: keywords for title matching, category filter, threshold count, auto-create flag
- Background job matches incidents against patterns instead of generic clustering
- Provides more accurate recurrence detection than keyword-free grouping

**Suggested Data Model:**
```
ProblemPattern {
  id: UUID (PK)
  name: string (e.g., "VPN Connectivity Issue")
  keywords: string[] (array of matching keywords)
  category_id: FK → Category (nullable, scope to category)
  threshold: integer (default: 3)
  auto_create_problem: boolean
  is_active: boolean
  created_at: datetime
  updated_at: datetime
}
```

---

### 13. Agent Skills Matrix

**Source:** `deepseek.md` (User Management & RBAC)
**Effort:** Small | **Dependency:** User model already exists in v1

Tag agents with skill areas (Network, Software, Hardware) to enable smarter auto-assignment.

**Features:**
- Admin assigns skills to each agent from a predefined list
- Skills can have proficiency levels (Beginner / Intermediate / Expert)
- Auto-assignment rules can filter by skill match
- Ticket category can require a specific skill level

**Suggested Data Model:**
```
Skill {
  id: UUID (PK)
  name: string (e.g., "Network Troubleshooting", "Linux Administration")
  created_at: datetime
}

AgentSkill {
  id: UUID (PK)
  agent_id: FK → User
  skill_id: FK → Skill
  proficiency: enum ['beginner', 'intermediate', 'expert']
  created_at: datetime
}
```

---

### 14. Scheduled Report Delivery

**Source:** `deepseek.md` (Dashboard & Reporting)
**Effort:** Medium | **Dependency:** BullMQ + report engine already exist in v1

Automate report generation and email delivery on a recurring schedule (daily, weekly, monthly).

**Features:**
- Admin configures a report schedule: type, format (PDF/CSV), recipients, frequency
- BullMQ job generates and emails the report at the scheduled time
- Report types available: SLA Compliance, Ticket Volume, Agent Performance, Problem Frequency

**Suggested Data Model:**
```
ScheduledReport {
  id: UUID (PK)
  report_type: enum ['sla', 'volume', 'agents', 'problems']
  format: enum ['pdf', 'csv']
  frequency: enum ['daily', 'weekly', 'monthly']
  recipients: string[] (email addresses)
  filters: jsonb (report filter criteria)
  is_active: boolean
  last_sent_at: datetime (nullable)
  created_by: FK → User
  created_at: datetime
}
```

---

### 15. Automation Rules Engine

**Source:** `deepseek.md` (Automation Rules)
**Effort:** Large | **Dependency:** New module, but builds on existing RBAC and ticket workflow

A configurable rules engine that automates common ticket actions based on triggers and conditions.

**Features:**
- **Rule components:** Trigger + Conditions + Actions
- **Triggers:** ticket.created, ticket.status_changed, ticket.priority_changed, sla.breached
- **Conditions:** category matches, client matches, priority equals, agent workload < threshold
- **Actions:** assign to agent/team, set priority, add tag, send notification, escalate
- Admin UI: create/edit/enable/disable rules from Settings

**Triggers → Actions Matrix:**

| Trigger | Example Action |
|---------|---------------|
| Ticket created | Auto-assign to team by category |
| Priority set to Critical | Auto-escalate and notify team lead |
| SLA breached | Auto-increase priority, notify admin |
| Ticket re-opened | Notify original assigned agent |
| Waiting on client > 48h | Send reminder notification |

**Suggested Data Model:**
```
AutomationRule {
  id: UUID (PK)
  name: string
  trigger: enum ['ticket_created', 'status_changed', 'priority_changed',
                  'sla_warning', 'sla_breached', 'ticket_reopened']
  conditions: jsonb (array of { field, operator, value })
  actions: jsonb (array of { action_type, params })
  is_active: boolean
  priority: integer (execution order)
  created_at: datetime
  updated_at: datetime
}
```

---

---

# Batch 4 — Module Expansion

**Theme:** New modules that extend the platform's capabilities into adjacent domains. Larger effort, but each unlocks a significant new value proposition.

---

### 16. Asset / CMDB Management

**Source:** `chatgpt.md` (Core Module)
**Effort:** Large | **Dependency:** New module + DB migration

A dedicated module to track client hardware, software, and network assets. Useful for linking incidents to specific devices and managing warranty lifecycles.

**Features:**
- **Company Assets** — register and track assets owned by each client company
- **Warranty Tracking** — record warranty start/end dates; flag assets nearing expiry
- **Serial Numbers** — unique asset identifiers for inventory
- **Assigned Users** — link an asset to the client contact currently using it
- **Ticket Linking** — associate one or more tickets with a specific asset (e.g., "printer X keeps failing")
- **Asset History** — log of status changes, reassignments, and linked tickets

**Suggested Data Model:**
```
Asset {
  id: UUID (PK)
  client_id: FK → Client
  asset_type: enum ['laptop', 'desktop', 'monitor', 'printer', 'network_device',
                     'server', 'software_license', 'other']
  asset_tag: string (e.g., "AST-00123")
  serial_number: string (unique)
  manufacturer: string
  model: string
  warranty_start: date (nullable)
  warranty_end: date (nullable)
  assigned_to_contact_id: FK → ClientContact (nullable)
  status: enum ['active', 'maintenance', 'retired']
  notes: text (nullable)
  created_at: datetime
  updated_at: datetime
  deleted_at: datetime (nullable)
}
```

**Routes (future):**
```
GET    /api/v1/assets
POST   /api/v1/assets
GET    /api/v1/assets/:id
PATCH  /api/v1/assets/:id
DELETE /api/v1/assets/:id
GET    /api/v1/assets/:id/tickets     (ticket history for an asset)
GET    /api/v1/clients/:id/assets     (assets by client)
```

---

### 17. Client Knowledge Base Access

**Source:** `deepseek.md` (Client Portal)
**Effort:** Small | **Dependency:** Knowledge Base already built in v1

Extend the knowledge base to clients so they can self-serve common solutions before submitting a ticket.

**Features:**
- KB articles can be marked as "public" (visible to clients)
- Client portal has a "Knowledge Base" tab with search
- "Suggested articles" shown to clients when creating a new ticket
- Client feedback on article helpfulness

---

### 18. Threaded (Nested) Comments

**Source:** `deepseek.md` (Ticket Management)
**Effort:** Medium | **Dependency:** Comment model already exists in v1

Allow replies to individual comments, creating threaded conversations rather than a flat timeline.

**Features:**
- "Reply" button on each comment opens an inline reply box
- Replies are indented under the parent comment (max depth: 2)
- The ActivityLog continues to use flat chronological entries for system events
- Threaded view is optional — toggle between flat and threaded

**Schema Change:**
```
Comment {
  ...existing fields...
  parent_comment_id: FK → Comment (nullable, self-referencing)
}
```

---

### 19. Live Chat Widget (Client Portal)

**Source:** `claude.md` (Out of Scope v1), `deepseek.md`
**Effort:** Large | **Dependency:** Socket.io already wired in v1

A real-time chat widget embedded in the client portal, allowing clients to get quick answers without creating a ticket.

**Features:**
- Chat widget in the bottom-right of the client portal
- Chat transcripts automatically create a ticket if not resolved in-session
- Agent-side chat queue in the staff app
- Chat history linked to the client record

---

### 20. Billing & Invoice Management

**Source:** `claude.md` (Out of Scope v1)
**Effort:** Large | **Dependency:** New module

Track billable support hours, generate invoices per client, and manage contract renewals.

**Features:**
- Link billable time entries to invoices
- Invoice generation (PDF) and email delivery
- Contract tier tracking with renewal dates
- Usage reporting (tickets logged vs contract allowance)

---

---

# Batch 5 — Long-Term / Strategic

**Theme:** Major initiatives requiring significant investment — new technology integration, cross-team coordination, or full-platform rewrites. These are directional goals for the next phase of the product.

---

### 21. Webhook Integrations (Slack, Teams, Jira)

**Source:** `claude.md` (Out of Scope v1), `deepseek.md`
**Effort:** Medium | **Dependency:** None (new model + delivery engine)

Outbound webhooks that push ticket events to third-party services for notification or synchronization.

**Features:**
- Configurable per event type (ticket.created, status.changed, etc.)
- Supported targets: Slack, Microsoft Teams, Jira
- Custom payload mapping (which fields to include)
- Retry with backoff on delivery failure

**Suggested Data Model:**
```
Webhook {
  id: UUID (PK)
  name: string
  url: string
  events: string[] (array of event types)
  secret: string (for HMAC signing)
  is_active: boolean
  last_triggered_at: datetime (nullable)
  created_at: datetime
}
```

---

### 22. AI-Powered Features

**Source:** `claude.md` (Out of Scope v1), `gemini.md` (implied by modern stack)
**Effort:** Large | **Dependency:** Requires LLM integration

Leverage AI/LLM models to enhance agent productivity and automate classification.

**Features:**
- **Auto-categorization** — suggest category/subcategory based on ticket title and description
- **Auto-priority** — suggest priority level based on urgency keywords
- **Suggested responses** — generate draft replies based on ticket context
- **Sentiment analysis** — flag tickets where the client tone is frustrated or angry
- **Smart search** — semantic search across tickets and knowledge base

---

### 23. Multi-Language / i18n Support

**Source:** `claude.md` (Out of Scope v1)
**Effort:** Very Large | **Dependency:** Requires full audit of all UI strings

Translate the entire application interface into multiple languages for international clients.

**Features:**
- Language detection from browser settings
- Language switcher in the user profile menu
- i18n library integration (e.g., react-i18next)
- Translation management UI for super admins
- Client portal can have a per-client language setting

---

### 24. Change Management Module

**Source:** `claude.md` (Out of Scope v1)
**Effort:** Large | **Dependency:** New module

A lightweight Change Management workflow for tracking planned infrastructure or software changes that might impact clients.

**Features:**
- Change request creation and approval workflow
- Link changes to affected clients and tickets
- Change calendar / maintenance window scheduling
- RFC (Request for Change) form with risk assessment

---

### 25. Mobile Native App

**Source:** `claude.md` (Out of Scope v1)
**Effort:** Very Large | **Dependency:** Requires mobile team

Native mobile applications for iOS and Android. Agent-focused: push notifications, quick ticket triage, status updates, and commenting on the go.

**Features:**
- **Agent app:** push notifications for assignments, SLA warnings; quick status changes; add comments; view ticket list
- **Client app (light):** submit tickets, track progress, respond to resolution confirmations
- Biometric authentication (Face ID / fingerprint)
- Offline queue for comments (sync when connection resumes)

---

*Compiled from: `chatgpt.md`, `claude.md`, `deepseek.md`, `gemini.md` — features deferred from v1 (`skill.md`)*
