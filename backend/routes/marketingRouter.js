const express = require('express');
const multer = require('multer');
const { verifyToken, checkRole, attachCompanyScope } = require('../api/authMiddleware');

const planController = require('./marketing/marketingPlanController');
const paymentController = require('./marketing/marketingPaymentController');
const claimController = require('./marketing/marketingClaimController');
const approvalController = require('./marketing/marketingApprovalController');
const settingsController = require('./marketing/marketingSettingsController');
const amendmentController = require('./marketing/marketingAmendmentController');
const closingController = require('./marketing/marketingClosingController');
const governanceController = require('./marketing/marketingGovernanceController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024 // 4MB (selaras dengan client_max_body_size nginx)
  }
});

// Metadata
router.get('/metadata', verifyToken, attachCompanyScope, settingsController.getMetadata);

// Plans CRUD & Submission
router.post('/plans', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), planController.createPlan);
router.put('/plans/:id', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), planController.updatePlan);
router.post('/plans/:id/submit', verifyToken, checkRole(['admin', 'marketing']), planController.submitPlan);
router.post('/plans/:id/recall', verifyToken, checkRole(['admin', 'marketing']), planController.recallPlan);
router.put('/plans/:id/actuals', verifyToken, checkRole(['admin', 'marketing']), planController.updatePlanActuals);
router.put('/plans/:id/revise', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), planController.revisePlan);
router.post('/plans/:id/revise', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), planController.revisePlan);
// Plan Closing (settlement biaya final vs dibayar + approval 1 approver via magic link)
router.get('/plans/:id/closing', verifyToken, attachCompanyScope, closingController.getClosing);
router.put('/plans/:id/closing', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), closingController.saveClosing);
router.post('/plans/:id/closing/submit', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), closingController.submitClosing);
router.put('/plans/:id/closing/approve', verifyToken, attachCompanyScope, checkRole(['admin']), closingController.approveClosing);
router.put('/plans/:id/closing/reject', verifyToken, attachCompanyScope, checkRole(['admin']), closingController.rejectClosing);
router.put('/plans/:id/closing/settle', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), closingController.settleClosing);
router.get('/closing/magic/:token', closingController.getClosingByToken);
router.post('/closing/magic/:token', closingController.processClosingByToken);

// Governance: pengingat closing (bell) & Quarterly Plan Alignment
router.get('/notifications', verifyToken, attachCompanyScope, governanceController.getNotifications);
router.get('/reports/quarterly-alignment', verifyToken, attachCompanyScope, governanceController.getQuarterlyAlignment);
router.get('/reports/reconciliation', verifyToken, attachCompanyScope, governanceController.getReconciliation);
router.get('/plans', verifyToken, attachCompanyScope, planController.getPlans);
router.get('/plans/:id', verifyToken, attachCompanyScope, planController.getPlanDetail);
router.post('/plans/:id/duplicate', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), planController.duplicatePlan);
router.delete('/plans/:id', verifyToken, planController.deletePlan);

// Plan Amendments
router.post('/plans/:id/amendments', verifyToken, checkRole(['admin', 'marketing']), amendmentController.createAmendment);
router.get('/plans/:id/amendments', verifyToken, amendmentController.listAmendments);
router.get('/amendments/:id', verifyToken, attachCompanyScope, amendmentController.getAmendmentDetail);
router.post('/amendments/:id/submit', verifyToken, checkRole(['admin', 'marketing']), amendmentController.submitAmendment);
router.post('/amendments/:id/review', verifyToken, checkRole(['admin', 'manager', 'finance']), amendmentController.reviewAmendment);
router.delete('/amendments/:id', verifyToken, amendmentController.deleteAmendment);

// Claims: one Finance approval, independent of payment approval rules.
router.post('/claims', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), claimController.createClaim);

// Payments (Payment Requests)
router.get('/payments', verifyToken, attachCompanyScope, paymentController.getPayments);
router.get('/payments/:id', verifyToken, attachCompanyScope, paymentController.getPaymentDetail);
router.post('/payments', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), paymentController.createPaymentRequest);
router.put('/payments/:id', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), paymentController.updatePayment);
router.delete('/payments/:id', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing']), paymentController.deletePayment);
router.post('/payments/:id/mark-paid', verifyToken, attachCompanyScope, checkRole(['admin', 'ga', 'finance']), paymentController.markPaymentPaid);
router.post('/payments/:id/set-po', verifyToken, attachCompanyScope, checkRole(['admin', 'ga']), paymentController.setPoNumber);
router.put('/payments/:id/verify', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), paymentController.verifyPayment);

