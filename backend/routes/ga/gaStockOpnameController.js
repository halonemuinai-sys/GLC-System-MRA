const prisma = require('../../api/db');

// GET Stock Opname sessions/checks
async function getStockOpname(req, res, next) {
  try {
    const { id } = req.query;

    if (id) {
      const session = await prisma.stock_opname_sessions.findUnique({ where: { id: parseInt(id) } });
      if (!session) return res.status(404).json({ error: 'Session not found.' });

      const checks = await prisma.inventory_checks.findMany({
        where: { session_id: parseInt(id) },
        orderBy: [{ check_status: 'asc' }, { id: 'asc' }],
        include: {
          assets: {
            include: { m_asset_category: true, m_company: true, m_condition: true, m_status: true }
          }
        }
      });

      const mapped = checks.map(c => ({
        id: c.id,
        asset_code: c.asset_code,
        asset_name: c.assets.asset_name,
        category: c.assets.m_asset_category?.name || null,
        company: c.assets.m_company?.name || null,
        room: c.assets.room,
        current_condition: c.assets.m_condition?.name || null,
        check_status: c.check_status
      }));

      return res.json({ session, checks: mapped });
    }

    const sessions = await prisma.stock_opname_sessions.findMany({ orderBy: { created_at: 'desc' } });
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

// POST Create Stock Opname Session
async function createStockOpnameSession(req, res, next) {
  try {
    const { session_name, description, company_id, category_id } = req.body;
    if (!session_name || !session_name.trim()) {
      return res.status(400).json({ error: 'Nama sesi wajib diisi.' });
    }

    const session = await prisma.stock_opname_sessions.create({
      data: {
        session_name: session_name.trim(),
        description: description || null,
        created_by: req.user.full_name || 'System'
      }
    });

    const where = { OR: [{ status_id: 1 }, { status_id: null }] };
    if (company_id) where.company_id = parseInt(company_id);
    if (category_id) where.asset_category_id = parseInt(category_id);

    const assets = await prisma.assets.findMany({ where, select: { id: true, asset_code: true } });

    if (assets.length > 0) {
      await prisma.inventory_checks.createMany({
        data: assets.map(a => ({ session_id: session.id, asset_id: a.id, asset_code: a.asset_code }))
      });
    }

    await prisma.stock_opname_sessions.update({
      where: { id: session.id },
      data: { total_assets: assets.length }
    });

    res.status(201).json({ id: session.id, total_assets: assets.length });
  } catch (err) {
    next(err);
  }
}

// DELETE Stock Opname Session
async function deleteStockOpnameSession(req, res, next) {
  try {
    await prisma.stock_opname_sessions.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// POST Scan / Update Inventory Check
async function scanInventoryCheck(req, res, next) {
  try {
    const { session_id, asset_code, check_status, condition_note, location_found, notes } = req.body;
    if (!session_id || !asset_code) {
      return res.status(400).json({ error: 'Session ID dan kode aset wajib diisi.' });
    }

    const check = await prisma.inventory_checks.findFirst({
      where: { session_id: parseInt(session_id), asset_code: asset_code.trim() },
      include: {
        assets: { include: { m_asset_category: true, m_company: true, m_condition: true } }
      }
    });

    if (!check) {
      return res.status(404).json({ error: 'Kode aset tidak ditemukan dalam sesi ini.', asset_code });
    }

    await prisma.inventory_checks.update({
      where: { id: check.id },
      data: {
        check_status: check_status || 'Found',
        condition_note: condition_note || null,
        location_found: location_found || null,
        checked_by: req.user.full_name || 'Scanner',
        checked_at: new Date(),
        notes: notes || null
      }
    });

    const [checkedCount, foundCount, missingCount] = await Promise.all([
      prisma.inventory_checks.count({ where: { session_id: check.session_id, check_status: { not: 'Pending' } } }),
      prisma.inventory_checks.count({ where: { session_id: check.session_id, check_status: 'Found' } }),
      prisma.inventory_checks.count({ where: { session_id: check.session_id, check_status: 'Missing' } })
    ]);

    await prisma.stock_opname_sessions.update({
      where: { id: check.session_id },
      data: { checked_count: checkedCount, found_count: foundCount, missing_count: missingCount }
    });

    res.json({
      success: true,
      asset: {
        asset_name: check.assets.asset_name,
        asset_code: check.asset_code,
        category: check.assets.m_asset_category?.name || null,
        company: check.assets.m_company?.name || null,
        room: check.assets.room,
        current_condition: check.assets.m_condition?.name || null,
        check_status: check_status || 'Found'
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStockOpname,
  createStockOpnameSession,
  deleteStockOpnameSession,
  scanInventoryCheck
};
