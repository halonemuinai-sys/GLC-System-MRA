'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Menu, Sun, Moon, Eye, EyeOff, Briefcase, Scale, ShieldCheck } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import NotificationBell from '@/components/ui/NotificationBell';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [hidePrices, setHidePrices] = useState(false);
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    // Read user role and session on mount
    const userRole = Cookies.get('glc_user_role') || '';
    const userName = Cookies.get('glc_user_name') || '';
    setRole(userRole.toLowerCase());
    setFullName(userName);

    // Read initial theme state
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(currentTheme);

    // Read initial hide-prices state
    setHidePrices(localStorage.getItem('hide-prices') === 'true');

    // Live clock update
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    // Clear cookies
    Cookies.remove('glc_mra_token');
    Cookies.remove('glc_user_name');
    Cookies.remove('glc_user_role');
    
    // Redirect to login
    router.refresh();
    router.push('/login');
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  const toggleHidePrices = () => {
    const nextVal = localStorage.getItem('hide-prices') !== 'true';
    localStorage.setItem('hide-prices', String(nextVal));
    setHidePrices(nextVal);
    window.dispatchEvent(new Event('hide-prices-changed'));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden h-screen">
      
      {/* Dynamic Sidebar (collapsible desktop + mobile drawer) */}
      <Sidebar 
        open={isMobileOpen} 
        onClose={() => setIsMobileOpen(false)}
        role={role}
        fullName={fullName}
        handleLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative h-full">
        
        {/* Top Navbar Header */}
        <header className="h-16 border-b border-neutral-200 dark:border-white/[0.05] bg-white/40 dark:bg-neutral-950/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
          
          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="md:hidden p-2 bg-neutral-100 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Right Header Section (Notification Bells + Theme Toggle + Status Indicator) */}
          <div className="flex items-center gap-4 ml-auto">

            {/* Notification Bells — terpisah per departemen, tampil sesuai role user */}
            {(role === 'admin' || role === 'auditor' || role === 'ga') && (
              <NotificationBell label="GA" endpoint="/api/ga/notifications" icon={Briefcase} color="#6366f1" />
            )}
            {(role === 'admin' || role === 'auditor' || role === 'legal' || role === 'legal_compliance') && (
              <NotificationBell label="Legal" endpoint="/api/legal/notifications" icon={Scale} color="#f43f5e" />
            )}
            {(role === 'admin' || role === 'auditor' || role === 'compliance' || role === 'legal_compliance') && (
              <NotificationBell label="Compliance" endpoint="/api/compliance/notifications" icon={ShieldCheck} color="#10b981" />
            )}

            {/* Hide Nominal Toggle Button */}
            <button
              onClick={toggleHidePrices}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title={hidePrices ? 'Tampilkan Angka/Harga' : 'Sembunyikan Angka/Harga'}
            >
              {hidePrices ? <EyeOff className="w-5 h-5 text-red-500" /> : <Eye className="w-5 h-5 text-neutral-500" />}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5 text-xs border-l border-neutral-200 dark:border-white/[0.05] pl-4 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-neutral-600 dark:text-slate-300 font-bold tracking-widest">{timeString || '00:00:00'}</span>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-grow p-6 md:p-8">
          {children}
        </main>
      </div>

    </div>
  );
}
