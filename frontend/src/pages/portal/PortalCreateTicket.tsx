import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  Paperclip,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PortalCreateTicket() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const portalToken = localStorage.getItem("portal_access_token");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !description.trim()) {
        throw new Error("Title and description are required.");
      }

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        priority,
      };
      if (category) payload.category_id = category;

      const response = await api.post("/portal/tickets", payload, {
        headers: {
          Authorization: `Bearer ${portalToken}`,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast({ title: "Ticket created", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["portal", "tickets"] });
      // Navigate to the new ticket
      const ticketId = data.id || data.ticket?.id;
      if (ticketId) {
        navigate(`/portal/tickets/${ticketId}`);
      } else {
        navigate("/portal/dashboard");
      }
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create ticket. Please try again.");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles].slice(0, 5)); // max 5 files
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e]">
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-1">
        <Button variant="ghost" size="sm" onClick={() => navigate("/portal/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-sm text-ink-subtle">New Ticket</span>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-ink">
              Submit a Support Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-semantic-danger/10 border border-semantic-danger/20">
                  <AlertCircle className="h-4 w-4 text-semantic-danger shrink-0 mt-0.5" />
                  <p className="text-xs text-semantic-danger">{error}</p>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="portal-title">
                  Title <span className="text-semantic-danger">*</span>
                </Label>
                <Input
                  id="portal-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of your issue"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="portal-desc">
                  Description <span className="text-semantic-danger">*</span>
                </Label>
                <Textarea
                  id="portal-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={6}
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label htmlFor="portal-priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="portal-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-ink-subtle flex items-center gap-1 mt-1">
                  <HelpCircle className="h-3 w-3" />
                  Use "Critical" only for system outages or urgent security issues.
                </p>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="portal-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="portal-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing / Account</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File attachments */}
              <div className="space-y-1.5">
                <Label>Attachments</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-hairline bg-surface-2 text-sm text-ink-muted hover:bg-surface-3 cursor-pointer transition-colors">
                    <Paperclip className="h-4 w-4" />
                    Choose Files
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpg,.png,.gif,.doc,.docx,.txt,.zip"
                    />
                  </label>
                  <span className="text-xs text-ink-subtle">
                    Max 5 files (PDF, images, documents)
                  </span>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((file, index) => (
                      <Badge
                        key={`${file.name}-${index}`}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="max-w-[120px] truncate text-xs">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-0.5 hover:text-semantic-danger transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/portal/dashboard")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !title.trim() || !description.trim()}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
