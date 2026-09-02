const prisma = require('../../api/db');
const bcrypt = require('bcryptjs');

// GET List Assets with pagination, search, & filter
async function getAssets(req, res, next) {
  try {
    const { page = 1, limit = 10, search = '', categoryId, locationId, statusId, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { asset_name: { contains: search, mode: 'insensitive' } },
        { asset_code: { contains: search, mode: 'insensitive' } },
        { room: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (categoryId) {
      where.asset_category_id = parseInt(categoryId);
    }
    if (locationId) {
      where.location_id = parseInt(locationId);
    }
    if (statusId) {
      where.status_id = parseInt(statusId);
    }
    if (companyId) {
      where.company_id = parseInt(companyId);
    }

    const [assetsList, totalCount, costAggregate, goodCount, repairCount, companyGroup, categoryGroup, categoriesList] = await Promise.all([
      prisma.assets.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          m_asset_category: true,
          m_asset_type: true,
          m_company: true,
          m_condition: true,
          m_location: true,
          m_user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true
            }
          },
          m_status: true
        }
      }),
      prisma.assets.count({ where }),
      prisma.assets.aggregate({
        where,
        _sum: {
          acquisition_cost: true
        }
      }),
      prisma.assets.count({
        where: {
          ...where,
          condition_id: 1
        }
      }),
      prisma.assets.count({
        where: {
          ...where,
          NOT: {
            condition_id: 1
          }
        }
      }),
      prisma.assets.groupBy({
        by: ['company_id'],
        where
      }),
      prisma.assets.groupBy({
        by: ['asset_category_id'],
        where,
        _count: {
          id: true
        },
        _sum: {
          acquisition_cost: true
        }
      }),
      prisma.m_asset_category.findMany()
    ]);

    const categoryBreakdown = categoryGroup.map(cg => {
      const cat = categoriesList.find(c => c.id === cg.asset_category_id);
      return {
        id: cg.asset_category_id || 0,
        name: cat ? cat.name : 'Unknown',
        count: cg._count.id,
        value: cg._sum.acquisition_cost || 0
      };
    });

    res.json({
      data: assetsList,
      meta: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      summary: {
        totalAcquisitionCost: costAggregate._sum.acquisition_cost || 0,
        goodConditionCount: goodCount,
        needRepairCount: repairCount,
        uniqueCompaniesCount: companyGroup.length,
        categoryBreakdown
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET Asset by ID
async function getAssetDetail(req, res, next) {
  try {
    const asset = await prisma.assets.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_asset_category: true,
        m_asset_type: true,
        m_company: true,
        m_condition: true,
        m_location: true,
        m_user: true,
        m_status: true,
        inventory_checks: true,
        maintenances: true
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    res.json(asset);
  } catch (err) {
    next(err);
  }
}

// POST Create Asset
async function createAsset(req, res, next) {
  try {
    const data = req.body;
    
    if (!data.asset_name || !data.company_id) {
      return res.status(400).json({ error: 'Asset name and company ID are required.' });
    }

    const newAsset = await prisma.assets.create({
      data: {
        company_id: parseInt(data.company_id),
        asset_code: data.asset_code || null,
        asset_category_id: data.asset_category_id ? parseInt(data.asset_category_id) : null,
        asset_type_id: data.asset_type_id ? parseInt(data.asset_type_id) : null,
        asset_name: data.asset_name,
        details: data.details || null,
        location_id: data.location_id ? parseInt(data.location_id) : null,
        room: data.room || null,
        pic_id: data.pic_id ? parseInt(data.pic_id) : null,
        acquisition_date: data.acquisition_date ? new Date(data.acquisition_date) : null,
        acquisition_cost: data.acquisition_cost ? parseFloat(data.acquisition_cost) : 0,
        useful_life_months: data.useful_life_months ? parseInt(data.useful_life_months) : null,
        condition_id: data.condition_id ? parseInt(data.condition_id) : null,
        status_id: data.status_id ? parseInt(data.status_id) : null,
        information: data.information || null,
        reference_link: data.reference_link || null
      }
    });

    res.status(201).json(newAsset);
  } catch (err) {
    next(err);
  }
}

// POST Bulk Import Assets
async function bulkImportAssets(req, res, next) {
  try {
    const { assets } = req.body;
    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Data aset tidak boleh kosong.' });
    }

    const [companies, categories, types, branches, users, conditions, statuses] = await Promise.all([
      prisma.m_company.findMany({ select: { id: true, name: true } }),
      prisma.m_asset_category.findMany({ select: { id: true, name: true } }),
      prisma.m_asset_type.findMany({ select: { id: true, category_id: true, name: true } }),
      prisma.m_company_branch.findMany({ select: { id: true, name: true, location: true } }),
      prisma.m_user.findMany({ select: { id: true, full_name: true } }),
      prisma.m_condition.findMany({ select: { id: true, name: true } }),
      prisma.m_status.findMany({ select: { id: true, name: true } })
    ]);

    const normalize = (str) => (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

    const companyMap = {}; 
    companies.forEach(x => {
      const norm = normalize(x.name);
      companyMap[norm] = x.id;
      const clean = norm.replace(/^pt\.?\s*/i, '').trim();
      if (clean) companyMap[clean] = x.id;
    });

    const categoryMap = {}; 
    categories.forEach(x => categoryMap[normalize(x.name)] = x.id);

    const typeMap = {}; 
    types.forEach(x => typeMap[`${x.category_id}_${normalize(x.name)}`] = x.id);

    const typeNameMap = {}; 
    types.forEach(x => typeNameMap[normalize(x.name)] = x.id);

    const branchMap = {}; 
    branches.forEach(x => {
      if (x.name) branchMap[normalize(x.name)] = x.id;
      if (x.location) branchMap[normalize(x.location)] = x.id;
      if (x.name && x.location) branchMap[normalize(`${x.name} - ${x.location}`)] = x.id;
    });

    const userMap = {}; 
    users.forEach(x => userMap[normalize(x.full_name)] = x.id);

    const conditionMap = {}; 
    conditions.forEach(x => conditionMap[normalize(x.name)] = x.id);

    const statusMap = {}; 
    statuses.forEach(x => statusMap[normalize(x.name)] = x.id);

    // Default fallback IDs if needed
    const defaultConditionId = conditions.find(c => normalize(c.name).includes('baik'))?.id || conditions[0]?.id || 1;
    const defaultStatusId = statuses.find(s => normalize(s.name).includes('aktif'))?.id || statuses[0]?.id || 1;

    const errors = [];

    for (let i = 0; i < assets.length; i++) {
      const item = assets[i];
      const rowNum = item.rowNum || (i + 1);

      if (!item.asset_name) {
        errors.push(`Baris ${rowNum}: Nama Aset wajib diisi.`);
        continue;
      }

      if (!item.company_name) {
        errors.push(`Baris ${rowNum}: Perusahaan (PT) wajib diisi.`);
        continue;
      } else {
        const compKey = normalize(item.company_name);
        const cleanKey = compKey.replace(/^pt\.?\s*/i, '').trim();
        if (!companyMap[compKey] && !companyMap[cleanKey]) {
          const matched = companies.find(c => {
            const cNorm = normalize(c.name);
            const cClean = cNorm.replace(/^pt\.?\s*/i, '').trim();
            return cNorm.includes(cleanKey) || cleanKey.includes(cClean);
          });
          if (matched) {
            companyMap[compKey] = matched.id;
          } else {
            errors.push(`Baris ${rowNum}: Perusahaan "${item.company_name}" tidak ditemukan.`);
          }
        }
      }

      if (item.asset_category_name) {
        const catKey = normalize(item.asset_category_name);
        if (!categoryMap[catKey]) {
          const matched = categories.find(c => normalize(c.name).includes(catKey) || catKey.includes(normalize(c.name)));
          if (matched) {
            categoryMap[catKey] = matched.id;
          } else {
            errors.push(`Baris ${rowNum}: Kategori "${item.asset_category_name}" tidak ditemukan.`);
          }
        }
      }

      if (item.location_name) {
        const locKey = normalize(item.location_name);
        if (!branchMap[locKey]) {
          const matched = branches.find(b => 
            normalize(b.name).includes(locKey) || 
            (b.location && normalize(b.location).includes(locKey)) ||
            locKey.includes(normalize(b.name))
          );
          if (matched) {
            branchMap[locKey] = matched.id;
          } else {
            errors.push(`Baris ${rowNum}: Lokasi "${item.location_name}" tidak ditemukan.`);
          }
        }
      }

      if (item.pic_name) {
        const picKey = normalize(item.pic_name);
        if (!userMap[picKey]) {
          const matched = users.find(u => normalize(u.full_name).includes(picKey) || picKey.includes(normalize(u.full_name)));
          if (matched) {
            userMap[picKey] = matched.id;
          } else {
            // Optional: PIC can be logged or if strict:
            errors.push(`Baris ${rowNum}: PIC "${item.pic_name}" tidak ditemukan di data user.`);
          }
        }
      }

      if (item.condition_name) {
        const condKey = normalize(item.condition_name);
        if (!conditionMap[condKey]) {
          const matched = conditions.find(c => normalize(c.name).includes(condKey) || condKey.includes(normalize(c.name)));
          if (matched) {
            conditionMap[condKey] = matched.id;
          } else {
            errors.push(`Baris ${rowNum}: Kondisi "${item.condition_name}" tidak ditemukan.`);
          }
        }
      }

      if (item.status_name) {
        const statKey = normalize(item.status_name);
        if (!statusMap[statKey]) {
          const matched = statuses.find(s => normalize(s.name).includes(statKey) || statKey.includes(normalize(s.name)));
          if (matched) {
            statusMap[statKey] = matched.id;
          } else {
            errors.push(`Baris ${rowNum}: Status "${item.status_name}" tidak ditemukan.`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const createdAssets = await prisma.$transaction(async (tx) => {
      const inserted = [];
      for (const item of assets) {
        const compKey = normalize(item.company_name);
        const cleanCompKey = compKey.replace(/^pt\.?\s*/i, '').trim();
        const compId = companyMap[compKey] || companyMap[cleanCompKey];

        const catKey = item.asset_category_name ? normalize(item.asset_category_name) : null;
        const catId = catKey ? categoryMap[catKey] : null;
        
        let typeId = null;
        if (item.asset_type_name) {
          const typeKey = normalize(item.asset_type_name);
          typeId = catId ? (typeMap[`${catId}_${typeKey}`] || typeNameMap[typeKey] || null) : (typeNameMap[typeKey] || null);
        }

        const locKey = item.location_name ? normalize(item.location_name) : null;
        const locId = locKey ? branchMap[locKey] : null;

        const picKey = item.pic_name ? normalize(item.pic_name) : null;
        const picId = picKey ? userMap[picKey] : null;

        const condKey = item.condition_name ? normalize(item.condition_name) : null;
        const condId = condKey ? conditionMap[condKey] : defaultConditionId;

        const statKey = item.status_name ? normalize(item.status_name) : null;
        const statId = statKey ? statusMap[statKey] : defaultStatusId;

        let acqDate = null;
        if (item.acquisition_date && !isNaN(Date.parse(item.acquisition_date))) {
          acqDate = new Date(item.acquisition_date);
        }

        const newAsset = await tx.assets.create({
          data: {
            company_id: compId,
            asset_code: item.asset_code || null,
            asset_category_id: catId,
            asset_type_id: typeId,
            asset_name: item.asset_name,
            details: item.details || null,
            location_id: locId,
            room: item.room || null,
            pic_id: picId,
            acquisition_date: acqDate,
            acquisition_cost: item.acquisition_cost ? parseFloat(item.acquisition_cost) : 0,
            useful_life_months: item.useful_life_months ? parseInt(item.useful_life_months) : null,
            condition_id: condId,
            status_id: statId,
            information: item.information || null,
            reference_link: item.reference_link || null
          }
        });

        inserted.push(newAsset);
      }
      return inserted;
    });

    res.status(201).json({ message: `Berhasil mengimpor ${createdAssets.length} aset.`, data: createdAssets });
  } catch (err) {
    next(err);
  }
}


// PUT Update Asset
async function updateAsset(req, res, next) {
  try {
    const data = req.body;
    const assetId = parseInt(req.params.id);

    const updatedAsset = await prisma.assets.update({
      where: { id: assetId },
      data: {
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        asset_code: data.asset_code !== undefined ? data.asset_code : undefined,
        asset_category_id: data.asset_category_id !== undefined ? (data.asset_category_id ? parseInt(data.asset_category_id) : null) : undefined,
        asset_type_id: data.asset_type_id !== undefined ? (data.asset_type_id ? parseInt(data.asset_type_id) : null) : undefined,
        asset_name: data.asset_name !== undefined ? data.asset_name : undefined,
        details: data.details !== undefined ? data.details : undefined,
        location_id: data.location_id !== undefined ? (data.location_id ? parseInt(data.location_id) : null) : undefined,
        room: data.room !== undefined ? data.room : undefined,
        pic_id: data.pic_id !== undefined ? (data.pic_id ? parseInt(data.pic_id) : null) : undefined,
        acquisition_date: data.acquisition_date !== undefined ? (data.acquisition_date ? new Date(data.acquisition_date) : null) : undefined,
        acquisition_cost: data.acquisition_cost !== undefined ? parseFloat(data.acquisition_cost) : undefined,
        useful_life_months: data.useful_life_months !== undefined ? (data.useful_life_months ? parseInt(data.useful_life_months) : null) : undefined,
        condition_id: data.condition_id !== undefined ? (data.condition_id ? parseInt(data.condition_id) : null) : undefined,
        status_id: data.status_id !== undefined ? (data.status_id ? parseInt(data.status_id) : null) : undefined,
        information: data.information !== undefined ? data.information : undefined,
        reference_link: data.reference_link !== undefined ? data.reference_link : undefined
      }
    });

    res.json(updatedAsset);
  } catch (err) {
    next(err);
  }
}

// DELETE Asset
async function deleteAsset(req, res, next) {
  try {
    await prisma.assets.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Asset deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// POST Purge Assets (Bulk Delete / Reset with Security Safeguards)
async function purgeAssets(req, res, next) {
  try {
    const { confirmationText, password, companyId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Sesi tidak valid atau tidak terotentikasi.' });
    }

    // 1. Validasi Frasa Konfirmasi Eksplisit
    const expectedPhrase = 'HAPUS SEMUA ASET';
    if (!confirmationText || confirmationText.trim().toUpperCase() !== expectedPhrase) {
      return res.status(400).json({ 
        error: `Frasa konfirmasi tidak sesuai. Harap ketik "${expectedPhrase}" persis sama.` 
      });
    }

    // 2. Validasi Password Re-Authentication
    if (!password) {
      return res.status(400).json({ error: 'Password verifikasi akun wajib diisi.' });
    }

    const currentUser = await prisma.m_user.findUnique({
      where: { id: userId }
    });

    if (!currentUser || !currentUser.password) {
      return res.status(401).json({ error: 'Akun pengguna tidak ditemukan atau belum memiliki password terdaftar.' });
    }

    const isPasswordValid = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Password verifikasi salah. Harap masukkan password login akun Anda yang benar.' });
    }

    // 3. Tentukan Scope Filter
    const where = {};
    let scopeDescription = 'SEMUA PERUSAHAAN (GLOBAL)';
    if (companyId && companyId !== 'ALL' && companyId !== '') {
      const parsedCompId = parseInt(companyId);
      where.company_id = parsedCompId;
      const compInfo = await prisma.m_company.findUnique({
        where: { id: parsedCompId },
        select: { name: true }
      });
      scopeDescription = compInfo ? `PERUSAHAAN: ${compInfo.name} (ID: ${parsedCompId})` : `PERUSAHAAN ID: ${parsedCompId}`;
    }

    // 4. Eksekusi Transaksional Aman (Database Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Cari semua ID aset yang masuk scope
      const targetAssets = await tx.assets.findMany({
        where,
        select: { id: true, asset_name: true }
      });

      const assetIds = targetAssets.map(a => a.id);
      if (assetIds.length === 0) {
        return { count: 0, message: 'Tidak ada data aset yang ditemukan pada scope ini.' };
      }

      // a. Hapus child stock opname checks yang berelasi dengan aset-aset ini
      await tx.inventory_checks.deleteMany({
        where: {
          asset_id: { in: assetIds }
        }
      });

      // b. Lepaskan referensi asset_id di tabel maintenances (set null agar riwayat perawatan/biaya tetap aman)
      await tx.maintenances.updateMany({
        where: {
          asset_id: { in: assetIds }
        },
        data: {
          asset_id: null
        }
      });

      // c. Hapus relasi approval_requests jika ada
      try {
        await tx.approval_requests.deleteMany({
          where: {
            asset_id: { in: assetIds }
          }
        });
      } catch (err) {
        // Abaikan jika tidak ada model atau kolom
      }

      // d. Hapus data aset
      const deleteSummary = await tx.assets.deleteMany({
        where: {
          id: { in: assetIds }
        }
      });

      // e. Jika pembersihan global (semua aset), restart sequence ID ke 1
      if (!companyId || companyId === 'ALL' || companyId === '') {
        try {
          await tx.$executeRawUnsafe('ALTER SEQUENCE IF EXISTS glc_mra.assets_id_seq RESTART WITH 1;');
        } catch (seqErr) {
          console.warn('Notice: Reset sequence ignored or not supported in this connection:', seqErr.message);
        }
      }

      // f. Catat ke tabel audit_log
      try {
        await tx.audit_log.create({
          data: {
            table_name: 'assets',
            action: 'PURGE_ALL',
            record_id: null,
            user_id: userId,
            old_data: {
              deletedCount: deleteSummary.count,
              scope: scopeDescription,
              performed_by: currentUser.full_name,
              performed_at: new Date().toISOString()
            },
            new_data: {
              status: 'PURGED_SUCCESSFULLY'
            }
          }
        });
      } catch (auditErr) {
        console.warn('Notice: Audit log insert failed:', auditErr.message);
      }

      return { count: deleteSummary.count };
    });

    res.json({
      success: true,
      message: `Berhasil membersihkan ${result.count} data aset pada scope ${scopeDescription}.`,
      deletedCount: result.count
    });
  } catch (err) {
    next(err);
  }
}

// GET Asset Categories
async function getAssetCategories(req, res, next) {
  try {
    const list = await prisma.m_asset_category.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

// GET Asset Types
async function getAssetTypes(req, res, next) {
  try {
    const { categoryId } = req.query;
    const where = categoryId ? { category_id: parseInt(categoryId) } : {};
    const list = await prisma.m_asset_type.findMany({ where, orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

// GET Asset Conditions
async function getAssetConditions(req, res, next) {
  try {
    const list = await prisma.m_condition.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

// GET Asset Locations
async function getAssetLocations(req, res, next) {
  try {
    const list = await prisma.m_company_branch.findMany({ orderBy: { name: 'asc' } });
    const mapped = list.map(b => ({
      ...b,
      full_name: `${b.name} - ${b.location}`
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

// GET Asset Statuses
async function getAssetStatuses(req, res, next) {
  try {
    const list = await prisma.m_status.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAssets,
  getAssetDetail,
  createAsset,
  bulkImportAssets,
  updateAsset,
  deleteAsset,
  purgeAssets,
  getAssetCategories,
  getAssetTypes,
  getAssetConditions,
  getAssetLocations,
  getAssetStatuses
};
