const express = require('express');
const { services, events } = require('../models/models');
const { requireAuth, requireRole, withOrg } = require('../auth/authorization');

const router = express.Router();
const editor = [requireAuth, requireRole('editor')];
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function serviceInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be an object');
    error.statusCode = 400;
    throw error;
  }
  const { _id, org, ...input } = body;
  return input;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.use(requireAuth);

router.get(
  '/',
  asyncRoute(async (req, res) => {
    res.json(await services.find(withOrg({}, req)).sort({ updatedAt: -1 }));
  })
);

router.get(
  '/id/:id',
  asyncRoute(async (req, res) => {
    const service = await services.findOne(
      withOrg({ _id: req.params.id }, req)
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    return res.json(service);
  })
);

router.get(
  '/search',
  asyncRoute(async (req, res) => {
    const query = withOrg({}, req);
    const field = req.query.searchBy;
    if (field !== 'name' && field !== 'description') {
      return res.status(400).json({ error: 'Invalid service search' });
    }
    query[field] = {
      $regex: escapeRegex(req.query[field] || ''),
      $options: 'i'
    };
    return res.json(await services.find(query));
  })
);

router.post(
  '/',
  editor,
  asyncRoute(async (req, res) => {
    const service = await services.create({
      ...serviceInput(req.body),
      org: req.user.orgId
    });
    return res.status(201).json(service);
  })
);

router.put(
  '/update/:id',
  editor,
  asyncRoute(async (req, res) => {
    const service = await services.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req),
      { $set: serviceInput(req.body) },
      { new: true, runValidators: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    return res.json(service);
  })
);

router.delete(
  '/:id',
  editor,
  asyncRoute(async (req, res) => {
    const filter = withOrg({ _id: req.params.id }, req);
    const service = await services.findOne(filter);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const inUse = await events.exists(
      withOrg({ services: req.params.id }, req)
    );
    if (inUse) {
      return res.status(409).json({
        error: 'Service cannot be deleted while used by events'
      });
    }
    await services.deleteOne(filter);
    return res.json({ message: 'Service deleted successfully' });
  })
);

module.exports = router;
