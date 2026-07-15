// ============================================================
// Enums
// ============================================================

export type Role = "super_admin" | "admin" | "team_lead" | "agent";

export type TicketType = "incident" | "problem";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "resolved"
  | "closed"
  | "cancelled";

export type Priority = "critical" | "high" | "medium" | "low";

export type ContractTier = "basic" | "standard" | "premium" | "enterprise";

export type ActorType = "staff" | "client" | "system";

export type AuthorType = "staff" | "client";

export type RecipientType = "staff" | "client";

export type NotificationType =
  | "ticket_created"
  | "ticket_assigned"
  | "comment_added"
  | "status_changed"
  | "sla_warning"
  | "sla_breached"
  | "escalated";

export type SentVia = "in_app" | "email" | "both";

// ============================================================
// Core Entities
// ============================================================

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  role: Role;
  team_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  contract_tier: ContractTier;
  sla_policy_id: string | null;
  primary_contact_id: string | null;
  account_manager_id: string | null;
  is_active: boolean;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  is_primary: boolean;
  portal_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  lead_id: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  default_team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SLARule {
  priority: Priority;
  response_time_hours: number;
  resolution_time_hours: number;
}

export interface SLAPolicy {
  id: string;
  name: string;
  description: string;
  rules: SLARule[];
  business_hours_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category_id: string;
  subcategory_id: string | null;
  client_id: string;
  contact_id: string;
  assigned_agent_id: string | null;
  assigned_team_id: string | null;
  created_by: string;
  parent_problem_id: string | null;
  sla_policy_id: string | null;
  sla_breach: boolean;
  response_due_at: string | null;
  resolution_due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  recurrence_count: number;
  tags: string[];
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Comment {
  id: string;
  ticket_id: string;
  author_id: string;
  author_type: AuthorType;
  body: string;
  is_internal: boolean;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  ticket_id: string;
  actor_id: string;
  actor_type: ActorType;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  comment_id: string | null;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: RecipientType;
  ticket_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  sent_via: SentVia;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category_id: string;
  author_id: string;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerFeedback {
  id: string;
  ticket_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, string[]>;
}

export interface DashboardSummary {
  tickets_by_status: Record<TicketStatus, number>;
  tickets_by_priority: Record<Priority, number>;
  sla_compliance_rate: number;
  top_clients: Array<{ client: Client; ticket_count: number }>;
  agent_workload: Array<{
    agent: User;
    open_tickets: number;
    avg_resolution_time: number;
    sla_breach_count: number;
  }>;
  first_response_time_avg: Record<Priority, number>;
  resolution_time_avg: Record<string, number>;
}

export interface AgentDashboard {
  my_tickets: Record<TicketStatus, number>;
  sla_at_risk: Ticket[];
  recent_activity: ActivityLog[];
}

export interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  avg_response_time: number;
  avg_resolution_time: number;
  sla_compliance: number;
  tickets_today: number;
  tickets_this_week: number;
  tickets_this_month: number;
}

// ============================================================
// Auth Form Types
// ============================================================

export interface LoginForm {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface ForgotPasswordForm {
  email: string;
}

export interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// ============================================================
// CRUD Form Types
// ============================================================

export interface CreateTicketForm {
  type: TicketType;
  title: string;
  description: string;
  client_id: string;
  contact_id: string;
  category_id: string;
  subcategory_id?: string;
  priority: Priority;
  tags?: string;
  assigned_agent_id?: string;
  assigned_team_id?: string;
  attachments?: File[];
}

export interface UpdateTicketForm {
  type?: TicketType;
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: Priority;
  category_id?: string;
  subcategory_id?: string;
  assigned_agent_id?: string | null;
  assigned_team_id?: string | null;
  tags?: string[];
}

export interface CreateClientForm {
  name: string;
  industry: string;
  contract_tier: ContractTier;
  sla_policy_id?: string;
  primary_contact_id?: string;
  account_manager_id?: string;
}

export interface UpdateClientForm {
  name?: string;
  industry?: string;
  contract_tier?: ContractTier;
  sla_policy_id?: string | null;
  primary_contact_id?: string | null;
  account_manager_id?: string | null;
  is_active?: boolean;
}

export interface CreateContactForm {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
  is_primary?: boolean;
  portal_access?: boolean;
}

export interface CreateCommentForm {
  body: string;
  is_internal: boolean;
  attachments?: File[];
}

export interface CreateArticleForm {
  title: string;
  content: string;
  category_id: string;
  is_published?: boolean;
}

export interface UpdateArticleForm {
  title?: string;
  content?: string;
  category_id?: string;
  is_published?: boolean;
}

export interface InviteUserForm {
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  team_id?: string;
}

export interface UpdateUserForm {
  first_name?: string;
  last_name?: string;
  role?: Role;
  team_id?: string | null;
  is_active?: boolean;
  avatar_url?: string | null;
}

export interface CreateTeamForm {
  name: string;
  description?: string;
  lead_id?: string;
}

export interface CreateCategoryForm {
  name: string;
  icon?: string;
  default_team_id?: string;
}

export interface CreateSubcategoryForm {
  name: string;
}

export interface CreateSLAPolicyForm {
  name: string;
  description?: string;
  rules: SLARule[];
  business_hours_only?: boolean;
}

// ============================================================
// Filter Types
// ============================================================

export interface TicketFilters {
  status?: TicketStatus[];
  type?: TicketType;
  priority?: Priority[];
  assigned_agent_id?: string;
  assigned_team_id?: string;
  client_id?: string;
  category_id?: string;
  subcategory_id?: string;
  date_from?: string;
  date_to?: string;
  sla_status?: "on_track" | "at_risk" | "breached";
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface NotificationFilters {
  is_read?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

export interface SavedFilter {
  id: string;
  name: string;
  user_id: string;
  filters: TicketFilters;
  created_at: string;
}

// ============================================================
// Escalation & Linking Types
// ============================================================

export interface EscalateTicketPayload {
  reason: string;
  assigned_agent_id?: string;
  assigned_team_id?: string;
  priority?: Priority;
}

export interface LinkProblemPayload {
  problem_id: string;
  relationship?: "caused_by" | "related_to";
}
