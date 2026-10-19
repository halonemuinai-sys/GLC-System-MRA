'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import InlineHelp from '@/components/ui/InlineHelp';

// Signature row printed on a Berita Acara: names and titles typed by hand, grouped as
// Dibuat / Diperiksa / Disetujui Oleh. It does not change who approves in the system.
export const SIGNATORY_GROUPS = [
  { key: 'prepared', label: 'Dibuat Oleh', hint: 'Prepared by' },
  { key: 'checked', label: 'Diperiksa Oleh', hint: 'Checked by' },
  { key: 'approved', label: 'Disetujui Oleh', hint: 'Approved by' },
];

export const defaultSignatories = (me) => [
  { group: 'prepared', name: me?.full_name || '', title: me?.position || 'Asset Management' },
  { group: 'checked', name: '', title: 'GA Business Partner' },
  { group: 'checked', name: '', title: 'GA Manager' },
  { group: 'approved', name: '', title: 'Finance Manager' },
  { group: 'approved', name: '', title: 'Direksi' },
];

const inputCls = 'w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

export default function GaSignatoriesEditor({ value = [], onChange }) {
  const rows = value.map((r, index) => ({ ...r, index }));
  const update = (index, patch) => onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index) => onChange(value.filter((_, i) => i !== index));
  const add = (group) => value.length < 10 && onChange([...value, { group, name: '', title: '' }]);

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-bold uppercase text-neutral-500">
        <InlineHelp summary="Signatures on the printed report" label="About signatures">
          <span className="normal-case">Names and titles printed in the signature row of the PDF, as on the paper form. This does not change the approval: the approver above still receives the e-mail link. Leave a name empty to sign by hand.</span>
        </InlineHelp>
      </span>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SIGNATORY_GROUPS.map(g => {
          const groupRows = rows.filter(r => r.group === g.key);
          return (
            <div key={g.key} className="space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">{g.label}, <span className="font-normal text-neutral-400">{g.hint}</span></p>
                <button type="button" onClick={() => add(g.key)} disabled={value.length >= 10} aria-label={`Add signatory to ${g.label}`} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40 dark:text-blue-400 dark:hover:bg-blue-500/10 cursor-pointer"><Plus className="h-3 w-3" />Add</button>
              </div>
              {!groupRows.length && <p className="text-[10px] text-neutral-400">Nobody — this column is left out.</p>}
              {groupRows.map(r => (
                <div key={r.index} className="flex items-start gap-1.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <input aria-label={`${g.label} name`} value={r.name} maxLength={120} onChange={e => update(r.index, { name: e.target.value })} placeholder="Name (empty = sign by hand)" className={`${inputCls} font-semibold`} />
                    <input aria-label={`${g.label} title`} value={r.title} maxLength={100} onChange={e => update(r.index, { title: e.target.value })} placeholder="Title, e.g. GA Manager" className={inputCls} />
                  </div>
                  <button type="button" onClick={() => remove(r.index)} aria-label="Remove signatory" className="mt-1 rounded-md p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
