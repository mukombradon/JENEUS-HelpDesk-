import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Paperclip,
  Upload,
  ChevronDown,
  AlertTriangle,
  Link2,
  ExternalLink,
  User,
  Building,
  Shield,
  Edit3,
  Trash2,
  FileText,
  Download,
  Send,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "../../components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import api from "../../lib/api";
import type {
  Ticket,
  Comment,
  ActivityLog,
  Client,
  ClientContact,
  User as Agent,
  Team,
  TicketStatus,
  Priority,
} from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy HH:mm");
}

function formatRelative(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function getInitials(first?: string, last?: string): string {
  return `${(first ?? "")[0] ?? ""}${(last ?? "")[0] ?? ""}`.toUpperCase();
}

function priorityColor(p: Priority): string {
  const map: Record<Priority, string> = {
    critical: "text-priority-critical",
    high: "text-priority-high",
    medium: "text-priority-medium",
    low: "text-priority-low",
  };
  return map[p] ?? "text-ink-muted";
}

function statusBadgeVariant(
  status: TicketStatus
): "open" | "in-progress" | "pending" | "resolved" | "closed" | "cancelled" {
  return status.replace("_", "-") as
    | "open"
    | "in-progress"
    | "pending"
    | "resolved"
    | "closed"
    | "cancelled";
}

function contractTierBadge(
  tier: string
): "default" | "success" | "warning" | "secondary" {
  switch (tier) {
    case "enterprise":
      return "default";
    case "premium":
      return "success";
    case "standard":
      return "warning";
    default:
      return "secondary";
  }
}

// ---------------------------------------------------------------------------
// Skeleton component
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-20 rounded-pill" />
        <Skeleton className="h-6 w-16 rounded-pill" />
        <Skeleton className="h-6 w-20 rounded-pill" />
        <Skeleton className="h-6 w-28 rounded-pill" />
      </div>
      <Skeleton className="h-8 w-3/4" />
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="w-80 space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recurrence banner
// ---------------------------------------------------------------------------

function RecurrenceBanner({ count }: { count: number }) {
  if (count < 3) return null;
  return (
    <div className="flex items-center gap-2 px-6 py-2 bg-semantic-warning/10 border-b border-semantic-warning/30">
      <AlertTriangle className="h-4 w-4 text-semantic-warning shrink-0" />
      <span className="text-sm text-semantic-warning">
        <strong>Recurrence detected:</strong> {count} similar incidents reported.
        Consider escalating to a Problem.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity feed item
// ---------------------------------------------------------------------------

interface TimelineItemProps {
  item: Comment | ActivityLog;
  agents: Agent[];
}

function isComment(item: Comment | ActivityLog): item is Comment {
  return "body" in item && "is_internal" in item;
}

function TimelineItem({ item, agents }: TimelineItemProps) {
  if (isComment(item)) {
    const isAgent = item.author_type === "staff";
    const isInternal = item.is_internal;
    const author = agents.find((a) => a.id === item.author_id);

    const alignLeft = !isAgent || isInternal;
    const bg = isInternal
      ? "bg-amber-900/15 border border-amber-700/30"
      : isAgent
        ? "bg-primary/10 border border-primary/20 ml-auto"
        : "bg-surface-3 border border-hairline";

    return (
      <div className={cn("max-w-[80%]", alignLeft ? "mr-auto" : "ml-auto")}>
        <div className={cn("rounded-lg p-3 text-sm", bg)}>
          {isInternal && (
            <Badge variant="warning" className="mb-1.5 text-[10px] uppercase tracking-wide">
              Internal Note
            </Badge>
          )}
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={author?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {author
                  ? getInitials(author.first_name, author.last_name)
                  : "??"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-ink">
              {author
                ? `${author.first_name} ${author.last_name}`
                : item.author_id.slice(0, 8)}
            </span>
            <span className="text-xs text-ink-subtle">
              {formatRelative(item.created_at)}
            </span>
          </div>
          <p className="text-ink whitespace-pre-wrap">{item.body}</p>
          {item.attachments && item.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover"
                >
                  <Paperclip className="h-3 w-3" />
                  {att.filename}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // System activity log entry
  const log = item as ActivityLog;
  const actor = agents.find((a) => a.id === log.actor_id);
  return (
    <div className="flex justify-center">
      <div className="bg-surface-2 border border-hairline rounded-pill px-4 py-1.5 text-xs text-ink-subtle italic">
        {actor
          ? `${actor.first_name} ${actor.last_name}`
          : log.actor_id.slice(0, 8)}{" "}
        {log.action}
        {log.new_value && (
          <>
            {" "}to{" "}
            <span className="font-medium text-ink-muted not-italic">
              {log.new_value}
            </span>
          </>
        )}
        {" - "}
        {formatRelative(log.created_at)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Comment state
  const [commentText, setCommentText] = useState("");
  const [commentIsInternal, setCommentIsInternal] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // Attachments for comment
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch data ──────────────────────────────────────────────────────

  const {
    data: ticket,
    isLoading: ticketLoading,
    isError: ticketError,
  } = useQuery({
    queryKey: ["tickets", "detail", id],
    queryFn: () =>
      api.get<Ticket>(`/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["tickets", "comments", id],
    queryFn: () =>
      api.get<Comment[]>(`/tickets/${id}/comments`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["tickets", "activity", id],
    queryFn: () =>
      api.get<ActivityLog[]>(`/tickets/${id}/activity`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: client } = useQuery({
    queryKey: ["clients", "detail", ticket?.client_id],
    queryFn: () =>
      api.get<Client>(`/clients/${ticket!.client_id}`).then((r) => r.data),
    enabled: !!ticket?.client_id,
  });

  const { data: contact } = useQuery({
    queryKey: ["clients", "contacts", ticket?.client_id],
    queryFn: () =>
      api
        .get<ClientContact[]>(`/clients/${ticket!.client_id}/contacts`)
        .then((r) => r.data),
    enabled: !!ticket?.client_id,
  });

  const { data: agentsData } = useQuery({
    queryKey: ["users", "list"],
    queryFn: () =>
      api
        .get<{ data: Agent[] }>("/users", { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<Team[]>("/teams").then((r) => r.data),
  });

  const agents = agentsData ?? [];
  const teams = teamsData ?? [];
  const assignedAgent = ticket?.assigned_agent_id
    ? agents.find((a) => a.id === ticket.assigned_agent_id)
    : null;
  const assignedTeam = ticket?.assigned_team_id
    ? teams.find((t) => t.id === ticket.assigned_team_id)
    : null;

  // ── Mutations ───────────────────────────────────────────────────────

  const updateTicketMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      api.patch(`/tickets/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets", "activity", id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update ticket.",
        variant: "error",
      });
    },
  });

  // ── Combined timeline ───────────────────────────────────────────────

  const timeline = [
    ...comments.map((c) => ({ ...c, _type: "comment" as const })),
    ...activity.map((a) => ({ ...a, _type: "activity" as const })),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // ── SLA status ──────────────────────────────────────────────────────

  const slaHours = ticket?.resolution_due_at
    ? differenceInHours(new Date(ticket.resolution_due_at), new Date())
    : null;
  const slaBreached = ticket?.sla_breach ?? false;
  const slaAtRisk = slaHours !== null && slaHours <= 4 && slaHours > 0;
  const slaOnTrack = slaHours !== null && slaHours > 4;

  // ── Handlers ────────────────────────────────────────────────────────

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const payload = {
        body: commentText,
        is_internal: commentIsInternal,
      };
      await api.post(`/tickets/${id}/comments`, payload);
      setCommentText("");
      setCommentFiles([]);
      queryClient.invalidateQueries({
        queryKey: ["tickets", "comments", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["tickets", "activity", id],
      });
      toast({
        title: "Comment added",
        variant: "success",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "error",
      });
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentText, commentIsInternal, id, queryClient]);

  const handleTitleSave = useCallback(() => {
    if (titleDraft.trim() && titleDraft !== ticket?.title) {
      updateTicketMutation.mutate({ title: titleDraft });
    }
    setEditingTitle(false);
  }, [titleDraft, ticket, updateTicketMutation]);

  const handleStatusChange = useCallback(
    (newStatus: TicketStatus) => {
      updateTicketMutation.mutate({ status: newStatus });
    },
    [updateTicketMutation]
  );

  const handlePriorityChange = useCallback(
    (newPriority: Priority) => {
      updateTicketMutation.mutate({ priority: newPriority });
    },
    [updateTicketMutation]
  );

  const handleReassign = useCallback(
    (agentId: string) => {
      updateTicketMutation.mutate({
        assigned_agent_id: agentId === "unassign" ? null : agentId,
      });
    },
    [updateTicketMutation]
  );

  const handleEscalate = useCallback(() => {
    updateTicketMutation.mutate({
      type: "problem",
      // When escalating, link as parent problem
    });
  }, [updateTicketMutation]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await api.delete(`/tickets/${id}`);
      toast({ title: "Ticket deleted", variant: "success" });
      navigate("/tickets");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete ticket.",
        variant: "error",
      });
    }
  }, [id, navigate]);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // ── Loading state ──────────────────────────────────────────────────

  if (ticketLoading) {
    return <DetailSkeleton />;
  }

  // ── Error state ─────────────────────────────────────────────────────

  if (ticketError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-24">
        <div className="rounded-pill bg-surface-3 p-4 mb-4">
          <AlertTriangle className="h-8 w-8 text-semantic-danger" />
        </div>
        <h2 className="text-lg font-semibold text-ink mb-1">
          Ticket not found
        </h2>
        <p className="text-sm text-ink-subtle mb-6 max-w-sm">
          The ticket you're looking for doesn't exist or you don't have
          permission to view it.
        </p>
        <Button variant="outline" onClick={() => navigate("/tickets")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Recurrence banner */}
      <RecurrenceBanner count={ticket.recurrence_count} />

      {/* Top header badges bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-mono font-semibold text-ink">
            {ticket.ticket_number}
          </span>
          <Badge
            variant={
              ticket.type === "problem" ? "warning" : "default"
            }
          >
            {ticket.type === "problem" ? "Problem" : "Incident"}
          </Badge>
          <Badge variant={statusBadgeVariant(ticket.status)}>
            {ticket.status.replace("_", " ")}
          </Badge>
          <Badge variant={ticket.priority as keyof typeof statusBadgeVariant extends never ? "default" : never}>
            <span className={cn("font-medium", priorityColor(ticket.priority))}>
              ●{" "}
            </span>
            {ticket.priority}
          </Badge>
          {/* SLA countdown */}
          {slaBreached || slaAtRisk || slaOnTrack ? (
            <Badge
              variant={
                slaBreached
                  ? "danger"
                  : slaAtRisk
                    ? "warning"
                    : "success"
              }
            >
              <Clock className="h-3 w-3 mr-1" />
              {slaBreached
                ? "SLA Breached"
                : slaAtRisk
                  ? `${slaHours}h left`
                  : `${slaHours}h left`}
            </Badge>
          ) : null}
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-2">
          {ticket.type === "incident" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEscalate}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Escalate to Problem
            </Button>
          )}

          <Select
            value={ticket.status}
            onValueChange={(v) => handleStatusChange(v as TicketStatus)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/tickets/${id}/edit`)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Ticket
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-semantic-danger"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column ~70% */}
        <div className="flex-1 overflow-y-auto scrollbar-dark">
          {/* Title */}
          <div className="px-6 pt-5 pb-3">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  className="text-lg font-semibold"
                />
              </div>
            ) : (
              <h2
                className="text-lg font-semibold text-ink cursor-pointer hover:text-primary transition-colors group flex items-center gap-2"
                onClick={() => {
                  setTitleDraft(ticket.title);
                  setEditingTitle(true);
                }}
              >
                {ticket.title}
                <Edit3 className="h-3.5 w-3.5 text-ink-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
              </h2>
            )}
          </div>

          {/* Description */}
          <div className="px-6 pb-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-ink-subtle" />
                <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Description
                </span>
              </div>
              <div
                className="text-sm text-ink leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </Card>
          </div>

          {/* Activity Timeline */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-ink-subtle" />
              <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">
                Activity
              </span>
            </div>
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <p className="text-sm text-ink-subtle text-center py-8">
                  No activity yet.
                </p>
              ) : (
                timeline.map((item, i) => (
                  <TimelineItem
                    key={"id" in item ? item.id : i}
                    item={item as Comment | ActivityLog}
                    agents={agents}
                  />
                ))
              )}
            </div>
          </div>

          {/* Comment box */}
          <div className="px-6 pb-6">
            <Card className="p-4">
              {/* Tab toggle */}
              <div className="flex items-center gap-1 mb-3">
                <Button
                  variant={!commentIsInternal ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCommentIsInternal(false)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Public Reply
                </Button>
                <Button
                  variant={commentIsInternal ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCommentIsInternal(true)}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Internal Note
                </Button>
              </div>

              <Textarea
                placeholder={
                  commentIsInternal
                    ? "Add an internal note (not visible to client)..."
                    : "Type your reply..."
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[100px] mb-3"
              />

              {/* File attachment zone */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-md p-3 mb-3 text-center transition-colors cursor-pointer",
                  commentFiles.length > 0
                    ? "border-primary/50 bg-primary/5"
                    : "border-hairline hover:border-hairline-strong"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  setCommentFiles((prev) => [...prev, ...files].slice(0, 10));
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setCommentFiles((prev) => [...prev, ...files].slice(0, 10));
                  }}
                />
                {commentFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {commentFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 rounded-pill px-2 py-1"
                      >
                        <Paperclip className="h-3 w-3" />
                        {f.name}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommentFiles((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            );
                          }}
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-ink-subtle flex items-center justify-center gap-1">
                    <Upload className="h-4 w-4" />
                    Drop files here or click to attach (max 10 files)
                  </span>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || commentSubmitting}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {commentSubmitting ? "Sending..." : "Send"}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Right sidebar ~30% */}
        <div className="w-80 shrink-0 border-l border-hairline overflow-y-auto scrollbar-dark">
          <div className="p-4 space-y-5">

            {/* Client info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building className="h-4 w-4 text-ink-subtle" />
                <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Client
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-ink font-medium">
                  {client?.name ?? "Loading..."}
                </p>
                {contact && contact.length > 0 && (
                  <p className="text-xs text-ink-muted">
                    {contact[0]?.first_name} {contact[0]?.last_name}
                    <br />
                    {contact[0]?.email}
                    {contact[0]?.phone && (
                      <>
                        <br />
                        {contact[0].phone}
                      </>
                    )}
                  </p>
                )}
                {client?.contract_tier && (
                  <Badge variant={contractTierBadge(client.contract_tier)}>
                    {client.contract_tier}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Assignment */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-ink-subtle" />
                <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Assignment
                </span>
              </div>
              <div className="space-y-3">
                {/* Assigned agent */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={assignedAgent?.avatar_url ?? undefined}
                    />
                    <AvatarFallback className="text-[10px]">
                      {assignedAgent
                        ? getInitials(
                            assignedAgent.first_name,
                            assignedAgent.last_name
                          )
                        : "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm text-ink">
                      {assignedAgent
                        ? `${assignedAgent.first_name} ${assignedAgent.last_name}`
                        : "Unassigned"}
                    </p>
                  </div>
                  {/* Reassign */}
                  <Select onValueChange={handleReassign}>
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue placeholder="Reassign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassign">Unassign</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.first_name} {a.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Assigned team */}
                {assignedTeam && (
                  <p className="text-xs text-ink-muted">
                    Team: {assignedTeam.name}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Priority */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Priority
                </span>
              </div>
              <Select
                value={ticket.priority}
                onValueChange={(v) => handlePriorityChange(v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-pill bg-priority-critical" />
                      Critical
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-pill bg-priority-high" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-pill bg-priority-medium" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-pill bg-priority-low" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Linked Problems / Incidents */}
            {ticket.parent_problem_id && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-ink-subtle" />
                  <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">
                    Linked Problem
                  </span>
                </div>
                <Link
                  to={`/problems/${ticket.parent_problem_id}`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
                >
                  View linked problem
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {ticket.type === "problem" && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-ink-subtle" />
                  <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">
                    Linked Incidents
                  </span>
                </div>
                <p className="text-sm text-ink-muted">
                  Incidents linked to this problem will appear here.
                </p>
              </div>
            )}

            <Separator />

            {/* Attachment gallery */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="h-4 w-4 text-ink-subtle" />
                  <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider">
                    Attachments ({ticket.attachments.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ticket.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 p-2 rounded-md bg-surface-3 hover:bg-surface-1 transition-colors border border-hairline"
                    >
                      <Download className="h-3.5 w-3.5 text-ink-subtle shrink-0" />
                      <span className="text-xs text-ink-muted truncate">
                        {att.filename}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <span className="text-xs font-medium text-ink-subtle uppercase tracking-wider block mb-2">
                Details
              </span>
              <div className="space-y-1 text-xs text-ink-muted">
                <p>Created: {formatDate(ticket.created_at)}</p>
                <p>Updated: {formatDate(ticket.updated_at)}</p>
                {ticket.first_response_at && (
                  <p>First response: {formatDate(ticket.first_response_at)}</p>
                )}
                {ticket.resolved_at && (
                  <p>Resolved: {formatDate(ticket.resolved_at)}</p>
                )}
                <p>Tags: {ticket.tags.length > 0 ? ticket.tags.join(", ") : "None"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper XIcon since we import from lucide but might miss it
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
