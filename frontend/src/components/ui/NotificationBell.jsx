'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const STATUS_DOT = {
  Expired: 'bg-red-500',
  Critical: 'bg-orange-500',
  Warning: 'bg-amber-500'
};

const STATUS_TEXT = {
  Expired: 'text-red-500',
  Critical: 'text-orange-500',
  Warning: 'text-amber-500'
};

function daysLabel(days) {
  if (days === null || days === undefined) return '';
  if (days < 0) return `Lewat ${Math.abs(days)} hari`;
  if (days === 0) return 'Hari ini';
  return `${days} hari lagi`;
}

// Bell notifikasi per departemen — setiap instance independen (endpoint, role, dan
// state masing-masing terpisah total), dipakai berulang di header dengan config beda
export default function NotificationBell({ label, endpoint, icon: Icon = Bell, color = '#6366f1' }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(endpoint);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(`Failed to fetch notifications for ${label}`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, label]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = (link) => {
    setIsOpen(false);
    if (link) router.push(link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
        title={`Notifikasi ${label}`}
      >
        <Icon className="w-5 h-5" style={total > 0 ? { color } : undefined} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-bold text-neutral-800 dark:text-white flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                Notifikasi {label}
              </span>
              {total > 0 && <span className="text-[10px] text-neutral-400 font-semibold">{total} item</span>}
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  <span className="text-[11px]">Tidak ada notifikasi {label}.</span>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.link)}
                      className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer flex items-start gap-2.5"
                    >
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[item.status] || 'bg-neutral-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-neutral-800 dark:text-slate-200 truncate">{item.title}</p>
                        <p className="text-[10px] text-neutral-400 truncate">{item.subtitle}</p>
                        <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${STATUS_TEXT[item.status] || 'text-neutral-400'}`}>
                          <Calendar className="w-3 h-3" />
                          {daysLabel(item.daysLeft)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
