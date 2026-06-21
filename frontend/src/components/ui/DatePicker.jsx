'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function DatePicker({ value, onChange, placeholder = 'Pilih tanggal', required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial value (expected: YYYY-MM-DD)
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setCurrentDate(d);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Calculate days in month
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Generate days grid
  const daysArray = [];

  // Previous month padding
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      day: daysInPrevMonth - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push({
      day: i,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  // Next month padding to complete grid (rows of 7 days)
  const remainingCells = 42 - daysArray.length; // 6 rows * 7 days
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  for (let i = 1; i <= remainingCells; i++) {
    daysArray.push({
      day: i,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (item) => {
    const d = new Date(item.year, item.month, item.day);
    // Format to local date string YYYY-MM-DD
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(d);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange('');
    setIsOpen(false);
  };

  // Quick select year & month
  const years = [];
  const currentYear = new Date().getFullYear();
  // Provide 20 years past and 15 years future for GA purposes
  for (let i = currentYear - 20; i <= currentYear + 15; i++) {
    years.push(i);
  }

  const handleMonthChange = (e) => {
    setCurrentDate(new Date(year, parseInt(e.target.value), 1));
  };

  const handleYearChange = (e) => {
    setCurrentDate(new Date(parseInt(e.target.value), month, 1));
  };

  // Format date display (e.g. 21 Juni 2026)
  const formatDateDisplay = (d) => {
    if (!d) return '';
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const isToday = (y, m, d) => {
    const today = new Date();
    return today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  };

  const isSelected = (y, m, d) => {
    return selectedDate && selectedDate.getFullYear() === y && selectedDate.getMonth() === m && selectedDate.getDate() === d;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-805 dark:text-neutral-200 focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[38px] select-none text-[11px]"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
          <span className={selectedDate ? 'text-neutral-850 dark:text-neutral-205 font-medium' : 'text-neutral-450'}>
            {selectedDate ? formatDateDisplay(selectedDate) : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedDate && !required && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-full text-neutral-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <span className="text-[9px] text-neutral-400">▼</span>
        </div>
      </div>

      {/* Date Picker Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            className="absolute z-50 mt-1.5 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-3 flex flex-col gap-3 right-0"
          >
            {/* Header: Controls */}
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-neutral-100 dark:border-neutral-800/60">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-0.5">
                {/* Month Dropdown */}
                <select
                  value={month}
                  onChange={handleMonthChange}
                  className="bg-transparent text-neutral-700 dark:text-neutral-350 text-[11px] font-bold py-0.5 px-1 focus:outline-none rounded hover:bg-neutral-50 dark:hover:bg-neutral-850 cursor-pointer border-0"
                >
                  {monthNames.map((mName, idx) => (
                    <option key={mName} value={idx} className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white">
                      {mName.substring(0, 3)}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={year}
                  onChange={handleYearChange}
                  className="bg-transparent text-neutral-700 dark:text-neutral-350 text-[11px] font-bold py-0.5 px-1 focus:outline-none rounded hover:bg-neutral-50 dark:hover:bg-neutral-850 cursor-pointer font-mono border-0"
                >
                  {years.map(yVal => (
                    <option key={yVal} value={yVal} className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white">
                      {yVal}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-neutral-400">
              {daysOfWeek.map(day => (
                <div key={day} className="py-0.5">{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-mono">
              {daysArray.map((item, idx) => {
                const dayIsSelected = isSelected(item.year, item.month, item.day);
                const dayIsToday = isToday(item.year, item.month, item.day);

                return (
                  <button
                    key={`${item.year}-${item.month}-${item.day}-${idx}`}
                    type="button"
                    onClick={() => handleSelectDay(item)}
                    className={`py-1.5 rounded-lg flex items-center justify-center font-medium cursor-pointer transition-all relative ${
                      dayIsSelected
                        ? 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/25'
                        : item.isCurrentMonth
                        ? 'text-neutral-700 dark:text-neutral-300 hover:bg-indigo-500/10 hover:text-indigo-500'
                        : 'text-neutral-300/60 dark:text-neutral-700/60 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {item.day}
                    {dayIsToday && !dayIsSelected && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/60 justify-end">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  setSelectedDate(today);
                  onChange(formatted);
                  setIsOpen(false);
                }}
                className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 font-bold rounded-lg text-[9px] transition-colors cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-950/30"
              >
                Hari Ini
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
