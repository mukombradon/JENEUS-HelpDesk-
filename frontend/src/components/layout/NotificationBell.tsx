import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Ticket, AlertTriangle, MessageSquare, Clock, AlertOctagon, ArrowUp } from "lucide-react";
import { cn } from "../../lib/utils";
import { useNotifications, useMarkNotificationRead } from "../../hooks/useApi";
import { formatDistanceToNow } from "date-fns";
import type { Notification, NotificationType } from "../../types";

const notificationIconMap: Record<NotificationType, typeof Bell> = {
  ticket_created: Ticket,
  ticket_assigned: Ticket,
  comment_added: MessageSquare,
  status_changed: Clock,
  sla_warning: AlertTriangle,
  sla_breached: AlertOctagon,
  escalated: ArrowUp,
};

const iconBgMap: Record<NotificationType, string> = {
  ticket_created: "bg-primary/10 text-primary",
  ticket_assigned: "bg-primary/10 text-primary",
  comment_added: "bg-semantic-success/10 text-semantic-success",
  status_changed: "bg-semantic-warning/10 text-semantic-warning",
  sla_warning: "bg-semantic-warning/10 text-semantic-warning",
  sla_breached: "bg-semantic-danger/10 text-semantic-danger",
  escalated: "bg-semantic-danger/10 text-semantic-danger",
};

function NotificationIcon({ type }: { type: NotificationType }) {
  const Icon = notificationIconMap[type] || Bell;
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
        iconBgMap[type] || "bg-surface-3 text-ink-muted",
      )}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: notifications = [] } = useNotifications({ limit: 10 });
  const markRead = useMarkNotificationRead();

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: Notification) => !n.is_read).length
    : 0;

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.ticket_id) {
      navigate(`/tickets/${notification.ticket_id}`);
    }
    setOpen(false);
  };

  // Safely convert notifications to array
  const notificationList: Notification[] = Array.isArray(notifications)
    ? notifications.slice(0, 10)
    : [];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-pill bg-semantic-danger px-1 text-[10px] font-semibold leading-tight text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-md border border-hairline bg-surface-2 shadow-lg">
          <div className="border-b border-hairline px-3 py-2">
            <p className="text-sm font-medium text-ink">Notifications</p>
          </div>

          <div className="max-h-[360px] overflow-y-auto scrollbar-dark">
            {notificationList.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-ink-subtle" />
                <p className="text-sm text-ink-subtle">No notifications yet</p>
              </div>
            ) : (
              notificationList.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-3",
                    !notification.is_read && "bg-primary/[0.03]",
                  )}
                >
                  <NotificationIcon type={notification.type} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        !notification.is_read
                          ? "font-medium text-ink"
                          : "text-ink-muted",
                      )}
                    >
                      {notification.message}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {notificationList.length > 0 && (
            <button
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full border-t border-hairline px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-surface-3"
            >
              View all notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}
