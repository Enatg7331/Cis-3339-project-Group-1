const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.user.orgId) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

function withOrg(filter, req, field = 'org') {
  if (!req.user?.orgId) {
    throw new Error('Authenticated organization is missing');
  }
  return { ...filter, [field]: req.user.orgId };
}

module.exports = { requireAuth, requireRole, withOrg };
