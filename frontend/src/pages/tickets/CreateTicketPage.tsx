import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Upload,
  Paperclip,
  X,
  AlertCircle,
  Tag,
  Building,
  User,
  Layers,
  ListTree,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card } from "../../components/ui/card";
import { toast } from "../../components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import api from "../../lib/api";
import type {
  Client,
  ClientContact,
  User as Agent,
  Team,
  Category,
  Subcategory,
  TicketType,
  Priority,
} from "../../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "bg-priority-critical" },
  { value: "high", label: "High", color: "bg-priority-high" },
  { value: "medium", label: "Medium", color: "bg-priority-medium" },
  { value: "low", label: "Low", color: "bg-priority-low" },
];

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CreateTicketPage() {
  const navigate = useNavigate();

  // ── Form state ──────────────────────────────────────────────────────

  const [type, setType] = useState<TicketType>("incident");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactId, setContactId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [assignedTeamId, setAssignedTeamId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validation ──────────────────────────────────────────────────────

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!clientId) errs.clientId = "Client is required";
    if (!categoryId) errs.categoryId = "Category is required";
    if (!priority) errs.priority = "Priority is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [title, clientId, categoryId, priority]);

  // ── Data fetching ───────────────────────────────────────────────────

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "list", { limit: 200 }],
    queryFn: () =>
      api
        .get<{ data: Client[] }>("/clients", { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["clients", "contacts", clientId],
    queryFn: () =>
      api
        .get<ClientContact[]>(`/clients/${clientId}/contacts`)
        .then((r) => r.data),
    enabled: !!clientId,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["users", "list", { limit: 200 }],
    queryFn: () =>
      api
        .get<{ data: Agent[] }>("/users", { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<Team[]>("/teams").then((r) => r.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories").then((r) => r.data),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["categories", "subcategories", categoryId],
    queryFn: () =>
      api
        .get<Subcategory[]>(`/categories/${categoryId}/subcategories`)
        .then((r) => r.data),
    enabled: !!categoryId,
  });

  // ── Submit ──────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setSubmitting(true);
      try {
        const payload: Record<string, unknown> = {
          type,
          title: title.trim(),
          description: description.trim() || "<p></p>",
          client_id: clientId,
          contact_id: contactId,
          category_id: categoryId,
          priority,
        };

        if (subcategoryId) payload.subcategory_id = subcategoryId;
        if (assignedAgentId) payload.assigned_agent_id = assignedAgentId;
        if (assignedTeamId) payload.assigned_team_id = assignedTeamId;

        // Parse tags
        const tags = tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        if (tags.length > 0) payload.tags = tags;

        // Upload attachments
        const fileAttachments = attachments.length > 0 ? attachments : undefined;

        const { data: ticket } = await api.post("/tickets", payload);

        // If there are files, upload them to the created ticket
        if (fileAttachments && ticket?.id) {
          const formData = new FormData();
          fileAttachments.forEach((f) => formData.append("files", f));
          await api.post(`/tickets/${ticket.id}/attachments`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }

        toast({
          title: "Ticket created",
          description: `Ticket has been created successfully.`,
          variant: "success",
        });

        navigate(`/tickets/${ticket.id}`);
      } catch (err: unknown) {
        const message =
          err instanceof Object &&
          "response" in err &&
          err.response instanceof Object &&
          "data" in err.response &&
          typeof err.response.data === "object" &&
          err.response.data !== null &&
          "message" in err.response.data
            ? String((err.response.data as { message: string }).message)
            : "Failed to create ticket.";
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [
      validate,
      type,
      title,
      description,
      clientId,
      contactId,
      categoryId,
      subcategoryId,
      priority,
      assignedAgentId,
      assignedTeamId,
      tagsInput,
      attachments,
      navigate,
    ]
  );

  // ── File management ─────────────────────────────────────────────────

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = MAX_FILES - attachments.length;
      const toAdd = fileArray.slice(0, remaining);

      const oversized = toAdd.filter((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
      if (oversized.length > 0) {
        toast({
          title: "File too large",
          description: `${oversized[0]!.name} exceeds 25MB limit.`,
          variant: "error",
        });
        return;
      }

      setAttachments((prev) => [...prev, ...toAdd]);
    },
    [attachments.length]
  );

  const removeFile = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Reset contact and subcategory when their parents change
  useEffect(() => {
    setContactId("");
  }, [clientId]);

  useEffect(() => {
    setSubcategoryId("");
  }, [categoryId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-ink">Create Ticket</h1>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto scrollbar-dark"
      >
        <div className="flex gap-6 p-6 max-w-6xl mx-auto">
          {/* Left column - main fields */}
          <div className="flex-1 space-y-6">
            {/* Type toggle */}
            <div>
              <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
                Type
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "incident" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setType("incident")}
                >
                  Incident
                </Button>
                <Button
                  type="button"
                  variant={type === "problem" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setType("problem")}
                >
                  Problem
                </Button>
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="mb-1.5 block text-sm text-ink">
                Title <span className="text-semantic-danger">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder="Brief description of the issue"
                className={errors.title ? "border-semantic-danger" : ""}
              />
              {errors.title && (
                <p className="text-xs text-semantic-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1.5 block text-sm text-ink">
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the issue..."
                className="min-h-[200px]"
              />
            </div>

            {/* Client */}
            <div>
              <Label className="mb-1.5 block text-sm text-ink">
                Client <span className="text-semantic-danger">*</span>
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <Select
                  value={clientId}
                  onValueChange={(val) => {
                    setClientId(val);
                    if (errors.clientId)
                      setErrors((prev) => ({ ...prev, clientId: "" }));
                  }}
                >
                  <SelectTrigger className={cn("pl-9", errors.clientId ? "border-semantic-danger" : "")}>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.clientId && (
                <p className="text-xs text-semantic-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.clientId}
                </p>
              )}
            </div>

            {/* Contact */}
            <div>
              <Label className="mb-1.5 block text-sm text-ink">
                Contact
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <Select
                  value={contactId}
                  onValueChange={setContactId}
                  disabled={!clientId || contacts.length === 0}
                >
                  <SelectTrigger className="pl-9">
                    <SelectValue
                      placeholder={
                        !clientId
                          ? "Select a client first"
                          : contacts.length === 0
                            ? "No contacts found"
                            : "Select a contact"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className="mb-1.5 block text-sm text-ink">
                Category <span className="text-semantic-danger">*</span>
              </Label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <Select
                  value={categoryId}
                  onValueChange={(val) => {
                    setCategoryId(val);
                    if (errors.categoryId)
                      setErrors((prev) => ({ ...prev, categoryId: "" }));
                  }}
                >
                  <SelectTrigger className={cn("pl-9", errors.categoryId ? "border-semantic-danger" : "")}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.categoryId && (
                <p className="text-xs text-semantic-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.categoryId}
                </p>
              )}
            </div>

            {/* Subcategory */}
            <div>
              <Label className="mb-1.5 block text-sm text-ink">
                Subcategory
              </Label>
              <div className="relative">
                <ListTree className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <Select
                  value={subcategoryId}
                  onValueChange={setSubcategoryId}
                  disabled={!categoryId || subcategories.length === 0}
                >
                  <SelectTrigger className="pl-9">
                    <SelectValue
                      placeholder={
                        !categoryId
                          ? "Select a category first"
                          : subcategories.length === 0
                            ? "No subcategories"
                            : "Select subcategory (optional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="mb-1.5 block text-sm text-ink">Tags</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Comma-separated tags (e.g., billing, urgent, hardware)"
                  className="pl-9"
                />
              </div>
              {tagsInput.trim() && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tagsInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-pill bg-surface-3 px-2.5 py-0.5 text-xs text-ink-muted border border-hairline"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <Label className="mb-1.5 block text-sm text-ink">
                Attachments
              </Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-md p-6 text-center transition-colors cursor-pointer",
                  attachments.length > 0
                    ? "border-primary/50 bg-primary/5"
                    : "border-hairline hover:border-hairline-strong"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                  }}
                />
                <Upload className="h-8 w-8 text-ink-subtle mx-auto mb-2" />
                <p className="text-sm text-ink-muted">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-ink-subtle mt-1">
                  Max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1 mt-2">
                  {attachments.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-3 border border-hairline"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-ink-subtle shrink-0" />
                      <span className="text-sm text-ink-muted flex-1 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-ink-subtle shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-ink-subtle hover:text-semantic-danger transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column - metadata */}
          <div className="w-80 shrink-0 space-y-6">
            {/* Priority */}
            <Card className="p-4">
              <Label className="mb-3 block text-ink-subtle text-xs uppercase tracking-wider">
                Priority <span className="text-semantic-danger">*</span>
              </Label>
              <div className="space-y-2">
                {PRIORITIES.map((p) => (
                  <label
                    key={p.value}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors",
                      priority === p.value
                        ? "border-primary bg-primary/5"
                        : "border-hairline bg-surface-1 hover:bg-surface-3"
                    )}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p.value}
                      checked={priority === p.value}
                      onChange={() => {
                        setPriority(p.value);
                        if (errors.priority)
                          setErrors((prev) => ({ ...prev, priority: "" }));
                      }}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "h-3 w-3 rounded-pill shrink-0",
                        p.color
                      )}
                    />
                    <span className="text-sm text-ink flex-1">{p.label}</span>
                    {priority === p.value && (
                      <span className="h-2 w-2 rounded-pill bg-primary" />
                    )}
                  </label>
                ))}
              </div>
              {errors.priority && (
                <p className="text-xs text-semantic-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.priority}
                </p>
              )}
            </Card>

            {/* Assigned Agent */}
            <Card className="p-4">
              <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
                Assigned Agent
              </Label>
              <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.first_name} {a.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {/* Assigned Team */}
            <Card className="p-4">
              <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
                Assigned Team
              </Label>
              <Select value={assignedTeamId} onValueChange={setAssignedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="sticky bottom-0 border-t border-hairline bg-surface-1 px-6 py-3">
          <div className="flex items-center justify-end gap-3 max-w-6xl mx-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/tickets")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
