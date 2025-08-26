// backend/routes/reportroutes.js (MVC refactor: uses controller)
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ReportController = require('../controllers/report.controller');

router.post('/', auth, ReportController.create);

module.exports = router;
