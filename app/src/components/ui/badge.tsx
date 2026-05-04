import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/15 text-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        destructive:
          "border-destructive/40 bg-destructive/10 text-destructive-foreground",
        active: "border-primary/50 bg-primary/20 text-foreground",
        inactive: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