// Approvals & Tasks
router.get('/tasks', verifyToken, attachCompanyScope, approvalController.getPendingTasks);
router.post('/approvals/:id', verifyToken, attachCompanyScope, approvalController.processApproval);
router.get('/history', verifyToken, attachCompanyScope, approvalController.getApprovalHistory);
router.get('/magic/:token', approvalController.getMagicLinkDetail);
router.post('/magic/:token', approvalController.processMagicLink);
router.get('/approvals-overview', verifyToken, attachCompanyScope, approvalController.getApprovalsOverview);

// Approval Contacts (Admin only)
router.get('/approval-contacts', verifyToken, checkRole(['admin', 'ga']), settingsController.getApprovalContacts);
router.put('/approval-contacts/:id', verifyToken, checkRole(['admin', 'ga']), settingsController.updateApprovalContact);
router.post('/approval-contacts', verifyToken, checkRole(['admin', 'ga']), settingsController.createApprovalContact);
router.delete('/approval-contacts/:id', verifyToken, checkRole(['admin', 'ga']), settingsController.deleteApprovalContact);

// Approval Signers — master data approver (Admin & GA, dipakai lintas modul termasuk BAP)
router.get('/approval-signers', verifyToken, checkRole(['admin', 'ga']), settingsController.getSigners);
router.post('/approval-signers', verifyToken, checkRole(['admin', 'ga']), settingsController.createSigner);
router.put('/approval-signers/:id', verifyToken, checkRole(['admin', 'ga']), settingsController.updateSigner);
router.delete('/approval-signers/:id', verifyToken, checkRole(['admin', 'ga']), settingsController.deleteSigner);

// File Uploads
router.post('/upload', verifyToken, upload.single('file'), settingsController.uploadAttachment);
router.get('/attachments/:id', settingsController.serveAttachment);

// Branches CRUD
router.get('/branches', verifyToken, settingsController.getBranches);
router.post('/branches', verifyToken, checkRole(['admin', 'marketing']), settingsController.createBranch);
router.put('/branches/:id', verifyToken, checkRole(['admin', 'marketing']), settingsController.updateBranch);
router.delete('/branches/:id', verifyToken, checkRole(['admin', 'marketing']), settingsController.deleteBranch);

// Event Locations CRUD
router.get('/event-locations', verifyToken, settingsController.getEventLocations);
router.post('/event-locations', verifyToken, checkRole(['admin', 'marketing']), settingsController.createEventLocation);
router.put('/event-locations/:id', verifyToken, checkRole(['admin', 'marketing']), settingsController.updateEventLocation);
router.delete('/event-locations/:id', verifyToken, checkRole(['admin', 'marketing']), settingsController.deleteEventLocation);

// Budgets Control (read = semua; write/lock = admin + finance)
router.get('/budgets', verifyToken, attachCompanyScope, settingsController.getBudgets);
router.get('/budgets/check', verifyToken, attachCompanyScope, settingsController.checkBudgetAvailability);
router.get('/budgets/:id', verifyToken, attachCompanyScope, settingsController.getBudgetDetail);
router.post('/budgets', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), settingsController.createBudget);
router.put('/budgets/:id', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), settingsController.updateBudget);
router.put('/budgets/:id/validate', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), settingsController.validateBudget);
router.put('/budgets/:id/lock', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), settingsController.lockBudget);
router.put('/budgets/:id/unlock', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), settingsController.unlockBudget);

// Month-End Closing & Reopen (admin + finance)
router.post('/budgets/:id/close-month', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), settingsController.closeMonth);
router.post('/budgets/:id/reopen-month', verifyToken, attachCompanyScope, checkRole(['admin', 'finance']), settingsController.reopenMonth);

// Budget Shifting (Relokasi Anggaran)
router.get('/budgets/:id/shifts', verifyToken, attachCompanyScope, settingsController.getBudgetShifts);
router.post('/budgets/:id/shifts', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing', 'finance']), settingsController.createBudgetShift);
router.post('/budgets/shifts/:shift_id/decision', verifyToken, attachCompanyScope, settingsController.processShiftDecision);

// Approval Rules CRUD (admin & GA)
router.get('/approval-rules', verifyToken, checkRole(['admin', 'ga']), settingsController.getApprovalRules);
router.post('/approval-rules', verifyToken, checkRole(['admin', 'ga']), settingsController.createApprovalRule);
router.put('/approval-rules/:id', verifyToken, checkRole(['admin', 'ga']), settingsController.updateApprovalRule);
router.delete('/approval-rules/:id', verifyToken, checkRole(['admin', 'ga']), settingsController.deleteApprovalRule);

module.exports = router;
