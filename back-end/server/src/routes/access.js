const express = require('express');
const controller = require('../controllers/accessController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/grant', auth, controller.grantAccess);
router.post('/revoke', auth, controller.revokeAccess);

module.exports = router;
