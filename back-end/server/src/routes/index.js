const express = require('express');
const identityRoutes = require('./identity');
const accessRoutes = require('./access');
const dataRoutes = require('./data');
const researchRoutes = require('./research');

const router = express.Router();

router.use('/identity', identityRoutes);
router.use('/access', accessRoutes);
router.use('/data', dataRoutes);
router.use('/research', researchRoutes);

module.exports = router;
