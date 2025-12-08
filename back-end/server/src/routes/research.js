const express = require('express');
const controller = require('../controllers/researchController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/request', auth, controller.requestResearch);
router.get('/result/:id', auth, controller.getResearchResult);

module.exports = router;
