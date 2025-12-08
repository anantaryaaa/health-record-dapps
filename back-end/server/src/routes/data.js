const express = require('express');
const controller = require('../controllers/dataController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/upload', auth, controller.uploadData);
router.get('/download/:hash', auth, controller.downloadData);

module.exports = router;
