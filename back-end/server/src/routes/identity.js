const express = require('express');
const controller = require('../controllers/identityController');
const router = express.Router();

router.post('/register', controller.registerDID);
router.post('/login', controller.login);

module.exports = router;
