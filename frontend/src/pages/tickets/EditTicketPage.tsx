import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Tag,
  Building,
  User,
  Layers,
  ListTree,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
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
  Ticket,
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

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function EditSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-hairline">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex gap-6 p-6">
        <div className="flex-1 space-y-6">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-48" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-32" />
        </div>
        <div className="w-80 space-y-6">
          <Skeleton className="h-52" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EditTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Load ticket ─────────────────────────────────────────────────────

  const {
    data: ticket,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["tickets", "detail", id],
    queryFn: () => api.get<Ticket>(`/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  });

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
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Populate from ticket data ──────────────────────────────────────

  useEffect(() => {
    if (ticket && !initialized) {
      setType(ticket.type);
      setTitle(ticket.title);
      setDescription(ticket.description);
      setClientId(ticket.client_id);
      setContactId(ticket.contact_id);
      setCategoryId(ticket.category_id);
      setSubcategoryId(ticket.subcategory_id ?? "");
      setPriority(ticket.priority);
      setAssignedAgentId(ticket.assigned_agent_id ?? "");
      setAssignedTeamId(ticket.assigned_team_id ?? "");
      setTagsInput((ticket.tags ?? []).join(", "));
      setInitialized(true);
    }
  }, [ticket, initialized]);

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

  // ── Validation ──────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!clientId) errs.clientId = "Client is required";
    if (!categoryId) errs.categoryId = "Category is required";
    if (!priority) errs.priority = "Priority is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [title, clientId, categoryId, priority]);

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
        else payload.assigned_agent_id = null;
        if (assignedTeamId) payload.assigned_team_id = assignedTeamId;
        else payload.assigned_team_id = null;

        // Tags
        const tags = tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        payload.tags = tags;

        await api.patch(`/tickets/${id}`, payload);

        toast({
          title: "Ticket updated",
          description: "The ticket has been updated successfully.",
          variant: "success",
        });

        navigate(`/tickets/${id}`);
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
            : "Failed to update ticket.";
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
      id,
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
      navigate,
    ]
  );

  // ── Reset dependent fields ──────────────────────────────────────────

  useEffect(() => {
    if (initialized) setSubcategoryId("");
  }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading state ──────────────────────────────────────────────────

  if (isLoading) {
    return <EditSkeleton />;
  }

  // ── Error state ─────────────────────────────────────────────────────

  if (isError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-24">
        <div className="rounded-pill bg-surface-3 p-4 mb-4">
          <AlertTriangle className="h-8 w-8 text-semantic-danger" />
        </div>
        <h2 className="text-lg font-semibold text-ink mb-1">
          Ticket not found
        </h2>
        <p className="text-sm text-ink-subtle mb-6 max-w-sm">
          The ticket you're trying to edit doesn't exist or you don't have
          permission to edit it.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Tickets
          </Button>
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/tickets/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-ink">
            Edit {ticket.ticket_number}
          </h1>
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
                  <SelectItem value="">Unassigned</SelectItem>
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
                  <SelectItem value="">No team</SelectItem>
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
              onClick={() => navigate(`/tickets/${id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
