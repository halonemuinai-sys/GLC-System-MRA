# -*- coding: utf-8 -*-
"""
Script to generate a comprehensive executive PDF report:
Analisis Kebutuhan & Tata Kelola Menu Budgeting (Kemauan COO)
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print total page count 'Halaman X dari Y'
    along with running header and footer.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, A4[1] - 30, "GLC MRA System - Analisis Tata Kelola Menu Budgeting (Kemauan COO)")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(40, A4[1] - 34, A4[0] - 40, A4[1] - 34)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(40, 36, A4[0] - 40, 36)

        page_str = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(A4[0] - 40, 24, page_str)
        self.drawString(40, 24, "CONFIDENTIAL - FOR INTERNAL REVIEW ONLY | PT MRA GROUP")
        self.restoreState()


def build_pdf():
    pdf_path = r"d:\Private Project\GLC Apps\Analisis_Kebutuhan_Menu_Budget_COO.pdf"
    image_src = r"C:\Users\ariss\.gemini\antigravity\brain\38659e59-8b89-4f8c-9e0d-673fabd3dd9f\.user_uploaded\media_1789702736757.jpg"

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor('#2563EB'),
        spaceAfter=14
    )

    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#475569')
    )

    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    h1_style = ParagraphStyle(
        'SecHeading1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SecHeading2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#1E293B')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    badge_emerald = ParagraphStyle(
        'BadgeEmerald',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#065F46')
    )

    badge_blue = ParagraphStyle(
        'BadgeBlue',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1E40AF')
    )

    badge_amber = ParagraphStyle(
        'BadgeAmber',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#92400E')
    )

    story = []

    # ─────────────────────────────────────────────────────────────
    # 1. HEADER & METADATA BLOCK
    # ─────────────────────────────────────────────────────────────
    story.append(Paragraph("ANALISIS KEBUTUHAN MENU BUDGETING", title_style))
    story.append(Paragraph("TELAAH TATA KELOLA ANGGARAN & LOGIKA BISNIS BERDASARKAN ARAHAN COO", subtitle_style))

    # Meta card table
    meta_data = [
        [
            Paragraph("<b>Sistem:</b>", meta_label_style),
            Paragraph("GLC MRA System (General Affairs, Legal, Compliance, Marketing)", meta_val_style),
            Paragraph("<b>Tanggal:</b>", meta_label_style),
            Paragraph("18 September 2026", meta_val_style),
        ],
        [
            Paragraph("<b>Topik:</b>", meta_label_style),
            Paragraph("Perombakan Tata Kelola & Kontrol Alur Budget Marketing", meta_val_style),
            Paragraph("<b>Stakeholder:</b>", meta_label_style),
            Paragraph("COO, Head of Marketing, FC (Financial Controller)", meta_val_style),
        ],
        [
            Paragraph("<b>Dokumen:</b>", meta_label_style),
            Paragraph("Business Analysis & Technical Specification", meta_val_style),
            Paragraph("<b>Klasifikasi:</b>", meta_label_style),
            Paragraph("Internal Confidential", meta_val_style),
        ]
    ]

    meta_table = Table(meta_data, colWidths=[65, 205, 75, 170])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#EDF2F7')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # ─────────────────────────────────────────────────────────────
    # 2. RINGKASAN EKSEKUTIF
    # ─────────────────────────────────────────────────────────────
    story.append(Paragraph("1. Ringkasan Eksekutif", h1_style))
    story.append(Paragraph(
        "Berdasarkan arahan langsung dari Chief Operating Officer (COO) pada sesi diskusi visual di papan kaca (whiteboard), "
        "modul manajemen anggaran pemasaran (<b>Marketing Budgeting</b>) diarahkan untuk bertransformasi dari sekadar "
        "tabel pencatatan plafon statis menjadi <b>instrumen kontrol keuangan yang disiplin (Strict Budget Governance)</b>. "
        "Perubahan ini berfokus pada 4 (empat) pilar utama: siklus alokasi tahunan di muka, perencanaan kuartalan dengan jendela "
        "persiapan <i>advance window</i> (3 bulan prior), matriks otorisasi pergeseran anggaran (<i>budget shifting</i>) "
        "berdasarkan ambang batas &gt;= 5%, serta disiplin tutup buku bulanan tanpa pengembalian sisa saldo secara otomatis.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # ─────────────────────────────────────────────────────────────
    # 3. ARTEFAK SUMBER (FOTO WHITEBOARD) & TRANSKRIPSI
    # ─────────────────────────────────────────────────────────────
    story.append(Paragraph("2. Artefak Sumber & Dekonstruksi Catatan Whiteboard", h1_style))
    story.append(Paragraph(
        "Berikut adalah dokumentasi visual papan kerja COO dan dekonstruksi menyeluruh atas seluruh teks, rumus, "
        "garis relasi, dan instruksi yang tercatat:",
        body_style
    ))
    story.append(Spacer(1, 4))

    # Embed Whiteboard Image
    if os.path.exists(image_src):
        # A4 printable width is ~515 pt. Maintain aspect ratio:
        img_w = 480
        img_h = 220
        wb_img = Image(image_src, width=img_w, height=img_h)
        story.append(wb_img)
        story.append(Spacer(1, 3))
        story.append(Paragraph(
            "<i>Gambar 1: Dokumentasi coretan papan kaca COO mengenai tata kelola budgeting marketing 2027</i>",
            ParagraphStyle('ImgCap', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7.5, textColor=colors.HexColor('#64748B'), alignment=1)
        ))
    story.append(Spacer(1, 8))

    # Table breakdown of Whiteboard Notes
    transkripsi_data = [
        [
            Paragraph("Bagian / Zona", table_header_style),
            Paragraph("Teks Asli Whiteboard", table_header_style),
            Paragraph("Interpretasi & Logika Bisnis Manajerial", table_header_style)
        ],
        [
            Paragraph("<b>Header (Kiri Atas)</b>", table_cell_bold),
            Paragraph("<code>2027 budget time =&gt; Nov/dec '26 = Mkt : 120 Rp.</code><br/><code>before 31/12 '26 =&gt; Jan(10) F(5) M(15) - Dec(10) = 120 = Yearly</code>", table_cell_style),
            Paragraph("Plafon marketing tahun 2027 (contoh Rp 120 M/Jt) disepakati pada Nov/Des 2026. Seluruh alokasi 12 bulan (Jan-Des) harus sudah didistribusikan secara proporsional sesuai seasonality sebelum 31 Desember 2026.", table_cell_style)
        ],
        [
            Paragraph("<b>Quarterly Horizon (Kiri Bawah)</b>", table_cell_bold),
            Paragraph("<code>Bulan : 3 bulan prior<br/>Jan, F, M ] 31/12 '2026<br/>= Qly :<br/>Q1 : 31/12 '26<br/>Q2 : 31/02 '27 (akhir Feb)<br/>Q3 : 31/05 '27<br/>Q4 : 31/10 '27</code>", table_cell_style),
            Paragraph("Perencanaan program kerja marketing dibagi per kuartal dan wajib difinalkan/dikunci paling lambat 1 bulan sebelum kuartal terkait dimulai (advance planning). Tim tidak boleh mengajukan plan mendadak pada bulan berjalan.", table_cell_style)
        ],
        [
            Paragraph("<b>Aturan Relokasi (Kanan Atas)</b>", table_cell_bold),
            Paragraph("<code>[1] pindah / ijin ke FC<br/>[2] -&gt; Q ke Head + FC</code>", table_cell_style),
            Paragraph("Prinsip dasar pengalihan pos anggaran: Pergeseran internal kuartal cukup izin ke Financial Controller (FC). Pergeseran antar kuartal (lintas Q) wajib izin berjenjang ke Head + FC.", table_cell_style)
        ],
        [
            Paragraph("<b>Ambang Batas Over (Kanan Tengah)</b>", table_cell_bold),
            Paragraph("<code>[1] Kalo uang over &gt;= 5% =&gt; FC dan ambil dr Q yg sama<br/>[2] Kalau Q yg beda =&gt; Head + FC</code>", table_cell_style),
            Paragraph("Jika kampanye membengkak &gt;= 5%, tidak boleh otomatis menambah plafon tahunan. Kekurangan wajib ditutupi dari sisa alokasi bulan lain dalam kuartal yang sama (izin FC). Jika butuh dana lintas kuartal, wajib approval Head of Dept + FC.", table_cell_style)
        ],
        [
            Paragraph("<b>Disiplin Penutupan (Kanan Bawah)</b>", table_cell_bold),
            Paragraph("<code>- * tutup buku tiap bulan<br/>* yg kurang pake =&gt; saldo masuk ...<br/>- tdk balik buku</code>", table_cell_style),
            Paragraph("Tutup buku operasional wajib dilakukan setiap akhir bulan. Alokasi anggaran bulanan yang tidak terserap (under-spent) tidak otomatis rollover/menumpuk ke bulan depan, melainkan ditarik kembali ke kas holding (use-it-or-lose-it).", table_cell_style)
        ]
    ]

    t_transkripsi = Table(transkripsi_data, colWidths=[105, 175, 235])
    t_transkripsi.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(t_transkripsi)
    story.append(Spacer(1, 12))

    # ─────────────────────────────────────────────────────────────
    # 4. EMPAT PILAR KEBIJAKAN UTAMA
    # ─────────────────────────────────────────────────────────────
    story.append(Paragraph("3. Detail Empat Pilar Kebijakan Budgeting", h1_style))

    # Pilar 1
    story.append(Paragraph("Pilar I: Penetapan Plafon & Alokasi Bulanan di Muka (Annual Master Plan)", h2_style))
    story.append(Paragraph(
        "Penyusunan anggaran tahunan (Tahun N+1) dilakukan pada rentang November - Desember tahun berjalan. "
        "Plafon total tahunan dipecah ke 12 bulan kalender secara proporsional atau spesifik berbasis kalender promo "
        "(misal alokasi Maret lebih tinggi karena seasonal Ramadhan/Lebaran). Seluruh alokasi 12 bulan harus terkunci sebelum "
        "tanggal 31 Desember pukul 23:59.",
        body_style
    ))

    # Pilar 2
    story.append(Paragraph("Pilar II: Siklus Kuartalan & Rolling Deadline ('3 Bulan Prior / Advance Planning')", h2_style))
    story.append(Paragraph(
        "COO menerapkan sistem kuartal terstruktur untuk menjamin kepastian eksekusi. Tim marketing wajib menyusun dan mengunci "
        "rencana program (marketing plan) jauh-jauh hari sebelum kuartal berjalan:",
        body_style
    ))

    q_schedule_data = [
        [
            Paragraph("Kuartal", table_header_style),
            Paragraph("Cakupan Bulan", table_header_style),
            Paragraph("Batas Waktu Penguncian (Deadline)", table_header_style),
            Paragraph("Keterangan Operasional", table_header_style)
        ],
        [
            Paragraph("<b>Q1</b>", table_cell_bold),
            Paragraph("Januari - Maret", table_cell_style),
            Paragraph("<b>31 Desember 2026</b>", table_cell_style),
            Paragraph("Terkunci sebelum awal tahun anggaran berjalan.", table_cell_style)
        ],
        [
            Paragraph("<b>Q2</b>", table_cell_bold),
            Paragraph("April - Juni", table_cell_style),
            Paragraph("<b>28 Februari 2027</b>", table_cell_style),
            Paragraph("1 bulan sebelum Q2 dimulai (persiapan Q2 rampung akhir Feb).", table_cell_style)
        ],
        [
            Paragraph("<b>Q3</b>", table_cell_bold),
            Paragraph("Juli - September", table_cell_style),
            Paragraph("<b>31 Mei 2027</b>", table_cell_style),
            Paragraph("1 bulan sebelum Q3 dimulai (persiapan Q3 rampung akhir Mei).", table_cell_style)
        ],
        [
            Paragraph("<b>Q4</b>", table_cell_bold),
            Paragraph("Oktober - Desember", table_cell_style),
            Paragraph("<b>31 Agustus / 31 Oktober 2027</b>", table_cell_style),
            Paragraph("Persiapan akhir tahun rampung sebelum kuartal penutup.", table_cell_style)
        ],
    ]
    t_q_sched = Table(q_schedule_data, colWidths=[55, 110, 140, 210])
    t_q_sched.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(t_q_sched)
    story.append(Spacer(1, 8))

    # Pilar 3
    story.append(Paragraph("Pilar III: Regulasi Pergeseran Anggaran (Budget Shifting & Over &gt;= 5%)", h2_style))
    story.append(Paragraph(
        "Kelebihan biaya (over-budget) pada suatu kegiatan tidak boleh diselesaikan dengan meminta penambahan dana segar "
        "yang menambah beban total perusahaan, melainkan melalui <b>mekanisme realokasi/pergeseran (Budget Shifting)</b>:",
        body_style
    ))

    # Callout Box for Shifting Rules
    shift_box_data = [
        [
            Paragraph(
                "<b>ATURAN OTORISASI PERGESERAN ANGGARAN (BUDGET SHIFT MATRIX):</b><br/><br/>"
                "<b>1. Kondisi Intra-Kuartal (Dalam Kuartal yang Sama) / Over &gt;= 5%:</b><br/>"
                "Apabila estimasi belanja melebihi alokasi bulan berjalan sebesar &gt;= 5%, kekurangan dana <b>wajib "
                "dikompensasi dari sisa alokasi bulan lain dalam kuartal yang sama</b> (misal: Maret defisit, diambil dari surplus Januari/Februari). "
                "Otorisasi persetujuan: Cukup melalui <b>Financial Controller (FC)</b>.<br/><br/>"
                "<b>2. Kondisi Inter-Kuartal (Lintas Kuartal / Beda Q):</b><br/>"
                "Apabila sisa kuota dalam kuartal berjalan tidak mencukupi sehingga harus meminjam/menarik dana dari kuartal lain "
                "(misal: Q2 defisit dan ingin menarik jatah Q3), maka hal tersebut berdampak pada struktur makro tahunan. "
                "Otorisasi persetujuan: <b>Wajib disetujui berjenjang oleh Head of Marketing / GM Marketing + Financial Controller (FC)</b>.",
                callout_text
            )
        ]
    ]
    shift_table = Table(shift_box_data, colWidths=[515])
    shift_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#3B82F6')),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
    ]))
    story.append(shift_table)
    story.append(Spacer(1, 8))

    # Pilar 4
    story.append(Paragraph("Pilar IV: Disiplin Tutup Buku Bulanan & Perlakuan Sisa Saldo ('Tidak Balik Buku')", h2_style))
    story.append(Paragraph(
        "Di akhir setiap bulan, Finance melakukan penutupan buku (<b>Month-End Closing</b>). "
        "Catatan COO menegaskan frasa <i>'yg kurang pake =&gt; saldo masuk ... / tdk balik buku'</i>. "
        "Secara finansial, ini merujuk pada kebijakan <b>Use-It-or-Lose-It</b>: sisa anggaran yang tidak terserap "
        "pada bulan yang sudah lewat tidak boleh otomatis mengakumulasi (rollover) ke bulan berikutnya. "
        "Dana yang tidak terpakai dikunci kembali ke kas holding dan hanya dapat diaktifkan kembali jika diajukan pergeseran "
        "resmi melalui mekanisme Pilar III.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────
    # 5. GAP ANALYSIS
    # ─────────────────────────────────────────────────────────────
    story.append(Paragraph("4. Analisis Kesenjangan (Gap Analysis) Sistem GLC MRA", h1_style))
    story.append(Paragraph(
        "Berikut adalah perbandingan antara kapabilitas menu Budgeting saat ini (<code>/dashboard/marketing/budgeting</code>) "
        "dengan spesifikasi yang dituntut oleh COO:",
        body_style
    ))

    gap_data = [
        [
            Paragraph("Aspek Tata Kelola", table_header_style),
            Paragraph("Kondisi Sistem Eksisting", table_header_style),
            Paragraph("Target Kebijakan COO", table_header_style),
            Paragraph("Status & Tindakan", table_header_style)
        ],
        [
            Paragraph("<b>Struktur Tampilan Menu</b>", table_cell_bold),
            Paragraph("Tabel flat 12 baris (Jan - Des). Belum ada segmentasi visual kuartal.", table_cell_style),
            Paragraph("Tampilan hierarkis: Tab / Accordion Kuartal (Q1, Q2, Q3, Q4) dengan subtotal per Q.", table_cell_style),
            Paragraph("<font color='#D97706'><b>PENYESUAIAN UI</b></font><br/>Tambahkan tab kuartal.", badge_amber)
        ],
        [
            Paragraph("<b>Validasi Deadline Kuartal</b>", table_cell_bold),
            Paragraph("Tidak ada batas waktu submit per kuartal. Kunci bersifat tahunan manual.", table_cell_style),
            Paragraph("Sistem memblokir pengajuan plan baru jika melewati deadline kuartal (misal Q2 lewat 28 Feb).", table_cell_style),
            Paragraph("<font color='#2563EB'><b>FITUR BARU</b></font><br/>Logika auto-lock rolling date.", badge_blue)
        ],
        [
            Paragraph("<b>Mekanisme Pergeseran (Shifting)</b>", table_cell_bold),
            Paragraph("Belum ada. Pengguna harus membuka kunci (unlock) dan mengetik ulang limit secara manual.", table_cell_style),
            Paragraph("Fitur resmi 'Ajukan Pergeseran Budget' dengan audit trail: dari Bulan A ke Bulan B beserta justifikasi.", table_cell_style),
            Paragraph("<font color='#DC2626'><b>KRITIKAL (BARU)</b></font><br/>Drawer Form Shifting.", badge_amber)
        ],
        [
            Paragraph("<b>Otorisasi Shifting Berjenjang</b>", table_cell_bold),
            Paragraph("Belum ada workflow persetujuan perubahan limit bulanan.", table_cell_style),
            Paragraph("Auto-routing approval: Sama Kuartal =&gt; FC. Lintas Kuartal =&gt; Head + FC.", table_cell_style),
            Paragraph("<font color='#DC2626'><b>KRITIKAL (BARU)</b></font><br/>Workflow approval DocHub.", badge_amber)
        ],
        [
            Paragraph("<b>Tutup Buku Bulanan (Closing)</b>", table_cell_bold),
            Paragraph("Belum ada status tutup buku. Semua bulan berstatus sama sepanjang tahun.", table_cell_style),
            Paragraph("Tombol aksi 'Tutup Buku Bulan Ini' oleh Finance. Bulan yang ditutup menjadi read-only permanen.", table_cell_style),
            Paragraph("<font color='#2563EB'><b>FITUR BARU</b></font><br/>State is_closed bulanan.", badge_blue)
        ],
        [
            Paragraph("<b>Kebijakan Saldo Sisa</b>", table_cell_bold),
            Paragraph("Sisa kuota hanya dihitung rumus flat (Limit - Committed).", table_cell_style),
            Paragraph("Saldo sisa bulan tertutup tidak rollover otomatis ('tdk balik buku'). Menjadi saldo hold holding.", table_cell_style),
            Paragraph("<font color='#059669'><b>LOGIKA BARU</b></font><br/>Perhitungan saldo aktif.", badge_emerald)
        ]
    ]

    t_gap = Table(gap_data, colWidths=[95, 125, 185, 110])
    t_gap.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(t_gap)
    story.append(Spacer(1, 12))

    # ─────────────────────────────────────────────────────────────
    # 6. RANCANGAN SOLUSI & IMPLEMENTASI TEKNIS
    # ─────────────────────────────────────────────────────────────
    story.append(Paragraph("5. Rancangan Arsitektur Teknis & Database", h1_style))
    story.append(Paragraph(
        "Untuk mengakomodasi kebutuhan COO di atas tanpa merusak integritas modul marketing plan yang sudah berjalan, "
        "berikut adalah cetak biru perubahan arsitektur data dan alur API:",
        body_style
    ))

    story.append(Paragraph("A. Perubahan Skema Database Prisma (Schema glc_mra / marketing_budget)", h2_style))
    story.append(Paragraph(
        "1. Menambahkan kolom kontrol pada tabel <code>m_marketing_budget_monthly</code>:<br/>"
        "&nbsp;&nbsp;- <code>is_closed</code> (Boolean, default false) - Menandai bulan telah ditutup buku.<br/>"
        "&nbsp;&nbsp;- <code>closed_at</code> (DateTime, nullable) &amp; <code>closed_by</code> (VarChar).<br/>"
        "&nbsp;&nbsp;- <code>quarter_number</code> (SmallInt, 1-4) - Penanda kuartal untuk kemudahan agregasi.<br/>"
        "2. Membuat tabel baru <code>m_marketing_budget_shift</code> untuk mencatat riwayat pergeseran:<br/>"
        "&nbsp;&nbsp;- <code>from_month</code>, <code>to_month</code>, <code>amount</code>, <code>reason</code>.<br/>"
        "&nbsp;&nbsp;- <code>shift_type</code>: 'INTRA_QUARTER' atau 'CROSS_QUARTER'.<br/>"
        "&nbsp;&nbsp;- <code>status</code>: 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'.<br/>"
        "&nbsp;&nbsp;- <code>approver_role_required</code>: ['FC'] atau ['HEAD_MARKETING', 'FC'].",
        body_style
    ))

    story.append(Paragraph("B. Matriks Keputusan Otomatis Sistem (Decision Matrix)", h2_style))
    
    matrix_data = [
        [
            Paragraph("Skenario Pergeseran Anggaran", table_header_style),
            Paragraph("Kategori Shifting", table_header_style),
            Paragraph("Ambang Batas", table_header_style),
            Paragraph("Alur Persetujuan (Signer)", table_header_style)
        ],
        [
            Paragraph("Kekurangan dana bulan berjalan diambil dari bulan lain pada kuartal yang sama (misal Jan -&gt; Mar)", table_cell_style),
            Paragraph("<b>Intra-Quarter</b>", badge_blue),
            Paragraph("Over &gt;= 5% atau kebutuhan program", table_cell_style),
            Paragraph("<b>1 Tahap:</b><br/>Financial Controller (FC)", table_cell_bold)
        ],
        [
            Paragraph("Kekurangan dana diambil dari kuartal berbeda (misal Q1 menarik alokasi dari Q2 / sisa Q1 ke Q2)", table_cell_style),
            Paragraph("<b>Cross-Quarter</b>", badge_amber),
            Paragraph("Berapapun nominalnya", table_cell_style),
            Paragraph("<b>2 Tahap (Sequential):</b><br/>1. Head of Marketing<br/>2. Financial Controller (FC)", table_cell_bold)
        ],
        [
            Paragraph("Penutupan operasional anggaran bulanan di akhir periode", table_cell_style),
            Paragraph("<b>Month-End Close</b>", badge_emerald),
            Paragraph("Tiap akhir bulan kalender", table_cell_style),
            Paragraph("<b>Otoritas Finance:</b><br/>Kunci status <code>is_closed = true</code>", table_cell_bold)
        ]
    ]

    t_matrix = Table(matrix_data, colWidths=[175, 95, 105, 140])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(t_matrix)
    story.append(Spacer(1, 12))

    # ─────────────────────────────────────────────────────────────
    # 7. KESIMPULAN & REKOMENDASI TAHAPAN KERJA
    # ─────────────────────────────────────────────────────────────
    story.append(Paragraph("6. Kesimpulan & Rekomendasi Langkah Kerja", h1_style))
    story.append(Paragraph(
        "Coretan whiteboard COO memberikan kerangka kerja pengendalian biaya yang sangat sehat bagi korporat ritel: "
        "mencegah tim marketing mengajukan program dadakan, mengharuskan perencanaan 1 kuartal di muka, membatasi pelampauan biaya "
        "agar selalu dikompensasi dari efisiensi bulan lain dalam kuartal yang sama, dan menutup peluang penumpukan sisa anggaran "
        "lewat mekanisme tutup buku bulanan.<br/><br/>"
        "<b>Rekomendasi Tahapan Eksekusi:</b><br/>"
        "1. <b>Tahap 1 (UI Redesign)</b>: Memperbarui tampilan <code>MarketingBudgetPage.jsx</code> dengan tab Kuartal (Q1 - Q4) "
        "dan kartu ringkasan kuartal.<br/>"
        "2. <b>Tahap 2 (Backend & Database)</b>: Menambahkan tabel pergeseran budget (<code>m_marketing_budget_shift</code>) "
        "dan kolom <code>is_closed</code>.<br/>"
        "3. <b>Tahap 3 (Workflow Shifting Modal)</b>: Membangun modal 'Ajukan Pergeseran Anggaran' dengan validasi aturan otomatis "
        "(Intra-Q vs Inter-Q).<br/>"
        "4. <b>Tahap 4 (Closing Action)</b>: Menyediakan tombol aksi Tutup Buku bulanan bagi admin Finance.",
        body_style
    ))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF generated successfully at:", pdf_path)

if __name__ == '__main__':
    build_pdf()
