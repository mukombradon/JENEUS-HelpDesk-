import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { toast } from "../components/ui/toast";
import type {
  Ticket,
  TicketFilters,
  Client,
  User,
  Notification,
  KnowledgeArticle,
  PaginatedResponse,
  CreateTicketForm,
  DashboardSummary,
  AgentDashboard,
} from "../types";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------
export const queryKeys = {
  tickets: {
    all: ["tickets"] as const,
    list: (filters?: TicketFilters) => ["tickets", "list", filters] as const,
    detail: (id: string) => ["tickets", "detail", id] as const,
  },
  clients: {
    all: ["clients"] as const,
    list: (params?: Record<string, unknown>) =>
      ["clients", "list", params] as const,
    detail: (id: string) => ["clients", "detail", id] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) =>
      ["users", "list", params] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (params?: Record<string, unknown>) =>
      ["notifications", "list", params] as const,
  },
  dashboard: {
    summary: ["dashboard", "summary"] as const,
    agent: (userId: string) => ["dashboard", "agent", userId] as const,
  },
  kb: {
    all: ["knowledge-base"] as const,
    list: (params?: Record<string, unknown>) =>
      ["knowledge-base", "list", params] as const,
    detail: (id: string) => ["knowledge-base", "detail", id] as const,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSearchParams(
  filters?: Record<string, unknown>,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (!filters) return params;
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = Array.isArray(value) ? value.join(",") : String(value);
    }
  }
  return params;
}

function handleError(err: unknown, fallback: string) {
  const message =
    err instanceof Object &&
    "response" in err &&
    err.response instanceof Object &&
    "data" in err.response &&
    typeof err.response.data === "object" &&
    err.response.data !== null &&
    "message" in err.response.data
      ? String((err.response.data as { message: string }).message)
      : fallback;
  toast({
    title: "Error",
    description: message,
    variant: "error",
  });
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export function useTickets(filters?: TicketFilters) {
  return useQuery({
    queryKey: queryKeys.tickets.list(filters),
    queryFn: async () => {
      const params = buildSearchParams(filters as Record<string, unknown>);
      const { data } = await api.get<PaginatedResponse<Ticket>>("/tickets", {
        params,
      });
      return data;
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Ticket>(`/tickets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: CreateTicketForm) => {
      const payload = { ...form };
      const { data } = await api.post<Ticket>("/tickets", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      toast({
        title: "Ticket created",
        description: "The ticket has been created successfully.",
        variant: "success",
      });
    },
    onError: (err) => {
      handleError(err, "Failed to create ticket.");
    },
  });
}

export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Partial<Omit<Ticket, "id" | "created_at" | "updated_at">>,
    ) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.detail(id),
      });
      toast({
        title: "Ticket updated",
        description: "The ticket has been updated.",
        variant: "success",
      });
    },
    onError: (err) => {
      handleError(err, "Failed to update ticket.");
    },
  });
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export function useClients(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Client>>("/clients", {
        params: buildSearchParams(params),
      });
      return data;
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Client>(`/clients/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function useUsers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>("/users", {
        params: buildSearchParams(params),
      });
      return data;
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.detail("me"),
    queryFn: async () => {
      const { data } = await api.get<User>("/users/me");
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useNotifications(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: async () => {
      const { data } = await api.get<Notification[] | PaginatedResponse<Notification>>(
        "/notifications",
        { params: buildSearchParams(params) },
      );
      // Accept both array and paginated response
      if (Array.isArray(data)) return data;
      return data.data;
    },
    refetchInterval: 30_000, // poll every 30 s
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>("/dashboard/summary");
      return data;
    },
  });
}

export function useAgentDashboard(userId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.agent(userId),
    queryFn: async () => {
      const { data } = await api.get<AgentDashboard>('/dashboard/agent');
      return data;
    },
    enabled: !!userId,
  });
}

// ---------------------------------------------------------------------------
// Knowledge Base
// ---------------------------------------------------------------------------

export function useKnowledgeArticles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.kb.list(params),
    queryFn: async () => {
      const { data } = await api.get<
        PaginatedResponse<KnowledgeArticle>
      >("/knowledge-base", {
        params: buildSearchParams(params),
      });
      return data;
    },
  });
}

export function useKnowledgeArticle(id: string) {
  return useQuery({
    queryKey: queryKeys.kb.detail(id),
    queryFn: async () => {
      const { data } = await api.get<KnowledgeArticle>(
        `/knowledge-base/${id}`,
      );
      return data;
    },
    enabled: !!id,
  });
}
