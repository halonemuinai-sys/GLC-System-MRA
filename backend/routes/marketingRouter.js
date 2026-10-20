const express = require('express');
const multer = require('multer');
const { verifyToken, checkRole, attachCompanyScope } = require('../api/authMiddleware');
const { linkRateLimit } = require('../api/magicLinkGuard');
const publicLink = linkRateLimit();

const planController = require('./marketing/marketingPlanController');
const paymentController = require('./marketing/marketingPaymentController');
const claimController = require('./marketing/marketingClaimController');
const approvalController = require('./marketing/marketingApprovalController');
const settingsController = require('./marketing/marketingSettingsController');
const amendmentController = require('./marketing/marketingAmendmentController');
const closingController = require('./marketing/marketingClosingController');
const governanceController = require('./marketing/marketingGovernanceController');

const readinessController = require('./marketing/marketingReadinessController');
const router = express.Router();

// Role groups (a user passes when ANY of their roles is listed).
const MKT_INPUT = ['admin', 'marketing', 'marketing_manager'];          // create / edit own documents
const MKT_MANAGE = ['admin', 'marketing_manager'];                      // marketing master data & approval setup
const FIN = ['admin', 'finance'];                                       // budget control & finance verification
const OVERVIEW = ['admin', 'marketing_manager', 'finance', 'manager', 'auditor'];
const DIRECTORY = ['admin', 'ga', 'marketing_manager'];                // shared approver directory (Marketing + GA Berita Acara)
const MKT_READ = ['admin', 'marketing', 'marketing_manager', 'finance', 'ga', 'manager', 'auditor']; // marketing data (scoped; staff see own docs)


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024 // 4MB (selaras dengan client_max_body_size nginx)
  }
});

// Metadata
router.get('/metadata', verifyToken, attachCompanyScope, settingsController.getMetadata);

// Plans CRUD & Submission
router.post('/plans', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.createPlan);
router.put('/plans/:id', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.updatePlan);
router.post('/plans/:id/submit', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.submitPlan);
router.post('/plans/:id/recall', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.recallPlan);
router.delete('/plans/:id/actuals', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.clearPlanActuals);
router.put('/plans/:id/actuals', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.updatePlanActuals);
router.put('/plans/:id/revise', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.revisePlan);
router.post('/plans/:id/revise', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.revisePlan);
// Plan Closing (settlement biaya final vs dibayar + approval 1 approver via magic link)
router.get('/plans/:id/closing', verifyToken, attachCompanyScope, checkRole(MKT_READ), closingController.getClosing);
router.put('/plans/:id/closing', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), closingController.saveClosing);
router.post('/plans/:id/closing/submit', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), closingController.submitClosing);
router.put('/plans/:id/closing/approve', verifyToken, attachCompanyScope, checkRole(['admin']), closingController.approveClosing);
router.put('/plans/:id/closing/reject', verifyToken, attachCompanyScope, checkRole(['admin']), closingController.rejectClosing);
router.put('/plans/:id/closing/settle', verifyToken, attachCompanyScope, checkRole(FIN), closingController.settleClosing);
router.post('/plans/:id/closing/resend-link', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing', 'marketing_manager', 'finance']), closingController.resendClosingLink);
router.get('/closing/magic/:token', publicLink, closingController.getClosingByToken);
router.post('/closing/magic/:token', publicLink, closingController.processClosingByToken);

// Governance: pengingat closing (bell) & Quarterly Plan Alignment
router.get('/notifications', verifyToken, attachCompanyScope, checkRole(MKT_READ), governanceController.getNotifications);
router.get('/reports/quarterly-alignment', verifyToken, attachCompanyScope, checkRole(MKT_READ), governanceController.getQuarterlyAlignment);
router.get('/readiness', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing_manager', 'finance', 'auditor']), readinessController.getReadiness);
router.get('/reports/reconciliation', verifyToken, attachCompanyScope, checkRole(['admin', 'finance', 'marketing_manager', 'ga', 'manager', 'auditor']), governanceController.getReconciliation);
router.get('/plans', verifyToken, attachCompanyScope, checkRole(MKT_READ), planController.getPlans);
router.get('/plans/:id', verifyToken, attachCompanyScope, checkRole(MKT_READ), planController.getPlanDetail);
router.post('/plans/:id/duplicate', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.duplicatePlan);
router.delete('/plans/:id', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), planController.deletePlan);

// Plan Amendments
router.post('/plans/:id/amendments', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), amendmentController.createAmendment);
router.get('/plans/:id/amendments', verifyToken, attachCompanyScope, checkRole(MKT_READ), amendmentController.listAmendments);
router.get('/amendments/:id', verifyToken, attachCompanyScope, checkRole(MKT_READ), amendmentController.getAmendmentDetail);
router.post('/amendments/:id/submit', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), amendmentController.submitAmendment);
router.post('/amendments/:id/review', verifyToken, attachCompanyScope, checkRole(['admin', 'manager', 'marketing_manager', 'finance']), amendmentController.reviewAmendment);
router.delete('/amendments/:id', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), amendmentController.deleteAmendment);

