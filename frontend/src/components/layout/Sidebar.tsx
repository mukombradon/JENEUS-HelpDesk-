import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  AlertTriangle,
  Building2,
  BookOpen,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../stores/uiStore";

const navigationItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Tickets", to: "/tickets", icon: Ticket },
  { label: "Problems", to: "/problems", icon: AlertTriangle },
  { label: "Clients", to: "/clients", icon: Building2 },
  { label: "Knowledge Base", to: "/knowledge-base", icon: BookOpen },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } =
    useUIStore();

  const handleNavClick = () => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const sidebarContent = (
    <div
      className={cn(
        "flex h-full flex-col bg-canvas",
        sidebarCollapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-hairline px-4",
          sidebarCollapsed ? "justify-center" : "gap-3",
        )}
        style={{ height: "56px" }}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          <img
            src="/logo.jpeg"
            alt="JENEUS"
            className="h-7 w-7 rounded-md object-cover"
          />
        </div>
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold tracking-tight text-ink">
            JENEUS
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-dark">
        <ul className="flex flex-col gap-0.5">
          {navigationItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/dashboard"}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    sidebarCollapsed && "justify-center px-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-hairline px-2 py-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink",
            sidebarCollapsed && "justify-center px-2",
          )}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex h-full flex-col border-r border-hairline bg-canvas transition-all duration-200",
          sidebarCollapsed ? "w-16" : "w-60",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Mobile sidebar panel */}
          <aside className="relative z-50 h-full w-60 border-r border-hairline bg-canvas shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
