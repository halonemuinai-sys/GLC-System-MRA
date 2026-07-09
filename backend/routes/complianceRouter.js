const express = require('express');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const docController = require('./compliance/complianceDocController');
const licenseController = require('./compliance/complianceLicenseController');
const monitoringController = require('./compliance/complianceMonitoringController');
const sopController = require('./compliance/complianceSopController');
const dashboardController = require('./compliance/complianceDashboardController');

const router = express.Router();

// Role checking definitions
const allowRead = verifyToken;
const allowWrite = [verifyToken, checkRole(['admin', 'compliance', 'legal_compliance'])];

// Generic Documents CRUD & Bulk Import
router.get('/documents', allowRead, docController.getDocuments);
router.get('/documents/:id', allowRead, docController.getDocumentDetail);
router.post('/documents', allowWrite, docController.createDocument);
router.post('/documents/bulk-import', allowWrite, docController.bulkImportDocuments);
router.put('/documents/:id', allowWrite, docController.updateDocument);
router.delete('/documents/:id', allowWrite, docController.deleteDocument);

// Licenses & Permits CRUD
router.get('/licenses', allowRead, licenseController.getLicenses);
router.get('/licenses/:id', allowRead, licenseController.getLicenseDetail);
router.post('/licenses', allowWrite, licenseController.createLicense);
router.put('/licenses/:id', allowWrite, licenseController.updateLicense);
router.delete('/licenses/:id', allowWrite, licenseController.deleteLicense);

// Compliance Monitoring CRUD
router.get('/monitoring', allowRead, monitoringController.getMonitoring);
router.get('/monitoring/:id', allowRead, monitoringController.getMonitoringDetail);
router.post('/monitoring', allowWrite, monitoringController.createMonitoring);
router.put('/monitoring/:id', allowWrite, monitoringController.updateMonitoring);
router.delete('/monitoring/:id', allowWrite, monitoringController.deleteMonitoring);

// SOP & Policy CRUD
router.get('/sop', allowRead, sopController.getSop);
router.get('/sop/:id', allowRead, sopController.getSopDetail);
router.post('/sop', allowWrite, sopController.createSop);
router.put('/sop/:id', allowWrite, sopController.updateSop);
router.delete('/sop/:id', allowWrite, sopController.deleteSop);

// Notifications & Summary
router.get('/notifications', allowRead, dashboardController.getNotifications);
router.get('/summary', allowRead, dashboardController.getSummary);

module.exports = router;
