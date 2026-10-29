const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { users } = require('../models/models');
const { requireAuth } = require('../auth/authorization');

const router = express.Router();

router.get('/session', requireAuth, (req, res) => {
  res.json({
    name: req.user.name || '',
    role: req.user.role,
    orgId: req.user.orgId
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const username = String(body.username || '');
    const password = String(body.password || '');
    const user = await users.findOne({
      username,
      org: process.env.ORG_ID
    });
    const validPassword =
      user && (await bcrypt.compare(password, user.password));
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = jwt.sign(
      {
        sub: user._id.toString(),
        name: user.name,
        role: user.role,
        orgId: user.org.toString()
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({ token });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