// Claims: one Finance approval, independent of payment approval rules.
router.post('/claims', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), claimController.createClaim);
router.put('/claims/:id', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), claimController.updateClaim);
router.delete('/claims/:id', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), claimController.deleteClaim);

// Payments (Payment Requests)
router.get('/payments', verifyToken, attachCompanyScope, checkRole(MKT_READ), paymentController.getPayments);
router.get('/payments/:id', verifyToken, attachCompanyScope, checkRole(MKT_READ), paymentController.getPaymentDetail);
router.post('/payments', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), paymentController.createPaymentRequest);
router.put('/payments/:id', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), paymentController.updatePayment);
router.delete('/payments/:id', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), paymentController.deletePayment);
router.post('/payments/:id/recheck-budget', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), paymentController.recheckBudget);
router.post('/payments/:id/mark-paid', verifyToken, attachCompanyScope, checkRole(FIN), paymentController.markPaymentPaid);
router.post('/payments/:id/set-po', verifyToken, attachCompanyScope, checkRole(MKT_MANAGE), paymentController.setPoNumber);
router.put('/payments/:id/verify', verifyToken, attachCompanyScope, checkRole(FIN), paymentController.verifyPayment);

// Approvals & Tasks
router.get('/tasks', verifyToken, attachCompanyScope, approvalController.getPendingTasks);
router.post('/approvals/:id', verifyToken, attachCompanyScope, approvalController.processApproval);
router.get('/history', verifyToken, attachCompanyScope, approvalController.getApprovalHistory);
router.post('/approvals/:historyId/resend-link', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing', 'marketing_manager', 'finance']), approvalController.resendApprovalLink);
router.get('/magic/:token', publicLink, approvalController.getMagicLinkDetail);
router.post('/magic/:token', publicLink, approvalController.processMagicLink);
router.get('/approvals-overview', verifyToken, attachCompanyScope, checkRole(OVERVIEW), approvalController.getApprovalsOverview);

// Approval Contacts (Admin only)
router.get('/approval-contacts', verifyToken, checkRole(MKT_MANAGE), settingsController.getApprovalContacts);
router.put('/approval-contacts/:id', verifyToken, checkRole(MKT_MANAGE), settingsController.updateApprovalContact);
router.post('/approval-contacts', verifyToken, checkRole(MKT_MANAGE), settingsController.createApprovalContact);
router.delete('/approval-contacts/:id', verifyToken, checkRole(MKT_MANAGE), settingsController.deleteApprovalContact);

// Approval Signers — master data approver (Admin & GA, dipakai lintas modul termasuk BAP)
router.get('/approval-signers', verifyToken, checkRole(DIRECTORY), settingsController.getSigners);
router.post('/approval-signers', verifyToken, checkRole(DIRECTORY), settingsController.createSigner);
router.put('/approval-signers/:id', verifyToken, checkRole(DIRECTORY), settingsController.updateSigner);
router.delete('/approval-signers/:id', verifyToken, checkRole(DIRECTORY), settingsController.deleteSigner);

// File Uploads
router.post('/upload', verifyToken, upload.single('file'), settingsController.uploadAttachment);
router.get('/attachments/:id', settingsController.serveAttachment);

// Branches CRUD
router.get('/branches', verifyToken, checkRole(MKT_READ), settingsController.getBranches);
// Staff may add a branch / event location straight from the plan form; edit & delete stay with managers.
router.post('/branches', verifyToken, attachCompanyScope, checkRole(MKT_INPUT), settingsController.createBranch);
router.put('/branches/:id', verifyToken, checkRole(MKT_MANAGE), settingsController.updateBranch);
router.delete('/branches/:id', verifyToken, checkRole(MKT_MANAGE), settingsController.deleteBranch);

// Event Locations CRUD
router.get('/event-locations', verifyToken, checkRole(MKT_READ), settingsController.getEventLocations);
router.post('/event-locations', verifyToken, checkRole(MKT_INPUT), settingsController.createEventLocation);
router.put('/event-locations/:id', verifyToken, checkRole(MKT_MANAGE), settingsController.updateEventLocation);
router.delete('/event-locations/:id', verifyToken, checkRole(MKT_MANAGE), settingsController.deleteEventLocation);

// Budgets Control (read = semua; write/lock = admin + finance)
router.get('/budgets', verifyToken, attachCompanyScope, checkRole(MKT_READ), settingsController.getBudgets);
router.get('/budgets/check', verifyToken, attachCompanyScope, checkRole(MKT_READ), settingsController.checkBudgetAvailability);
router.get('/budgets/:id', verifyToken, attachCompanyScope, checkRole(MKT_READ), settingsController.getBudgetDetail);
router.post('/budgets', verifyToken, attachCompanyScope, checkRole(FIN), settingsController.createBudget);
router.put('/budgets/:id', verifyToken, attachCompanyScope, checkRole(FIN), settingsController.updateBudget);
router.put('/budgets/:id/validate', verifyToken, attachCompanyScope, checkRole(FIN), settingsController.validateBudget);
router.put('/budgets/:id/lock', verifyToken, attachCompanyScope, checkRole(FIN), settingsController.lockBudget);
router.put('/budgets/:id/unlock', verifyToken, attachCompanyScope, checkRole(FIN), settingsController.unlockBudget);

// Month-End Closing & Reopen (admin + finance)
router.post('/budgets/:id/close-month', verifyToken, attachCompanyScope, checkRole(FIN), settingsController.closeMonth);
router.post('/budgets/:id/reopen-month', verifyToken, attachCompanyScope, checkRole(FIN), settingsController.reopenMonth);

// Budget Shifting (Relokasi Anggaran)
router.get('/budgets/:id/shifts', verifyToken, attachCompanyScope, checkRole(MKT_READ), settingsController.getBudgetShifts);
router.post('/budgets/:id/shifts', verifyToken, attachCompanyScope, checkRole(['admin', 'marketing', 'marketing_manager', 'finance']), settingsController.createBudgetShift);
router.post('/budgets/shifts/:shift_id/decision', verifyToken, attachCompanyScope, settingsController.processShiftDecision);

// Approval Rules CRUD (admin & GA)
router.get('/approval-rules', verifyToken, checkRole(MKT_MANAGE), settingsController.getApprovalRules);
router.post('/approval-rules', verifyToken, checkRole(MKT_MANAGE), settingsController.createApprovalRule);
router.put('/approval-rules/:id', verifyToken, checkRole(MKT_MANAGE), settingsController.updateApprovalRule);
router.delete('/approval-rules/:id', verifyToken, checkRole(MKT_MANAGE), settingsController.deleteApprovalRule);

module.exports = router;
