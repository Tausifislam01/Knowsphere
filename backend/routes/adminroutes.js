// backend/routes/adminroutes.js
const express = require('express');
const router = express.Router();

const { auth, adminAuth } = require('../middleware/auth');
const Admin = require('../controllers/admin.controller');

// ---------------- Reports ----------------
// Pending reports
router.get('/reports/pending', auth, adminAuth, Admin.getPendingReports);

// Handled reports (primary)
router.get('/reports/handled', auth, adminAuth, Admin.getHandledReports);

// Alias used by the AdminDashboard “Handled” tab
router.get('/handled-reports', auth, adminAuth, Admin.getHandledReports);

// Resolve/dismiss with optional note
// Body: { status: 'resolved' | 'dismissed', note?: string }
// Back-compat also supports { dismiss: boolean, note?: string }
router.post('/reports/:id/resolve', auth, adminAuth, Admin.resolveReportWithNote);

// ---------------- Users ----------------
router.get('/users', auth, adminAuth, Admin.listAllUsers);
router.get('/user-report-count/:userId', auth, adminAuth, Admin.getUserReportCount);
router.post('/users/:id/ban', auth, adminAuth, Admin.banUser);
router.post('/users/:id/unban', auth, adminAuth, Admin.unbanUser);

// ---------------- Content moderation ----------------
router.put('/insights/:id/hide', auth, adminAuth, Admin.hideInsight);
router.delete('/insights/:id', auth, adminAuth, Admin.deleteInsight);

router.put('/comments/:id/hide', auth, adminAuth, Admin.hideComment);
router.delete('/comments/:id', auth, adminAuth, Admin.deleteComment);

module.exports = router;
