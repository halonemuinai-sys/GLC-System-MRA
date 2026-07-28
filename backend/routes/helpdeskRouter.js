const express = require('express');
const { verifyToken } = require('../api/authMiddleware');
const ctrl = require('./helpdesk/helpdeskController');

const router = express.Router();

router.get('/categories', verifyToken, ctrl.getCategories);
router.post('/tickets', verifyToken, ctrl.createTicket);
router.get('/tickets', verifyToken, ctrl.getMyTickets);
router.get('/tickets/:id', verifyToken, ctrl.getTicketDetail);

module.exports = router;
