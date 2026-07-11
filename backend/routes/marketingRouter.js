const express = require('express');
const multer = require('multer');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const planController = require('./marketing/marketingPlanController');
const paymentController = require('./marketing/marketingPaymentController');
const approvalController = require('./marketing/marketingApprovalController');
const settingsController = require('./marketing/marketingSettingsController');
const amendmentController = require('./marketing/marketingAmendmentController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Metadata
router.get('/metadata', verifyToken, settingsController.getMetadata);

// Plans CRUD & Submission
router.post('/plans', verifyToken, checkRole(['admin', 'marketing']), planController.createPlan);
router.put('/plans/:id', verifyToken, checkRole(['admin', 'marketing']), planController.updatePlan);
router.post('/plans/:id/submit', verifyToken, checkRole(['admin', 'marketing']), planController.submitPlan);
router.post('/plans/:id/recall', verifyToken, checkRole(['admin', 'marketing']), planController.recallPlan);
router.put('/plans/:id/actuals', verifyToken, checkRole(['admin', 'marketing']), planController.updatePlanActuals);
router.put('/plans/:id/revise', verifyToken, checkRole(['admin', 'marketing']), planController.revisePlan);
router.post('/plans/:id/complete', verifyToken, checkRole(['admin', 'marketing']), planController.completePlan);
router.get('/plans', verifyToken, planController.getPlans);
router.get('/plans/:id', verifyToken, planController.getPlanDetail);
router.delete('/plans/:id', verifyToken, planController.deletePlan);

// Plan Amendments
router.post('/plans/:id/amendments', verifyToken, checkRole(['admin', 'marketing']), amendmentController.createAmendment);
router.get('/plans/:id/amendments', verifyToken, amendmentController.listAmendments);
router.get('/amendments/:id', verifyToken, amendmentController.getAmendmentDetail);
router.post('/amendments/:id/submit', verifyToken, checkRole(['admin', 'marketing']), amendmentController.submitAmendment);
router.post('/amendments/:id/review', verifyToken, checkRole(['admin', 'manager', 'finance']), amendmentController.reviewAmendment);
router.delete('/amendments/:id', verifyToken, amendmentController.deleteAmendment);

// Payments (Payment Requests)
router.get('/payments', verifyToken, paymentController.getPayments);
router.get('/payments/:id', verifyToken, paymentController.getPaymentDetail);
router.post('/payments', verifyToken, checkRole(['admin', 'marketing']), paymentController.createPaymentRequest);
router.put('/payments/:id', verifyToken, checkRole(['admin', 'marketing']), paymentController.updatePayment);
router.delete('/payments/:id', verifyToken, checkRole(['admin', 'marketing']), paymentController.deletePayment);
router.post('/payments/:id/mark-paid', verifyToken, checkRole(['admin']), paymentController.markPaymentPaid);

// Approvals & Tasks
router.get('/tasks', verifyToken, approvalController.getPendingTasks);
router.post('/approvals/:id', verifyToken, approvalController.processApproval);
router.get('/history', verifyToken, approvalController.getApprovalHistory);
router.get('/magic/:token', approvalController.getMagicLinkDetail);
router.post('/magic/:token', approvalController.processMagicLink);
router.get('/approvals-overview', verifyToken, approvalController.getApprovalsOverview);

// Approval Contacts (Admin only)
router.get('/approval-contacts', verifyToken, checkRole(['admin']), settingsController.getApprovalContacts);
router.put('/approval-contacts/:id', verifyToken, checkRole(['admin']), settingsController.updateApprovalContact);
router.post('/approval-contacts', verifyToken, checkRole(['admin']), settingsController.createApprovalContact);
router.delete('/approval-contacts/:id', verifyToken, checkRole(['admin']), settingsController.deleteApprovalContact);

// File Uploads
router.post('/upload', verifyToken, upload.single('file'), settingsController.uploadAttachment);
router.get('/attachments/:id', settingsController.serveAttachment);

// Branches CRUD
router.get('/branches', verifyToken, settingsController.getBranches);
router.post('/branches', verifyToken, settingsController.createBranch);
router.put('/branches/:id', verifyToken, settingsController.updateBranch);
router.delete('/branches/:id', verifyToken, settingsController.deleteBranch);

// Event Locations CRUD
router.get('/event-locations', verifyToken, settingsController.getEventLocations);
router.post('/event-locations', verifyToken, settingsController.createEventLocation);
router.put('/event-locations/:id', verifyToken, settingsController.updateEventLocation);
router.delete('/event-locations/:id', verifyToken, settingsController.deleteEventLocation);

// Budgets Control
router.get('/budgets', verifyToken, settingsController.getBudgets);
router.get('/budgets/check', verifyToken, settingsController.checkBudgetAvailability);
router.get('/budgets/:id', verifyToken, settingsController.getBudgetDetail);
router.post('/budgets', verifyToken, settingsController.createBudget);
router.put('/budgets/:id', verifyToken, settingsController.updateBudget);
router.put('/budgets/:id/lock', verifyToken, settingsController.lockBudget);
router.put('/budgets/:id/unlock', verifyToken, settingsController.unlockBudget);

module.exports = router;
