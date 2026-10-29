const express = require('express');
const { clients, events } = require('../models/models');
const { requireAuth, requireRole, withOrg } = require('../auth/authorization');

const router = express.Router();
const editor = [requireAuth, requireRole('editor')];
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function clientInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be an object');
    error.statusCode = 400;
    throw error;
  }
  const { _id, org, orgs, ...input } = body;
  return input;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.use(requireAuth);

router.get(
  '/',
  asyncRoute(async (req, res) => {
    res.json(await clients.find(withOrg({}, req, 'orgs')));
  })
);

router.get(
  '/id/:id',
  asyncRoute(async (req, res) => {
    const client = await clients.findOne(
      withOrg({ _id: req.params.id }, req, 'orgs')
    );
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.json(client);
  })
);

router.get(
  '/search',
  asyncRoute(async (req, res) => {
    const query = withOrg({}, req, 'orgs');
    const terms = [];
    if (req.query.searchBy === 'name') {
      if (req.query.firstName) {
        terms.push({
          firstName: { $regex: escapeRegex(req.query.firstName), $options: 'i' }
        });
      }
      if (req.query.lastName) {
        terms.push({
          lastName: { $regex: escapeRegex(req.query.lastName), $options: 'i' }
        });
      }
    } else if (req.query.searchBy === 'number' && req.query.phoneNumber) {
      terms.push({
        'phoneNumber.primary': {
          $regex: escapeRegex(req.query.phoneNumber),
          $options: 'i'
        }
      });
    } else {
      return res.status(400).json({ error: 'Invalid client search' });
    }
    if (terms.length) {
      query.$and = terms;
    }
    return res.json(await clients.find(query));
  })
);

router.get(
  '/byzip',
  asyncRoute(async (req, res) => {
    const results = await clients.aggregate([
      {
        $match: withOrg(
          { 'address.zip': { $exists: true, $ne: '' } },
          req,
          'orgs'
        )
      },
      { $group: { _id: '$address.zip', count: { $sum: 1 } } }
    ]);
    return res.json(results);
  })
);

router.post(
  '/',
  editor,
  asyncRoute(async (req, res) => {
    const client = await clients.create({
      ...clientInput(req.body),
      orgs: [req.user.orgId]
    });
    return res.status(201).json(client);
  })
);

router.put(
  '/update/:id',
  editor,
  asyncRoute(async (req, res) => {
    const client = await clients.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req, 'orgs'),
      { $set: clientInput(req.body) },
      { new: true, runValidators: true }
    );
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.json(client);
  })
);

router.delete(
  '/:id',
  editor,
  asyncRoute(async (req, res) => {
    const filter = withOrg({ _id: req.params.id }, req, 'orgs');
    const client = await clients.findOne(filter);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const registration = await events.findOne(
      withOrg({ attendees: req.params.id }, req)
    );
    if (registration) {
      return res.status(409).json({
        error: "Client is registered for events and can't be deleted"
      });
    }
    await clients.deleteOne(filter);
    return res.json({ message: 'Client deleted successfully' });
  })
);

module.exports = router;
