'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  User,
  Users,
  Key,
  Database,
  Search,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Eye,
  AlertTriangle,
  Lock,
  FileSpreadsheet,
  Activity,
  UserCheck,
  UserMinus
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const ROLE_BADGES = {
  admin: 'bg-red-500/10 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900/30',
  ga: 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30',
  legal: 'bg-purple-500/10 text-purple-650 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30',
  compliance: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30',
  legal_compliance: 'bg-cyan-500/10 text-cyan-650 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/30',
  auditor: 'bg-amber-500/10 text-amber-650 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
};

const MODULE_LABELS = {
  ga: 'General Affairs (Aset & Kendaraan)',
  legal: 'Legal (Kontrak & Asuransi)',
  compliance: 'Compliance (Lisensi & Kepatuhan)',
  admin: 'Admin Panel (Pengaturan Sistem)'
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'permissions', 'logs'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Users State
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    role: 'ga',
    password: ''
  });

  // Password Reset State
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Permissions State
  const [permissions, setPermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [hasPermissionChanges, setHasPermissionChanges] = useState(false);

  // Audit Logs State
  const [logs, setLogs] = useState([]);
  const [logMeta, setLogMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [logPage, setLogPage] = useState(1);
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logTableFilter, setLogTableFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // FETCH DATA FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/admin/users', {
        params: {
          search: searchQuery || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined
        }
      });
      setUsers(res || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/admin/permissions');
      setPermissions(res || []);
      setOriginalPermissions(JSON.parse(JSON.stringify(res || [])));
      setHasPermissionChanges(false);
    } catch (err) {
      setError(err.message || 'Gagal memuat hak akses peran.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/admin/audit-logs', {
        params: {
          page: logPage,
          limit: 15,
          search: logSearch || undefined,
          action: logActionFilter || undefined,
          table: logTableFilter || undefined
        }
      });
      setLogs(res.data || []);
      setLogMeta(res.meta || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Gagal memuat log audit sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'permissions') {
      fetchPermissions();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, searchQuery, roleFilter, statusFilter, logPage, logActionFilter, logTableFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // USER SUBMIT & HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      full_name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      role: 'ga',
      password: ''
    });
    setShowUserDrawer(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || '',
      role: user.role || 'ga',
      password: '' // Don't pre-fill password for edit
    });
    setShowUserDrawer(true);
  };

  const handleCloseUserDrawer = () => {
    setShowUserDrawer(false);
    setEditingUser(null);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingUser(true);
      if (editingUser) {
        // Edit User
        const payload = { ...userFormData };
        delete payload.password; // Do not send password on standard edit
        await apiClient.put(`/api/admin/users/${editingUser.id}`, payload);
      } else {
        // Create User
        await apiClient.post('/api/admin/users', userFormData);
      }
      setShowUserDrawer(false);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan data pengguna.');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const actionText = user.is_active ? 'menonaktifkan' : 'mengaktifkan';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} akun ${user.full_name}?`)) return;

    try {
      await apiClient.put(`/api/admin/users/${user.id}`, { is_active: !user.is_active });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Gagal mengubah status pengguna.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password baru minimal 6 karakter.');
      return;
    }
    try {
      setResettingPassword(true);
      await apiClient.put(`/api/admin/users/${userToResetPassword.id}/reset-password`, { new_password: newPassword });
      alert(`Password untuk ${userToResetPassword.full_name} berhasil di-reset.`);
      setUserToResetPassword(null);
      setNewPassword('');
    } catch (err) {
      alert(err.message || 'Gagal melakukan reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ROLE PERMISSIONS MATRIX HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handlePermissionChange = (permId, field, value) => {
    const updated = permissions.map(p => {
      if (p.id === permId) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setPermissions(updated);

    // Check if there are any changes compared to original
    let changesFound = false;
    for (const item of updated) {
      const orig = originalPermissions.find(o => o.id === item.id);
      if (orig && (orig.can_read !== item.can_read || orig.can_write !== item.can_write)) {
        changesFound = true;
        break;
      }
    }
    setHasPermissionChanges(changesFound);
  };

  const handleSavePermissions = async () => {
    try {
      setSavingPermissions(true);
      await apiClient.put('/api/admin/permissions', { permissions });
      setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
      setHasPermissionChanges(false);
      alert('Hak akses peran berhasil disimpan.');
    } catch (err) {
      alert(err.message || 'Gagal menyimpan hak akses.');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleResetPermissions = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
    setHasPermissionChanges(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERING & HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const renderTabButton = (tab, icon, label) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => {
          setActiveTab(tab);
          setError(null);
        }}
        className="relative flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer select-none border border-transparent"
      >
        {isActive && (
          <motion.span
            layoutId="activeAdminTab"
            className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/10 z-0"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <span className={`relative z-10 flex items-center gap-2 transition-colors duration-200 ${
          isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
        }`}>
          {icon}
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-500" />
            Admin Panel
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Konfigurasi hak akses, kelola akun pengguna, dan pantau log aktivitas sistem.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <motion.div layout className="flex flex-wrap items-center gap-2.5">
        {renderTabButton('users', <Users className="w-4 h-4" />, 'Manajemen User')}
        {renderTabButton('permissions', <Key className="w-4 h-4" />, 'Hak Akses Peran')}
        {renderTabButton('logs', <Database className="w-4 h-4" />, 'Log Audit Sistem')}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 1: MANAJEMEN USER
            ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-4"
          >
          {/* Filters Bar */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-2xl">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Cari user berdasarkan nama/email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none cursor-pointer"
              >
                <option value="">Semua Peran</option>
                <option value="admin">Admin</option>
                <option value="ga">GA Staff</option>
                <option value="legal">Legal Staff</option>
                <option value="compliance">Compliance Staff</option>
                <option value="legal_compliance">Legal & Compliance</option>
                <option value="auditor">Auditor</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddUser}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Tambah User
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {loading && users.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-neutral-400">Memuat data pengguna...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="py-20 text-center text-neutral-400 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                Tidak ada data pengguna yang ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Nama Lengkap</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Departemen / Posisi</th>
                      <th className="p-4">Peran (Role)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {users.map((user, idx) => (
                      <motion.tr 
                        key={user.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02, ease: 'easeOut' }}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                      >
                        <td className="p-4 font-bold text-neutral-850 dark:text-neutral-100">{user.full_name}</td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium font-mono">{user.email}</td>
                        <td className="p-4 text-neutral-500">
                          <div>{user.department || '-'}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">{user.position || '-'}</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${ROLE_BADGES[user.role] || 'bg-neutral-100 text-neutral-600'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className="p-1 rounded-lg transition-colors inline-block cursor-pointer text-neutral-400"
                            title={user.is_active ? 'Klik untuk Nonaktifkan' : 'Klik untuk Aktifkan'}
                          >
                            {user.is_active ? (
                              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                <UserCheck className="w-3 h-3" />
                                Aktif
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-500/10 border border-red-200 dark:border-red-900/30 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                <UserMinus className="w-3 h-3" />
                                Nonaktif
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-neutral-50 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-neutral-600 dark:text-neutral-300 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700/60 cursor-pointer"
                            >
                              Edit Profile
                            </button>
                            <button
                              onClick={() => setUserToResetPassword(user)}
                              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-amber-500 transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </motion.div>
        )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: HAK AKSES PERAN (PERMISSION MATRIX)
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Matriks Konfigurasi Hak Akses Modul
            </h3>
            <p className="text-[10px] text-neutral-400 leading-relaxed max-w-3xl mb-6">
              Di bawah ini adalah matriks hak akses bagi setiap Peran (Role) di dalam sistem. Anda dapat mengizinkan akses baca (Read) atau tulis/edit (Write) ke modul General Affairs, Legal, Compliance, atau Administrator. Harap berhati-hati, perubahan di sini berdampak langsung pada hak akses API setiap pengguna.
            </p>

            {loading && permissions.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-neutral-400">Memuat matriks hak akses...</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 min-w-[200px]">Peran Pengguna (Role)</th>
                      <th className="p-4 min-w-[220px]">GA (Aset & Servis)</th>
                      <th className="p-4 min-w-[220px]">Legal (PKS & Kontrak)</th>
                      <th className="p-4 min-w-[220px]">Compliance (Lisensi)</th>
                      <th className="p-4 min-w-[220px]">Admin Panel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {['admin', 'ga', 'legal', 'compliance', 'legal_compliance', 'auditor'].map(roleName => {
                      const modules = ['ga', 'legal', 'compliance', 'admin'];

                      return (
                        <tr key={roleName} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/10 transition-colors">
                          <td className="p-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase ${ROLE_BADGES[roleName] || 'bg-neutral-100 text-neutral-600'}`}>
                              {roleName}
                            </span>
                          </td>
                          {modules.map(mod => {
                            // Find permission object
                            const perm = permissions.find(p => p.role === roleName && p.module === mod);

                            if (!perm) {
                              return <td key={mod} className="p-4 text-neutral-400 font-mono text-[9px] italic">Not Configured</td>;
                            }

                            // Admin role permissions are mostly readonly and locked in UI to prevent lockouts
                            const isLockedAdmin = roleName === 'admin';

                            return (
                              <td key={mod} className="p-4">
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      disabled={isLockedAdmin}
                                      checked={perm.can_read}
                                      onChange={(e) => handlePermissionChange(perm.id, 'can_read', e.target.checked)}
                                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-800 disabled:opacity-40"
                                    />
                                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Read</span>
                                  </label>

                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      disabled={isLockedAdmin || (mod === 'admin' && roleName !== 'admin')}
                                      checked={perm.can_write}
                                      onChange={(e) => handlePermissionChange(perm.id, 'can_write', e.target.checked)}
                                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-800 disabled:opacity-40"
                                    />
                                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Write</span>
                                  </label>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Floating Actions for Permissions changes */}
          <AnimatePresence>
            {hasPermissionChanges && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-indigo-600 dark:bg-indigo-750 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-indigo-600/20"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-300 animate-pulse" />
                  <span className="text-xs font-semibold">Terdapat perubahan konfigurasi hak akses peran yang belum disimpan.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetPermissions}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={savingPermissions}
                    className="px-4 py-1.5 text-xs font-black bg-white hover:bg-neutral-50 text-indigo-650 rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {savingPermissions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Perubahan'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </motion.div>
        )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: LOG AUDIT SISTEM
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-4"
        >
          {/* Filters Bar */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search actor */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama actor..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(1);
                }}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
              />
            </div>

            {/* Action filter */}
            <select
              value={logActionFilter}
              onChange={(e) => {
                setLogActionFilter(e.target.value);
                setLogPage(1);
              }}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none cursor-pointer"
            >
              <option value="">Semua Aksi</option>
              <option value="INSERT">INSERT (Tambah)</option>
              <option value="UPDATE">UPDATE (Edit)</option>
              <option value="DELETE">DELETE (Hapus)</option>
            </select>

            {/* Table filter */}
            <select
              value={logTableFilter}
              onChange={(e) => {
                setLogTableFilter(e.target.value);
                setLogPage(1);
              }}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none cursor-pointer"
            >
              <option value="">Semua Tabel</option>
              <option value="assets">assets</option>
              <option value="vehicles">vehicles</option>
              <option value="documents">documents</option>
              <option value="vendors">vendors</option>
              <option value="m_company">m_company</option>
              <option value="m_company_branch">m_company_branch</option>
              <option value="m_user">m_user</option>
            </select>

            <button
              onClick={() => {
                setLogSearch('');
                setLogActionFilter('');
                setLogTableFilter('');
                setLogPage(1);
              }}
              className="px-3 py-2 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 text-neutral-600 dark:text-neutral-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Logs List Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {loading && logs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-neutral-400">Memuat log audit...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center text-neutral-400 text-xs">
                <Activity className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                Tidak ada log aktivitas sistem yang tercatat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Tanggal & Waktu</th>
                      <th className="p-4">Actor (User)</th>
                      <th className="p-4 text-center">Aksi</th>
                      <th className="p-4">Tabel Target</th>
                      <th className="p-4 text-center">Record ID</th>
                      <th className="p-4 text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {logs.map((log, idx) => (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.015, ease: 'easeOut' }}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                      >
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 font-mono font-medium">
                          {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-neutral-800 dark:text-slate-200">{log.m_user?.full_name || 'System / Admin'}</div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{log.m_user?.email || 'system@mraretail.co.id'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            log.action === 'INSERT'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                              : log.action === 'DELETE'
                                ? 'bg-red-500/10 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                                : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-450">{log.table_name}</td>
                        <td className="p-4 text-center font-mono font-bold text-neutral-500">{log.record_id || '-'}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-indigo-500 rounded-lg transition-colors cursor-pointer"
                            title="Bandingkan Data (Diff)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {logMeta.totalPages > 1 && (
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400 select-none">
                <span>Showing Page {logMeta.page} of {logMeta.totalPages} ({logMeta.total} logs)</span>
                <div className="flex gap-2">
                  <button
                    disabled={logPage === 1}
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={logPage === logMeta.totalPages}
                    onClick={() => setLogPage(p => Math.min(logMeta.totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODALS & DRAWERS
          ───────────────────────────────────────────────────────────────────────────── */}

      {/* Drawers: Add / Edit User */}
      <AnimatePresence>
        {showUserDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseUserDrawer}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">
                    {editingUser ? 'Edit Profil User' : 'Tambah Pengguna Baru'}
                  </h3>
                  <button
                    onClick={handleCloseUserDrawer}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUserSubmit} className="mt-6 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nama Lengkap *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Aris Setiyono"
                      value={userFormData.full_name}
                      onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Alamat Email *</label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. aris@mraretail.co.id"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {!editingUser && (
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Password Awal *</label>
                      <input
                        required
                        type="password"
                        placeholder="e.g. Mra1234!"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nomor Telepon</label>
                      <input
                        type="text"
                        placeholder="e.g. 0812XXXXXXXX"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Peran Sistem (Role) *</label>
                      <select
                        required
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                      >
                        <option value="ga">GA Staff</option>
                        <option value="legal">Legal Staff</option>
                        <option value="compliance">Compliance Staff</option>
                        <option value="legal_compliance">Legal & Compliance</option>
                        <option value="auditor">Auditor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Departemen</label>
                      <input
                        type="text"
                        placeholder="e.g. IT Department"
                        value={userFormData.department}
                        onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Posisi Jabatan</label>
                      <input
                        type="text"
                        placeholder="e.g. GA Specialist"
                        value={userFormData.position}
                        onChange={(e) => setUserFormData({ ...userFormData, position: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={handleCloseUserDrawer}
                      className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submittingUser}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {submittingUser ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Simpan User'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal: Reset Password */}
      <AnimatePresence>
        {userToResetPassword && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setUserToResetPassword(null)}
              className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Reset Password User</h3>
                    <p className="text-[10px] text-neutral-400">User: {userToResetPassword.full_name}</p>
                  </div>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Password Baru *</label>
                    <input
                      required
                      type="password"
                      placeholder="Masukkan password baru..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 w-full mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setUserToResetPassword(null);
                        setNewPassword('');
                      }}
                      className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={resettingPassword}
                      className="flex-1 py-2 bg-amber-550 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/15"
                    >
                      {resettingPassword ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Key className="w-3.5 h-3.5" />
                      )}
                      Reset Password
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Modal: Compare / View Log Details (JSON DIFF) */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col max-h-[85vh]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Detail Log Perubahan Data</h3>
                      <p className="text-[10px] text-neutral-400">Log ID: #{selectedLog.id} | Tabel: {selectedLog.table_name} | ID: {selectedLog.record_id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
                  {/* Actor details */}
                  <div className="grid grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-850">
                    <div>
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">Aktor Pengubah</span>
                      <span className="font-bold text-neutral-700 dark:text-slate-350">{selectedLog.m_user?.full_name || 'System / Admin'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">Tanggal & Waktu</span>
                      <span className="font-medium text-neutral-700 dark:text-slate-350 font-mono">
                        {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                  </div>

                  {/* JSON Diff Blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Old Data */}
                    <div>
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Data Sebelum (Old)</span>
                      <div className="bg-neutral-950 text-emerald-400 dark:text-emerald-500 font-mono text-[10px] p-4 rounded-2xl overflow-x-auto max-h-60 border border-neutral-800">
                        {selectedLog.old_data ? (
                          <pre>{JSON.stringify(selectedLog.old_data, null, 2)}</pre>
                        ) : (
                          <span className="text-neutral-600 italic">No original data (INSERT action)</span>
                        )}
                      </div>
                    </div>

                    {/* New Data */}
                    <div>
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Data Sesudah (New)</span>
                      <div className="bg-neutral-950 text-indigo-400 dark:text-indigo-400 font-mono text-[10px] p-4 rounded-2xl overflow-x-auto max-h-60 border border-neutral-800">
                        {selectedLog.new_data ? (
                          <pre>{JSON.stringify(selectedLog.new_data, null, 2)}</pre>
                        ) : (
                          <span className="text-neutral-600 italic">No new data (DELETE action)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4 flex justify-end flex-shrink-0">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
