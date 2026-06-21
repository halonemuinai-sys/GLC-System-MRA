'use client';

import React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

export function TooltipProvider({
  delay = 0,
  ...props
}) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

export function Tooltip({
  ...props
}) {
  return <TooltipPrimitive.Root {...props} />;
}

export function TooltipTrigger({
  className,
  ...props
}) {
  return (
    <TooltipPrimitive.Trigger
      className={cn(
        "focus:outline-none shrink-0 inline-flex items-center cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

export function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50 pointer-events-none"
      >
        <TooltipPrimitive.Popup
          className={cn(
            "z-50 inline-flex w-fit max-w-[240px] items-center gap-1.5 rounded-xl bg-neutral-900 dark:bg-neutral-950 px-3.5 py-2.5 text-xs text-white shadow-xl border border-neutral-800/80 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200 text-center leading-normal font-medium",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            className="z-50 size-2 translate-y-[calc(-50%-2px)] rotate-45 rounded-[1px] bg-neutral-900 dark:bg-neutral-950 border-r border-b border-neutral-800/80" 
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
