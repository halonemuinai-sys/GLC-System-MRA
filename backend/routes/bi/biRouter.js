const express = require('express');
const { verifyApiKey } = require('./biAuthMiddleware');
const ga = require('./gaBIController');

const router = express.Router();

// Semua route BI dilindungi API key (X-API-Key header)
router.use(verifyApiKey);

// ── GA Domain ──────────────────────────────────────────────────────────────────
// GET /api/bi/ga/overview       — consolidated KPIs
// GET /api/bi/ga/expenses       — budget vs actual per bulan/COA/company
// GET /api/bi/ga/assets         — asset breakdown by category/condition/status
// GET /api/bi/ga/vendors        — vendor status & contract values
// GET /api/bi/ga/maintenance    — maintenance cost trend
// GET /api/bi/ga/insurance      — premium breakdown & expiry status
// GET /api/bi/ga/scorecard      — 7 KPI benchmark (traffic light)

router.get('/ga/overview',    ga.getOverview);
router.get('/ga/expenses',    ga.getExpenses);
router.get('/ga/assets',      ga.getAssets);
router.get('/ga/vendors',     ga.getVendors);
router.get('/ga/maintenance', ga.getMaintenance);
router.get('/ga/insurance',   ga.getInsurance);
router.get('/ga/scorecard',   ga.getScorecard);

module.exports = router;
