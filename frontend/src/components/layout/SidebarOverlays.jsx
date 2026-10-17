'use client';

import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Tooltip } from '@base-ui/react/tooltip';

// Render outside the sidebar's scroll/overflow containers so labels and menus
// remain visible in compact mode. Base UI handles focus and viewport collisions.
export function SidebarPopover({ label, trigger, children, align = 'start' }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Trigger render={trigger} openOnHover delay={120} closeDelay={150} />
      <Popover.Portal>
        <Popover.Positioner side="right" align={align} sideOffset={12} collisionPadding={8} positionMethod="fixed" className="z-[80]">
          <Popover.Popup className="w-64 max-w-[min(calc(100vw-16px),var(--available-width))] max-h-[min(calc(100dvh-16px),var(--available-height))] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#0f172a] p-2 text-slate-300 shadow-xl shadow-black/40 outline-none">
            <Popover.Title className="mb-1 border-b border-white/[0.06] px-2.5 pb-2 pt-1 whitespace-normal break-words [overflow-wrap:anywhere] text-xs font-semibold leading-5 text-white">{label}</Popover.Title>
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function SidebarLabel({ enabled, label, badge = 0, children }) {
  if (!enabled) return children;
  return (
    <Tooltip.Provider delay={150}>
      <Tooltip.Root>
        <Tooltip.Trigger render={children} />
        <Tooltip.Portal>
          <Tooltip.Positioner side="right" sideOffset={12} collisionPadding={8} positionMethod="fixed" className="z-[80]">
            <Tooltip.Popup className="max-w-[min(280px,var(--available-width))] rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 whitespace-normal break-words [overflow-wrap:anywhere] text-xs leading-5 text-white shadow-lg outline-none">
              {label}{badge > 0 && <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold">{badge}</span>}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
