const express = require('express');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const {
  getDashboardStats,
  getNotifications,
  getSummary
} = require('./legal/legalDashboardController');

const {
  getContracts,
  getContractDetail,
  createContract,
  updateContract,
  deleteContract
} = require('./legal/legalContractController');

const {
  getInsurances,
  getInsuranceDetail,
  createInsurance,
  updateInsurance,
  deleteInsurance
} = require('./legal/legalInsuranceController');

const {
  getDivisions,
  getDocumentTypes
} = require('./legal/legalMasterController');

const {
  getLegalDocs,
  getLegalDocDetail,
  createLegalDoc,
  updateLegalDoc,
  deleteLegalDoc
} = require('./legal/legalDocController');

const {
  getLitigation,
  getLitigationDetail,
  createLitigation,
  updateLitigation,
  deleteLitigation
} = require('./legal/legalLitigationController');

const router = express.Router();

// Role checking definitions
const allowRead = verifyToken;
const allowWrite = [verifyToken, checkRole(['admin', 'legal', 'legal_compliance', 'ga'])];

// Dashboard Stats
router.get('/dashboard-stats', allowRead, getDashboardStats);

// Old Documents (PKS / Contracts)
router.get('/documents', allowRead, getContracts);
router.get('/documents/:id', allowRead, getContractDetail);
router.post('/documents', allowWrite, createContract);
router.put('/documents/:id', allowWrite, updateContract);
router.delete('/documents/:id', allowWrite, deleteContract);

// Insurances
router.get('/insurances', allowRead, getInsurances);
router.get('/insurances/:id', allowRead, getInsuranceDetail);
router.post('/insurances', allowWrite, createInsurance);
router.put('/insurances/:id', allowWrite, updateInsurance);
router.delete('/insurances/:id', allowWrite, deleteInsurance);

// Master
router.get('/divisions', allowRead, getDivisions);
router.get('/document-types', allowRead, getDocumentTypes);

// Legal Docs (Contract & Corporate)
router.get('/legal-docs', allowRead, getLegalDocs);
router.get('/legal-docs/:id', allowRead, getLegalDocDetail);
router.post('/legal-docs', allowWrite, createLegalDoc);
router.put('/legal-docs/:id', allowWrite, updateLegalDoc);
router.delete('/legal-docs/:id', allowWrite, deleteLegalDoc);

// Litigation
router.get('/litigation', allowRead, getLitigation);
router.get('/litigation/:id', allowRead, getLitigationDetail);
router.post('/litigation', allowWrite, createLitigation);
router.put('/litigation/:id', allowWrite, updateLitigation);
router.delete('/litigation/:id', allowWrite, deleteLitigation);

// Notifications & Summary
router.get('/notifications', allowRead, getNotifications);
router.get('/summary', allowRead, getSummary);

module.exports = router;
