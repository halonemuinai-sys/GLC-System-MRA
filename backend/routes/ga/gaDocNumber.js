const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// Nomor dokumen format {PREFIX}/{SEQ}/{BULAN ROMAWI}/{TAHUN}, urut per tahun.
// Pakai sequence tertinggi yang ada (bukan count) supaya menghapus dokumen di
// tengah tidak membuat nomor dokumen lain terpakai ulang.
async function nextDocNumber(delegate, field, prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const rows = await delegate.findMany({
    where: { [field]: { startsWith: `${prefix}/`, endsWith: `/${year}` } },
    select: { [field]: true }
  });
  const maxSeq = rows.reduce((max, r) => {
    const seq = parseInt(String(r[field]).split('/')[prefix.split('/').length], 10);
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  return `${prefix}/${String(maxSeq + 1).padStart(4, '0')}/${ROMAN_MONTHS[now.getMonth()]}/${year}`;
}

module.exports = { nextDocNumber };
