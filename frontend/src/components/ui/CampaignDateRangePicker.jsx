'use client';

import React, { forwardRef } from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { id as idLocale } from 'date-fns/locale/id';
import { Calendar as CalendarIcon, ArrowRight, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import './campaign-daterange-picker.css';

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

function formatDisplay(date) {
  if (!date) return null;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const RangeTriggerInput = forwardRef(function RangeTriggerInput({ start, end, onClick, onClear, placeholder }, ref) {
  const hasValue = start || end;
  return (
    <div
      ref={ref}
      onClick={onClick}
      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between gap-2 cursor-pointer min-h-[38px] select-none text-xs"
    >
      <div className="flex items-center gap-2 truncate">
        <CalendarIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
        {hasValue ? (
          <span className="flex items-center gap-1.5 text-neutral-850 dark:text-neutral-200 font-bold truncate">
            {formatDisplay(start) || '...'}
            <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
            {formatDisplay(end) || '...'}
          </span>
        ) : (
          <span className="text-neutral-400">{placeholder}</span>
        )}
      </div>
      {hasValue && onClear && (
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

export default function CampaignDateRangePicker({ startValue, endValue, onChange, placeholder = 'Pilih rentang tanggal campaign' }) {
  const startDate = parseLocalDate(startValue);
  const endDate = parseLocalDate(endValue);

  return (
    <ReactDatePicker
      selectsRange
      startDate={startDate}
      endDate={endDate}
      onChange={(dates) => {
        const [start, end] = dates;
        onChange({ start: formatLocalDate(start), end: formatLocalDate(end) });
      }}
      customInput={
        <RangeTriggerInput
          start={startDate}
          end={endDate}
          placeholder={placeholder}
          onClear={() => onChange({ start: '', end: '' })}
        />
      }
      monthsShown={2}
      locale="id"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      popperPlacement="bottom-start"
      popperClassName="campaign-dp-popper"
      calendarClassName="campaign-dp"
      wrapperClassName="w-full"
    />
  );
}
