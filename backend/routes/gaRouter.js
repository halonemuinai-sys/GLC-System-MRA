const express = require('express');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const assetController = require('./ga/gaAssetController');
const vehicleController = require('./ga/gaVehicleController');
const vendorController = require('./ga/gaVendorController');
const maintenanceController = require('./ga/gaMaintenanceController');
const deviceRentalController = require('./ga/gaDeviceRentalController');
const stockOpnameController = require('./ga/gaStockOpnameController');
const itRentalController = require('./ga/gaItRentalController');
const dashboardController = require('./ga/gaDashboardController');

const router = express.Router();

// Role checking definitions
const allowRead = verifyToken; // Semuanya yang terotentikasi bisa membaca untuk kemudahan dashboard terintegrasi
const allowWrite = [verifyToken, checkRole(['admin', 'ga'])];

// Dashboard Stats & Notifications
router.get('/dashboard-stats', allowRead, dashboardController.getDashboardStats);
router.get('/notifications', allowRead, dashboardController.getNotifications);

// Assets CRUD & Import
router.get('/assets', allowRead, assetController.getAssets);
router.get('/assets/:id', allowRead, assetController.getAssetDetail);
router.post('/assets', allowWrite, assetController.createAsset);
router.post('/assets/bulk-import', allowWrite, assetController.bulkImportAssets);
router.put('/assets/:id', allowWrite, assetController.updateAsset);
router.delete('/assets/:id', allowWrite, assetController.deleteAsset);

// Master Assets Fields
router.get('/assets-categories', allowRead, assetController.getAssetCategories);
router.get('/assets-types', allowRead, assetController.getAssetTypes);
router.get('/assets-conditions', allowRead, assetController.getAssetConditions);
router.get('/assets-locations', allowRead, assetController.getAssetLocations);
router.get('/assets-statuses', allowRead, assetController.getAssetStatuses);

// Vehicles CRUD
router.get('/vehicles', allowRead, vehicleController.getVehicles);
router.get('/vehicles/:id', allowRead, vehicleController.getVehicleDetail);
router.post('/vehicles', allowWrite, vehicleController.createVehicle);
router.put('/vehicles/:id', allowWrite, vehicleController.updateVehicle);
router.delete('/vehicles/:id', allowWrite, vehicleController.deleteVehicle);

// Vendors CRUD
router.get('/vendors', allowRead, vendorController.getVendors);
router.get('/vendors/:id', allowRead, vendorController.getVendorDetail);
router.post('/vendors', allowWrite, vendorController.createVendor);
router.put('/vendors/:id', allowWrite, vendorController.updateVendor);
router.delete('/vendors/:id', allowWrite, vendorController.deleteVendor);

// Maintenances CRUD
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
