'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  FileText,
  Loader2
} from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';

// Searchable Dropdown for Companies (PT)
function SearchableCompanySelect({ companies, value, onChange, placeholder = 'Select Company (Type to search...)' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedCompany = companies.find(c => String(c.id) === String(value));
  
  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[38px] select-none"
      >
        <span className={selectedCompany ? 'text-neutral-850 dark:text-neutral-200 font-medium truncate' : 'text-neutral-400 truncate'}>
          {selectedCompany ? selectedCompany.name : placeholder}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchQuery('');
              }}
              className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[9px] text-neutral-400">▼</span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 w-full mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-2 space-y-1"
            >
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-44 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setSearchQuery('');
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-neutral-50 dark:hover:bg-neutral-800/45 text-neutral-400 transition-colors"
                >
                  All Companies (PT)
                </button>
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-3 text-center text-xs text-neutral-400">
                    No companies found
                  </div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange(c.id);
                        setSearchQuery('');
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium ${
                        String(c.id) === String(value) ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GaVehiclesFormDrawer({
  showAddDrawer,
  setShowAddDrawer,
  editingVehicle,
  setEditingVehicle,
  companies,
  formData,
  setFormData,
  handleAddVehicle,
  submitting
}) {
  return (
    <AnimatePresence>
      {showAddDrawer && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddDrawer(false);
              setEditingVehicle(null);
            }}
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
                  {editingVehicle ? 'Edit Operational Vehicle' : 'Add Operational Vehicle'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddDrawer(false);
                    setEditingVehicle(null);
                  }}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddVehicle} className="mt-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Plate Number *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. B 1234 ABC"
                      value={formData.plate_number}
                      onChange={(e) => setFormData({...formData, plate_number: e.target.value.toUpperCase()})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Vehicle Type *</label>
                    <select
                      required
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                    >
                      <option value="">Select Type</option>
                      <option value="Minibus">Minibus</option>
                      <option value="Motor">Motor</option>
                      <option value="Blind Van">Blind Van</option>
                      <option value="Box">Box</option>
                      <option value="Pickup Box">Pickup Box</option>
                      <option value="Pick Up">Pick Up</option>
                      <option value="Truk">Truk</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Brand & Model *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Toyota Avanza 1.3G"
                    value={formData.brand_model}
                    onChange={(e) => setFormData({...formData, brand_model: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Manufacturing Year</label>
                    <input
                      type="number"
                      placeholder="e.g. 2021"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Color</label>
                    <input
                      type="text"
                      placeholder="e.g. Hitam Metalik"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Chassis Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MHXYF..."
                      value={formData.chassis_number}
                      onChange={(e) => setFormData({...formData, chassis_number: e.target.value.toUpperCase()})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Assigned Driver</label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmad Mansur"
                      value={formData.driver_name}
                      onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tax Date *</label>
                    <DatePicker
                      required
                      value={formData.tax_date}
                      onChange={(val) => setFormData({...formData, tax_date: val})}
                      placeholder="Pilih tanggal pajak"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. GA / Sales"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Biaya Pajak (PKB)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500000"
                      value={formData.last_km}
                      onChange={(e) => setFormData({...formData, last_km: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Last Service Date</label>
                    <DatePicker
                      value={formData.last_service_date}
                      onChange={(val) => setFormData({...formData, last_service_date: val})}
                      placeholder="Pilih tanggal service"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status *</label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Perbaikan">Perbaikan</option>
                      <option value="Sewa">Sewa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Company *</label>
                    <SearchableCompanySelect
                      companies={companies}
                      value={formData.company_id}
                      onChange={(val) => setFormData({...formData, company_id: val})}
                      placeholder="Select Company *"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Additional Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Note about vehicle insurance, keys, or tool kit..."
                    value={formData.information}
                    onChange={(e) => setFormData({...formData, information: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Link (e.g. Google Drive)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={formData.doc_url}
                      onChange={(e) => setFormData({...formData, doc_url: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDrawer(false);
                      setEditingVehicle(null);
                    }}
                    className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingVehicle ? 'Save Changes' : 'Save Vehicle')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
