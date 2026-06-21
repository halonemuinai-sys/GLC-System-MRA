'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [devLink, setDevLink] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await apiClient.post('/api/auth/forgot-password', {
        email: data.email,
      });

      setSentEmail(data.email);
      setDevLink(response?.resetUrl || '');
      setSent(true);
    } catch (err) {
      setApiError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    'w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm ' +
    'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ' +
    'focus:border-indigo-400 transition-all';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white font-sans p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </Link>

        <div className="flex items-center gap-4 mb-7">
          <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-150 flex items-center justify-center shadow-sm flex-shrink-0 p-1.5">
            <img src="/mra_logo.png" alt="MRA Group Logo" className="max-w-full max-h-full object-contain" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">Forgot Password</h2>
            <p className="text-sm text-gray-400 mt-0.5">Enter your account email to receive a reset link</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  If an account with <span className="font-semibold">{sentEmail}</span> exists, a password reset link has been sent.
                </span>
              </div>

              {devLink && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 mb-1.5 uppercase tracking-wide">Dev Mode — Reset Link</p>
                  <Link href={devLink.replace(/^https?:\/\/[^/]+/, '')} className="text-xs text-indigo-600 break-all underline hover:no-underline">
                    {devLink}
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={() => { setSent(false); setDevLink(''); reset(); }}
                className="text-sm font-semibold text-indigo-500 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Try a different email
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {apiError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-lg shadow-indigo-200 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
