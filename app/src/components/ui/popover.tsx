"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

// Wrapper shadcn/Radix estándar. PopoverContent usa Portal interno de Radix
// para escapar del `overflow-auto` del layout principal — mismo motivo que
// justifica el portal en `modal.tsx`.

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

type PopoverContentProps = React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
>;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(function PopoverContent(
  { className, align = "start", sideOffset = 4, ...props },
  ref
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-xl outline-none",
          "data-[state=open]:animate-fade-in",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
