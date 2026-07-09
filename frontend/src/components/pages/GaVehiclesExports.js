import { apiClient } from '@/lib/apiClient';

export const handleExportCSV = async (search, statusFilter, companyId, setExporting) => {
  setExporting(true);
  try {
    const res = await apiClient.get('/api/ga/vehicles', {
      params: {
        limit: 9999,
        search,
        status: statusFilter || undefined,
        companyId: companyId || undefined
      }
    });
    const rows = res.data || [];
    const headers = [
      'Nomor Polisi (Plate Number)',
      'Brand / Model',
      'Tahun Pembuatan',
      'Warna',
      'Nomor Rangka (Chassis Number)',
      'Entitas Perusahaan',
      'Departemen Pengguna',
      'Biaya Pajak (PKB)',
      'Jatuh Tempo Pajak',
      'Status Operasional',
      'Keterangan Tambahan'
    ];
    
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const formatIDRCurrency = (val) => {
      if (!val) return 'Rp 0';
      return `Rp ${Number(val).toLocaleString('id-ID')}`;
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('id-ID', { dateStyle: 'medium' });
    };

    const csvRows = [
      headers.join(','),
      ...rows.map(r => [
        r.plate_number,
        r.brand_model,
        r.year || '-',
        r.color || '-',
        r.chassis_number || '-',
        r.m_company?.name || '-',
        r.department || '-',
        formatIDRCurrency(r.last_km),
        formatDate(r.tax_date),
        r.status || 'Aktif',
        r.information || '-'
      ].map(escapeCSV).join(','))
    ];

    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Vehicle_Fleet_MRA_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message || 'Gagal mengekspor data');
  } finally {
    setExporting(false);
  }
};
