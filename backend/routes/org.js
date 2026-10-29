const express = require('express');
const { orgs } = require('../models/models');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const organization = await orgs.findById(process.env.ORG_ID);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.json(organization.name);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
