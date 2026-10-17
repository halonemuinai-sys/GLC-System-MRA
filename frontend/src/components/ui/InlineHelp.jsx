'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from '@base-ui/react/tooltip';

export default function InlineHelp({ summary, children, label = 'Lihat penjelasan' }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span>{summary}</span>
      <Tooltip.Provider delay={150}>
        <Tooltip.Root open={open} onOpenChange={setOpen}>
          <Tooltip.Trigger
            type="button"
            aria-label={label}
            closeOnClick={false}
            onClick={() => setOpen(true)}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
          >
            <Info className="h-3.5 w-3.5" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner side="top" align="start" sideOffset={8} className="z-[110]">
              <Tooltip.Popup className="max-w-[min(320px,calc(100vw-32px))] rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-xs font-normal leading-relaxed text-slate-100 shadow-xl outline-none">
                {children}
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </span>
  );
}
