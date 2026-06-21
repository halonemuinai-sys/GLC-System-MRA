'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

// Login Validation Schema using Zod
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Deterministic particles for the left panel graphic
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: ((i * 41 + 11) % 88) + 6,
  top: ((i * 37 + 7) % 82) + 6,
  size: i % 4 === 0 ? 5 : i % 3 === 0 ? 4 : 3,
  duration: 4 + (i % 4),
  delay: (i * 0.4) % 3,
  yOffset: i % 2 === 0 ? -10 : 10,
}));

// Left Panel Component
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex w-[52%] relative overflow-hidden flex-col items-center justify-center h-screen select-none"
      style={{ background: 'linear-gradient(140deg, #dde4ff 0%, #e8e2ff 35%, #ede9fe 65%, #f5f3ff 100%)' }}
    >
      {/* Circuit SVG lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="25%" x2="30%" y2="25%" stroke="#6366f1" strokeWidth="1" />
        <line x1="30%" y1="25%" x2="30%" y2="12%" stroke="#6366f1" strokeWidth="1" />
        <line x1="30%" y1="12%" x2="55%" y2="12%" stroke="#6366f1" strokeWidth="1" />
        <circle cx="30%" cy="25%" r="3" fill="#6366f1" />
        <circle cx="55%" cy="12%" r="3" fill="#6366f1" />

        <line x1="100%" y1="35%" x2="72%" y2="35%" stroke="#6366f1" strokeWidth="1" />
        <line x1="72%" y1="35%" x2="72%" y2="55%" stroke="#6366f1" strokeWidth="1" />
        <line x1="72%" y1="55%" x2="88%" y2="55%" stroke="#6366f1" strokeWidth="1" />
        <circle cx="72%" cy="35%" r="3" fill="#6366f1" />
        <circle cx="72%" cy="55%" r="3" fill="#6366f1" />

        <line x1="0" y1="68%" x2="22%" y2="68%" stroke="#6366f1" strokeWidth="1" />
        <line x1="22%" y1="68%" x2="22%" y2="82%" stroke="#6366f1" strokeWidth="1" />
        <line x1="22%" y1="82%" x2="45%" y2="82%" stroke="#6366f1" strokeWidth="1" />
        <circle cx="22%" cy="68%" r="3" fill="#6366f1" />
        <circle cx="45%" cy="82%" r="3" fill="#6366f1" />

        <line x1="100%" y1="78%" x2="78%" y2="78%" stroke="#6366f1" strokeWidth="1" />
        <line x1="78%" y1="78%" x2="78%" y2="92%" stroke="#6366f1" strokeWidth="1" />
        <circle cx="78%" cy="78%" r="3" fill="#6366f1" />
      </svg>

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-400/50"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
          animate={{ y: [0, p.yOffset, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-14 gap-7">
        
        {/* Logo Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-28 h-28 rounded-[2rem] bg-white shadow-2xl shadow-indigo-200/60 flex items-center justify-center border border-indigo-100"
        >
          <ShieldCheck className="w-14 h-14 text-indigo-600" strokeWidth={1.8} />
        </motion.div>

        {/* Badge Pill */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 border border-indigo-100 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
          <span className="text-sm font-medium text-indigo-700">GA • Legal • Compliance</span>
        </motion.div>

        {/* Jargon & Titles */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h1 className="text-5xl font-black text-gray-900 leading-tight tracking-tight">
            MRA<br />OpsSuite
          </h1>
          <p className="text-gray-500 mt-3 text-base font-medium">
            Manage assets. Control compliance. Mitigate legal risks.
          </p>
        </motion.div>

        {/* Bottom Mockup widgets */}
        <div className="flex items-end gap-4 mt-2">
          {/* Chart Card */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="bg-white rounded-2xl shadow-xl shadow-indigo-100/80 p-4 w-44 border border-indigo-50"
          >
            <div className="flex items-center justify-center mb-3">
              <svg viewBox="0 0 64 64" className="w-14 h-14">
                <circle cx="32" cy="32" r="24" fill="none" stroke="#e0e7ff" strokeWidth="10" />
                <circle cx="32" cy="32" r="24" fill="none" stroke="#6366f1" strokeWidth="10"
                  strokeDasharray="96 55" strokeLinecap="round"
                  transform="rotate(-90 32 32)" />
                <circle cx="32" cy="32" r="24" fill="none" stroke="#a5b4fc" strokeWidth="10"
                  strokeDasharray="40 111" strokeDashoffset="-96" strokeLinecap="round"
                  transform="rotate(-90 32 32)" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 bg-indigo-100 rounded-full w-full" />
              <div className="h-2 bg-indigo-50 rounded-full w-3/4" />
              <div className="h-2 bg-indigo-50 rounded-full w-1/2" />
            </div>
          </motion.div>

          {/* Checklist Card */}
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            className="bg-white rounded-2xl shadow-xl shadow-indigo-100/80 p-4 w-36 border border-indigo-50"
          >
            {[true, true, false].map((done, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-indigo-500' : 'bg-gray-100 border border-gray-200'}`}>
                  {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <div className={`h-2 rounded-full flex-1 ${done ? 'bg-gray-200' : 'bg-gray-100'}`} />
              </div>
            ))}
          </motion.div>
        </div>

      </div>
    </div>
  );
}

// Main Login Screen
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setApiError(null);

    try {
      // Call authentication endpoint
      const response = await apiClient.post('/api/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (response && response.token) {
        // Save token in cookies with a 1-day expiration
        Cookies.set('glc_mra_token', response.token, { expires: 1 });
        
        // Save essential user info in cookies (non-httpOnly for sidebar role checking)
        Cookies.set('glc_user_name', response.user.full_name, { expires: 1 });
        Cookies.set('glc_user_role', response.user.role, { expires: 1 });

        // Redirect to dashboard page
        router.refresh();
        router.push('/dashboard');
      } else {
        setApiError('Invalid response received from authentication server.');
      }
    } catch (err) {
      setApiError(err.message || 'Login failed. Please check your credentials and network.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "w-full pl-11 pr-11 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm " +
    "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 " +
    "focus:border-indigo-400 transition-all";

  return (
    <div className="min-h-screen w-full flex bg-white font-sans h-screen overflow-hidden">
      
      {/* Decorative left panel */}
      <LeftPanel />

      {/* Right Login form panel */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 md:p-16 bg-white overflow-y-auto h-full">
        <div className="w-full max-w-md">

          {/* Mobile top logo (shows only on small screens) */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">MRA</span>
          </div>

          <div className="space-y-7">
            {/* Form Title & Subtitle Header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-indigo-600" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">Welcome Back</h2>
                <p className="text-sm text-gray-400 mt-0.5">Sign in to your MRA account to continue</p>
              </div>
            </div>

            {/* Error notifications */}
            {apiError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Credentials Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <input 
                    {...register('email')} 
                    type="email" 
                    placeholder="Enter your work email" 
                    className={inputCls} 
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  <span className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={inputCls}
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Sign In Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="relative w-full overflow-hidden flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-lg shadow-indigo-200 cursor-pointer"
              >
                {/* Shine animation effect overlay */}
                <motion.div
                  className="absolute inset-0 -skew-x-12"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                  initial={{ x: '-200%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                />
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

            </form>

            {/* Footer helper */}
            <p className="text-center text-sm text-gray-400">
              Don't have access?{' '}
              <span className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer">
                Contact Administrator
              </span>
            </p>

          </div>
        </div>
      </div>

    </div>
  );
}
