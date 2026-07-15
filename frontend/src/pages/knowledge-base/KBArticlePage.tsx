import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  User,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";
import type { KnowledgeArticle } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ArticleSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-8 w-3/4" />
      <div className="flex gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-28" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KBArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Fetch article
  const {
    data: article,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["kb", "article", id],
    queryFn: () => api.get<KnowledgeArticle>(`/kb/articles/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/kb/articles/${id}`),
    onSuccess: () => {
      toast({ title: "Article deleted", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["kb", "articles"] });
      navigate("/knowledge-base");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete article.", variant: "error" });
    },
  });

  // Feedback handler
  const handleFeedback = async (helpful: boolean) => {
    setFeedbackSubmitting(true);
    try {
      await api.post(`/kb/articles/${id}/feedback`, { helpful });
      toast({
        title: helpful ? "Marked as helpful" : "Feedback recorded",
        variant: "success",
      });
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to submit feedback.", variant: "error" });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-dark">
          <ArticleSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !article) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-24">
        <div className="rounded-pill bg-surface-3 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-semantic-danger" />
        </div>
        <h2 className="text-lg font-semibold text-ink mb-1">
          Article not found
        </h2>
        <p className="text-sm text-ink-subtle mb-6 max-w-sm">
          The article you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate("/knowledge-base")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Knowledge Base
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/knowledge-base")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-ink truncate max-w-md">
            {article.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/knowledge-base/${id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-semantic-danger border-semantic-danger/30 hover:bg-semantic-danger/10"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this article?")) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-dark">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-subtle">
            {article.category_id && (
              <Badge variant="secondary" className="text-[11px]">
                {article.category_id.slice(0, 8)}
              </Badge>
            )}
            {!article.is_published ? (
              <Badge variant="warning" className="text-[11px]">
                Draft
              </Badge>
            ) : (
              <Badge variant="success" className="text-[11px]">
                Published
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.view_count ?? 0} views
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {article.helpful_count ?? 0} found helpful
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.author_id ? article.author_id.slice(0, 8) : "Unknown"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Updated {formatDate(article.updated_at || article.created_at)}
            </span>
          </div>

          <Separator />

          {/* Article content (rendered HTML) */}
          <div
            className="prose prose-invert max-w-none text-sm text-ink leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.content || "" }}
          />

          <Separator />

          {/* Feedback section */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-ink font-medium">
                  Was this article helpful?
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackSubmitting}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Yes ({article.helpful_count ?? 0})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackSubmitting}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    No
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related articles */}
          {/* NOTE: Related articles could be fetched separately if the API supports it */}
        </div>
      </div>
    </div>
  );
}
