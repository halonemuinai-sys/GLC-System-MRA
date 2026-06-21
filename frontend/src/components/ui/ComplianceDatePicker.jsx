'use client';

import React, { forwardRef } from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { id as idLocale } from 'date-fns/locale/id';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import './compliance-datepicker.css';

registerLocale('id', idLocale);

function parseLocalDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatLocalDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TriggerInput = forwardRef(function TriggerInput({ value, onClick, onClear, placeholder }, ref) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[38px] select-none text-xs"
    >
      <div className="flex items-center gap-2 truncate">
        <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
        <span className={value ? 'text-neutral-850 dark:text-neutral-200 font-medium' : 'text-neutral-400'}>
          {value || placeholder}
        </span>
      </div>
      {value && onClear && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400 flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

export default function ComplianceDatePicker({ value, onChange, placeholder = 'Pilih tanggal', required = false }) {
  const selectedDate = parseLocalDate(value);

  return (
    <ReactDatePicker
      selected={selectedDate}
      onChange={(date) => onChange(formatLocalDate(date))}
      customInput={<TriggerInput placeholder={placeholder} onClear={required ? null : () => onChange('')} />}
      dateFormat="d MMMM yyyy"
      locale="id"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      todayButton="Hari Ini"
      popperPlacement="bottom-start"
      popperClassName="compliance-dp-popper"
      calendarClassName="compliance-dp"
      wrapperClassName="w-full"
    />
  );
}
