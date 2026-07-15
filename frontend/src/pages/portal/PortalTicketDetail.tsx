import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Send,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";
import type { Ticket, Comment, Attachment, PaginatedResponse } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy h:mm a");
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// Portal API helper
// ---------------------------------------------------------------------------

function portalApiGet<T>(url: string, config?: Record<string, unknown>) {
  return api.get<T>(url, {
    ...config,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("portal_access_token")}`,
    },
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PortalTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch ticket
  const {
    data: ticket,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["portal", "ticket", id],
    queryFn: () => portalApiGet<Ticket>(`/portal/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  // Fetch comments (public only for portal)
  const { data: comments = [] } = useQuery({
    queryKey: ["portal", "ticket", id, "comments"],
    queryFn: () =>
      portalApiGet<PaginatedResponse<Comment>>(`/portal/tickets/${id}/comments`).then(
        (r) => r.data.data
      ),
    enabled: !!id,
  });

  // Fetch attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ["portal", "ticket", id, "attachments"],
    queryFn: () =>
      portalApiGet<Attachment[]>(`/portal/tickets/${id}/attachments`).then((r) => r.data),
    enabled: !!id,
  });

  // Submit comment
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(
        `/portal/tickets/${id}/comments`,
        { body: newComment },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("portal_access_token")}`,
          },
        }
      );
      toast({ title: "Comment added", variant: "success" });
      setNewComment("");
      queryClient.invalidateQueries({
        queryKey: ["portal", "ticket", id, "comments"],
      });
    } catch {
      toast({ title: "Error", description: "Failed to add comment.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0b0e]">
        <div className="max-w-4xl mx-auto p-6">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  // Error
  if (isError || !ticket) {
    return (
      <div className="min-h-screen bg-[#0a0b0e] flex items-center justify-center">
        <div className="text-center px-6">
          <AlertCircle className="h-10 w-10 text-semantic-danger mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-ink mb-1">Ticket not found</h2>
          <p className="text-sm text-ink-subtle mb-4">
            This ticket doesn't exist or you don't have access.
          </p>
          <Button variant="outline" onClick={() => navigate("/portal/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const statusVariant = ticket.status.replace("_", "-") as
    | "open"
    | "in-progress"
    | "pending"
    | "resolved"
    | "closed"
    | "cancelled";

  return (
    <div className="min-h-screen bg-[#0a0b0e]">
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-1">
        <Button variant="ghost" size="sm" onClick={() => navigate("/portal/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-sm text-ink-subtle font-mono">
          {ticket.ticket_number}
        </span>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header section */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-lg font-semibold text-ink">{ticket.title}</h1>
            <Badge variant={statusVariant}>
              {ticket.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-subtle">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {formatShortDate(ticket.created_at)}
            </span>
            {ticket.updated_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatShortDate(ticket.updated_at)}
              </span>
            )}
            <Badge
              variant={
                ticket.priority === "critical"
                  ? "critical"
                  : ticket.priority === "high"
                  ? "high"
                  : ticket.priority === "medium"
                  ? "medium"
                  : "low"
              }
              className="text-[10px]"
            >
              {ticket.priority}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-ink">
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-muted whitespace-pre-wrap leading-relaxed">
              {ticket.description || "No description provided."}
            </p>
          </CardContent>
        </Card>

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-ink flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <a
                      href={att.file_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {att.filename || "Attachment"}
                    </a>
                    {att.file_size && (
                      <span className="text-xs text-ink-subtle">
                        ({(att.file_size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Comments */}
        <div>
          <h2 className="text-sm font-medium text-ink flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4" />
            Comments ({comments.length})
          </h2>

          {comments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-ink-muted">No comments yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-ink">
                        {comment.author_id.slice(0, 8) || "Agent"}
                      </span>
                      <span className="text-[10px] text-ink-subtle">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-ink-muted whitespace-pre-wrap leading-relaxed">
                      {comment.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add comment */}
        {ticket.status !== "closed" && ticket.status !== "cancelled" && (
          <Card>
            <CardContent className="p-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="mb-3"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
