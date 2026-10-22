const express = require('express');
const { verifyToken, checkRole, attachCompanyScope } = require('../api/authMiddleware');
const { hasRole } = require('../api/roles');

const assetController = require('./ga/gaAssetController');
const vehicleController = require('./ga/gaVehicleController');
const vendorController = require('./ga/gaVendorController');
const maintenanceController = require('./ga/gaMaintenanceController');
const deviceRentalController = require('./ga/gaDeviceRentalController');
const stockOpnameController = require('./ga/gaStockOpnameController');
const itRentalController = require('./ga/gaItRentalController');
const dashboardController = require('./ga/gaDashboardController');
const assetDisposalController = require('./ga/gaAssetDisposalController');
const assetHandoverController = require('./ga/gaAssetHandoverController');
const disposedAssetController = require('./ga/gaDisposedAssetController');
const marketingPoController = require('./ga/gaMarketingPoController');

const router = express.Router();

// Role checking definitions
// GA data is readable by GA, admin and auditor (including users who hold GA as an extra role).
const allowRead = [verifyToken, checkRole(['admin', 'ga', 'auditor'])];
// The vendor master is also used by Legal/Compliance documents, Marketing plans and Finance.
const allowVendorRead = [verifyToken, checkRole(['admin', 'ga', 'auditor', 'legal', 'compliance', 'legal_compliance', 'marketing', 'marketing_manager', 'finance'])];
// Bell in the header: users without GA access simply get no GA notifications.
const gaNotificationsOrEmpty = [verifyToken, (req, res, next) => (hasRole(req, 'admin', 'ga', 'auditor') ? next() : res.json({ total: 0, items: [] }))];
const allowWrite = [verifyToken, checkRole(['admin', 'ga'])];
// Deciding a Berita Acara from inside the app bypasses the approver, so it is admin only.
const adminOnly = [verifyToken, checkRole(['admin'])];
const { linkRateLimit } = require('../api/magicLinkGuard');
const publicLink = linkRateLimit();
const allowAdminOnly = [verifyToken, checkRole(['admin', 'superadmin'])];
// Marketing no longer registers vendors directly: unknown vendors on a plan become Pending for GA.
const allowVendorWrite = [verifyToken, checkRole(['admin', 'ga', 'legal', 'compliance', 'legal_compliance'])];

// Dashboard Stats & Notifications
router.get('/dashboard-stats', allowRead, dashboardController.getDashboardStats);
router.get('/notifications', gaNotificationsOrEmpty, dashboardController.getNotifications);

// Assets CRUD & Import
router.get('/assets', allowRead, assetController.getAssets);
router.get('/assets/:id', allowRead, assetController.getAssetDetail);
router.post('/assets', allowWrite, assetController.createAsset);
router.post('/assets/bulk-import', allowWrite, assetController.bulkImportAssets);
router.post('/assets/purge', allowAdminOnly, assetController.purgeAssets);
router.put('/assets/:id', allowWrite, assetController.updateAsset);
router.delete('/assets/:id', allowWrite, assetController.deleteAsset);

// Master Assets Fields
router.get('/assets-categories', allowRead, assetController.getAssetCategories);
router.get('/assets-types', allowRead, assetController.getAssetTypes);
router.get('/assets-conditions', allowRead, assetController.getAssetConditions);
router.get('/assets-locations', allowRead, assetController.getAssetLocations);
router.get('/assets-statuses', allowRead, assetController.getAssetStatuses);

// Disposed assets registry (read-only; written off through approved BAPs)
router.get('/assets-disposed', allowRead, disposedAssetController.getDisposedAssets);
router.get('/assets-disposed/reasons', allowRead, disposedAssetController.getDisposalReasons);

// Asset Disposals (Berita Acara Penghapusan Aset / BAP)
router.get('/asset-disposals', allowRead, assetDisposalController.getAssetDisposals);
// Active approver names/emails for signer pickers (Berita Acara and Marketing closing).
router.get('/asset-disposal-signers', [verifyToken, checkRole(['admin', 'ga', 'auditor', 'marketing', 'marketing_manager', 'finance', 'manager'])], assetDisposalController.getApprovalSigners);
router.get('/asset-disposals/last-signatories', allowRead, assetDisposalController.getLastSignatories);
router.get('/asset-disposals/:id', allowRead, assetDisposalController.getAssetDisposalDetail);
router.put('/asset-disposals/:id/signatories', allowWrite, assetDisposalController.updateSignatories);
router.post('/asset-disposals', allowWrite, assetDisposalController.createAssetDisposal);
router.put('/asset-disposals/:id', allowWrite, assetDisposalController.updateAssetDisposal);
router.put('/asset-disposals/:id/submit', allowWrite, assetDisposalController.submitAssetDisposal);
router.put('/asset-disposals/:id/approve', adminOnly, assetDisposalController.approveAssetDisposal);
router.put('/asset-disposals/:id/reject', adminOnly, assetDisposalController.rejectAssetDisposal);
router.delete('/asset-disposals/:id', allowWrite, assetDisposalController.deleteAssetDisposal);
// Approval via magic link email — publik, tanpa login
router.get('/asset-disposals/magic/:token', publicLink, assetDisposalController.getDisposalByToken);
router.post('/asset-disposals/magic/:token', publicLink, assetDisposalController.processDisposalByToken);
router.put('/asset-disposals/:id/resend-link', allowWrite, assetDisposalController.resendDisposalLink);

