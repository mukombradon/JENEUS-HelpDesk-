import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-canvas",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border border-primary/30",
        secondary:
          "bg-surface-3 text-ink-muted border border-hairline",
        outline: "border border-hairline text-ink bg-transparent",
        success:
          "bg-semantic-success/15 text-semantic-success border border-semantic-success/30",
        warning:
          "bg-semantic-warning/15 text-semantic-warning border border-semantic-warning/30",
        danger:
          "bg-semantic-danger/15 text-semantic-danger border border-semantic-danger/30",
        open: "bg-status-open/15 text-status-open border border-status-open/30",
        "in-progress":
          "bg-status-in-progress/15 text-status-in-progress border border-status-in-progress/30",
        pending:
          "bg-status-pending/15 text-status-pending border border-status-pending/30",
        resolved:
          "bg-status-resolved/15 text-status-resolved border border-status-resolved/30",
        closed:
          "bg-status-closed/15 text-status-closed border border-status-closed/30",
        cancelled:
          "bg-status-cancelled/15 text-status-cancelled border border-status-cancelled/30",
        critical:
          "bg-priority-critical/15 text-priority-critical border border-priority-critical/30",
        high: "bg-priority-high/15 text-priority-high border border-priority-high/30",
        medium:
          "bg-priority-medium/15 text-priority-medium border border-priority-medium/30",
        low: "bg-priority-low/15 text-priority-low border border-priority-low/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
