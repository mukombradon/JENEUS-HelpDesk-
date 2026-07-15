import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type {
  AuthResponse,
  User,
  Client,
  ClientContact,
  Team,
  Ticket,
  Comment,
  ActivityLog,
  Notification,
  KnowledgeArticle,
  Category,
  Subcategory,
  SLAPolicy,
  SLARule,
  DashboardSummary,
  AgentDashboard,
  DashboardStats,
  PaginatedResponse,
  TicketFilters,
  CreateTicketForm,
  UpdateTicketForm,
  CreateClientForm,
  UpdateClientForm,
  CreateContactForm,
  CreateCommentForm,
  CreateArticleForm,
  UpdateArticleForm,
  InviteUserForm,
  UpdateUserForm,
  CreateTeamForm,
  EscalateTicketPayload,
  LinkProblemPayload,
  NotificationFilters,
  Attachment,
  Priority,
} from "../types";

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor – attach JWT access token
// ---------------------------------------------------------------------------

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor – refresh tokens on 401
// ---------------------------------------------------------------------------

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data;

        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Helper to extract error messages from API responses
// ---------------------------------------------------------------------------

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "message" in data) {
      return String(data.message);
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const auth = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  refresh: () =>
    api.post<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      refreshToken: localStorage.getItem("refreshToken"),
    }),

  logout: () => api.post("/auth/logout"),

  getMe: () => api.get<User>("/auth/me"),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
    }),
};

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export const tickets = {
  list: (filters?: TicketFilters) =>
    api.get<PaginatedResponse<Ticket>>("/tickets", { params: filters }),

  get: (id: string) => api.get<Ticket>(`/tickets/${id}`),

  create: (data: CreateTicketForm) => api.post<Ticket>("/tickets", data),

  update: (id: string, data: UpdateTicketForm) =>
    api.patch<Ticket>(`/tickets/${id}`, data),

  delete: (id: string) => api.delete<void>(`/tickets/${id}`),

  addComment: (id: string, data: CreateCommentForm) =>
    api.post<Comment>(`/tickets/${id}/comments`, data),

  getComments: (id: string) =>
    api.get<Comment[]>(`/tickets/${id}/comments`),

  getActivity: (id: string) =>
    api.get<ActivityLog[]>(`/tickets/${id}/activity`),

  escalate: (id: string, data: EscalateTicketPayload) =>
    api.post<Ticket>(`/tickets/${id}/escalate`, data),

  linkProblem: (id: string, data: LinkProblemPayload) =>
    api.post<Ticket>(`/tickets/${id}/link-problem`, data),

  getAttachments: (id: string) =>
    api.get<Attachment[]>(`/tickets/${id}/attachments`),
};

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clients = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<Client>>("/clients", { params }),

  get: (id: string) => api.get<Client>(`/clients/${id}`),

  create: (data: CreateClientForm) => api.post<Client>("/clients", data),

  update: (id: string, data: UpdateClientForm) =>
    api.patch<Client>(`/clients/${id}`, data),

  delete: (id: string) => api.delete<void>(`/clients/${id}`),

  getContacts: (clientId: string) =>
    api.get<ClientContact[]>(`/clients/${clientId}/contacts`),

  createContact: (clientId: string, data: CreateContactForm) =>
    api.post<ClientContact>(`/clients/${clientId}/contacts`, data),

  updateContact: (clientId: string, contactId: string, data: Partial<CreateContactForm>) =>
    api.patch<ClientContact>(`/clients/${clientId}/contacts/${contactId}`, data),

  deleteContact: (clientId: string, contactId: string) =>
    api.delete<void>(`/clients/${clientId}/contacts/${contactId}`),
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = {
  list: (params?: { page?: number; limit?: number; search?: string; team_id?: string }) =>
    api.get<PaginatedResponse<User>>("/users", { params }),

  get: (id: string) => api.get<User>(`/users/${id}`),

  invite: (data: InviteUserForm) => api.post<User>("/users/invite", data),

  update: (id: string, data: UpdateUserForm) =>
    api.patch<User>(`/users/${id}`, data),

  delete: (id: string) => api.delete<void>(`/users/${id}`),
};

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export const teams = {
  list: () => api.get<Team[]>("/teams"),

  get: (id: string) => api.get<Team>(`/teams/${id}`),

  create: (data: CreateTeamForm) => api.post<Team>("/teams", data),

  update: (id: string, data: Partial<CreateTeamForm>) =>
    api.patch<Team>(`/teams/${id}`, data),

  delete: (id: string) => api.delete<void>(`/teams/${id}`),
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categories = {
  list: () => api.get<Category[]>("/categories"),

  get: (id: string) => api.get<Category>(`/categories/${id}`),

  create: (data: { name: string; icon?: string; default_team_id?: string }) =>
    api.post<Category>("/categories", data),

  update: (id: string, data: Partial<{ name: string; icon: string; default_team_id: string | null }>) =>
    api.patch<Category>(`/categories/${id}`, data),

  delete: (id: string) => api.delete<void>(`/categories/${id}`),

  getSubcategories: (categoryId: string) =>
    api.get<Subcategory[]>(`/categories/${categoryId}/subcategories`),
};

// ---------------------------------------------------------------------------
// SLA Policies
// ---------------------------------------------------------------------------

export const sla = {
  list: () => api.get<SLAPolicy[]>("/sla"),

  get: (id: string) => api.get<SLAPolicy>(`/sla/${id}`),

  create: (data: {
    name: string;
    description?: string;
    rules: SLARule[];
    business_hours_only?: boolean;
  }) => api.post<SLAPolicy>("/sla", data),

  update: (id: string, data: Partial<SLAPolicy>) =>
    api.patch<SLAPolicy>(`/sla/${id}`, data),

  delete: (id: string) => api.delete<void>(`/sla/${id}`),
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboard = {
  getSummary: () => api.get<DashboardSummary>("/dashboard/summary"),

  getAgentWidgets: () => api.get<AgentDashboard>("/dashboard/agent"),

  getStats: (params?: { date_from?: string; date_to?: string }) =>
    api.get<DashboardStats>("/dashboard/stats", { params }),
};

// ---------------------------------------------------------------------------
// Knowledge Base
// ---------------------------------------------------------------------------

export const kb = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: string;
    is_published?: boolean;
  }) => api.get<PaginatedResponse<KnowledgeArticle>>("/knowledge-base", { params }),

  get: (id: string) => api.get<KnowledgeArticle>(`/knowledge-base/${id}`),

  create: (data: CreateArticleForm) =>
    api.post<KnowledgeArticle>("/knowledge-base", data),

  update: (id: string, data: UpdateArticleForm) =>
    api.patch<KnowledgeArticle>(`/knowledge-base/${id}`, data),

  delete: (id: string) => api.delete<void>(`/knowledge-base/${id}`),
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notifications = {
  list: (filters?: NotificationFilters) =>
    api.get<PaginatedResponse<Notification>>("/notifications", {
      params: filters,
    }),

  getUnreadCount: () =>
    api.get<{ count: number }>("/notifications/unread-count"),

  markRead: (id: string) =>
    api.patch<void>(`/notifications/${id}/read`),

  markAllRead: () => api.post<void>("/notifications/mark-all-read"),
};

// ---------------------------------------------------------------------------
// Client Portal
// ---------------------------------------------------------------------------

export const portal = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/portal/login", { email, password }),

  listTickets: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<PaginatedResponse<Ticket>>("/portal/tickets", { params }),

  getTicket: (id: string) => api.get<Ticket>(`/portal/tickets/${id}`),

  createTicket: (data: {
    title: string;
    description: string;
    category_id: string;
    priority: Priority;
  }) => api.post<Ticket>("/portal/tickets", data),

  addComment: (ticketId: string, body: string) =>
    api.post<Comment>(`/portal/tickets/${ticketId}/comments`, { body }),

  getProfile: () => api.get<ClientContact>("/portal/profile"),
};

export default api;