// Asset Handovers (Berita Acara Serah Terima / BAST)
router.get('/asset-handovers', allowRead, assetHandoverController.getAssetHandovers);
router.get('/asset-handovers/:id', allowRead, assetHandoverController.getAssetHandoverDetail);
router.post('/asset-handovers', allowWrite, assetHandoverController.createAssetHandover);
router.put('/asset-handovers/:id/submit', allowWrite, assetHandoverController.submitAssetHandover);
router.put('/asset-handovers/:id/approve', adminOnly, assetHandoverController.approveAssetHandover);
router.put('/asset-handovers/:id/reject', adminOnly, assetHandoverController.rejectAssetHandover);
router.delete('/asset-handovers/:id', allowWrite, assetHandoverController.deleteAssetHandover);
// Approval BAST via magic link email — publik, tanpa login
router.get('/asset-handovers/magic/:token', publicLink, assetHandoverController.getHandoverByToken);
router.post('/asset-handovers/magic/:token', publicLink, assetHandoverController.processHandoverByToken);
router.put('/asset-handovers/:id/resend-link', allowWrite, assetHandoverController.resendHandoverLink);

// Marketing purchase orders (basis for NetSuite POs). Scoped to the user's companies.
const poRead = [verifyToken, checkRole(['admin', 'ga', 'finance', 'marketing', 'marketing_manager', 'auditor']), attachCompanyScope];
const poWrite = [verifyToken, checkRole(['admin', 'ga']), attachCompanyScope];
router.get('/marketing-po/queue', poRead, marketingPoController.getQueue);
router.get('/marketing-po/vendors', poRead, marketingPoController.getVendorOptions);
router.get('/marketing-po/for-item/:itemId', poRead, marketingPoController.getPosForItem);
router.post('/marketing-po/netsuite-export', poWrite, marketingPoController.exportForNetsuite);
router.get('/marketing-po', poRead, marketingPoController.getPurchaseOrders);
router.get('/marketing-po/:id', poRead, marketingPoController.getPurchaseOrder);
router.post('/marketing-po', poWrite, marketingPoController.createPurchaseOrder);
router.put('/marketing-po/:id', poWrite, marketingPoController.updatePurchaseOrder);
router.post('/marketing-po/:id/issue', poWrite, marketingPoController.issuePurchaseOrder);
router.post('/marketing-po/:id/cancel', poWrite, marketingPoController.cancelPurchaseOrder);
router.post('/marketing-po/:id/close', poWrite, marketingPoController.closePurchaseOrder);
router.post('/marketing-po/:id/reopen', poWrite, marketingPoController.reopenPurchaseOrder);
router.put('/marketing-po/:id/netsuite', poWrite, marketingPoController.setNetsuiteRef);
router.delete('/marketing-po/:id', poWrite, marketingPoController.deletePurchaseOrder);

// Vehicles CRUD
router.get('/vehicles', allowRead, vehicleController.getVehicles);
router.get('/vehicles/:id', allowRead, vehicleController.getVehicleDetail);
router.post('/vehicles', allowWrite, vehicleController.createVehicle);
router.put('/vehicles/:id', allowWrite, vehicleController.updateVehicle);
router.delete('/vehicles/:id', allowWrite, vehicleController.deleteVehicle);

// Vendors CRUD
router.get('/vendors', allowVendorRead, vendorController.getVendors);
router.get('/vendors/:id', allowVendorRead, vendorController.getVendorDetail);
router.post('/vendors', allowVendorWrite, vendorController.createVendor);
router.put('/vendors/:id', allowVendorWrite, vendorController.updateVendor);
router.delete('/vendors/:id', allowVendorWrite, vendorController.deleteVendor);


// Maintenances CRUD
router.get('/maintenances/journey', allowRead, maintenanceController.getMaintenanceJourney);
router.get('/maintenances/asset-marks', allowRead, maintenanceController.getAssetMaintenanceMarks);
router.post('/maintenances/bulk', allowWrite, maintenanceController.createBulkMaintenance);
router.get('/maintenances', allowRead, maintenanceController.getMaintenances);
router.post('/maintenances', allowWrite, maintenanceController.createMaintenance);
router.put('/maintenances/:id', allowWrite, maintenanceController.updateMaintenance);
router.delete('/maintenances/:id', allowWrite, maintenanceController.deleteMaintenance);

// Device Rentals CRUD
router.get('/device-rentals', allowRead, deviceRentalController.getDeviceRentals);
router.post('/device-rentals', allowWrite, deviceRentalController.createDeviceRental);
router.put('/device-rentals/:id', allowWrite, deviceRentalController.updateDeviceRental);
router.delete('/device-rentals/:id', allowWrite, deviceRentalController.deleteDeviceRental);

// Helpdesk / IT Rentals Assignment
router.get('/helpdesk-users', allowRead, itRentalController.getHelpdeskUsers);
router.post('/it-rentals/:id/assign-user', allowWrite, itRentalController.assignItRentalUser);

// Stock Opname CRUD
router.get('/stock-opname', allowRead, stockOpnameController.getStockOpname);
router.post('/stock-opname', allowWrite, stockOpnameController.createStockOpnameSession);
router.delete('/stock-opname/:id', allowWrite, stockOpnameController.deleteStockOpnameSession);
router.post('/stock-opname/scan', allowWrite, stockOpnameController.scanInventoryCheck);

// Expenses & Budgets
router.get('/expenses/years', allowRead, dashboardController.getExpenseYears);
router.get('/expenses/summary', allowRead, dashboardController.getExpenseSummary);

// Benchmark Scorecard
router.get('/benchmark-scorecard', allowRead, dashboardController.getBenchmarkScorecard);
router.get('/benchmark-scorecard/company/:companyId', allowRead, dashboardController.getBenchmarkCompanyDetail);

module.exports = router;
