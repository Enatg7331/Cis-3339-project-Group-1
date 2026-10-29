const express = require('express');
const { events, clients, services } = require('../models/models');
const { requireAuth, requireRole, withOrg } = require('../auth/authorization');

const router = express.Router();
const editor = [requireAuth, requireRole('editor')];
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function eventInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be an object');
    error.statusCode = 400;
    throw error;
  }
  const { _id, org, attendees, ...input } = body;
  return input;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function validateServices(serviceIds, req) {
  if (!serviceIds?.length) {
    return true;
  }
  const count = await services.countDocuments(
    withOrg({ _id: { $in: serviceIds } }, req)
  );
  return count === serviceIds.length;
}

router.use(requireAuth);

router.get(
  '/',
  asyncRoute(async (req, res) => {
    return res.json(await events.find(withOrg({}, req)).sort({ date: -1 }));
  })
);

router.get(
  '/search',
  asyncRoute(async (req, res) => {
    const query = withOrg({}, req);
    if (req.query.searchBy === 'name') {
      query.name = { $regex: escapeRegex(req.query.name || ''), $options: 'i' };
    } else if (req.query.searchBy === 'date') {
      const start = new Date(`${req.query.eventDate}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ error: 'Invalid event date' });
      }
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      query.date = { $gte: start, $lt: end };
    } else {
      return res.status(400).json({ error: 'Invalid event search' });
    }
    return res.json(await events.find(query));
  })
);

router.get(
  '/client/:id/not-registered',
  asyncRoute(async (req, res) => {
    const client = await clients.findOne(
      withOrg({ _id: req.params.id }, req, 'orgs')
    );
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.json(
      await events.find(withOrg({ attendees: { $ne: client._id } }, req))
    );
  })
);

router.get(
  '/client/:id',
  asyncRoute(async (req, res) => {
    const client = await clients.findOne(
      withOrg({ _id: req.params.id }, req, 'orgs')
    );
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.json(await events.find(withOrg({ attendees: client._id }, req)));
  })
);

router.get(
  '/attendees/:id',
  asyncRoute(async (req, res) => {
    const event = await events.findOne(withOrg({ _id: req.params.id }, req));
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json(
      await clients.find(
        withOrg({ _id: { $in: event.attendees } }, req, 'orgs')
      )
    );
  })
);

router.get(
  '/service/:id',
  asyncRoute(async (req, res) => {
    const service = await services.findOne(
      withOrg({ _id: req.params.id }, req)
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const results = await events
      .find(withOrg({ services: service._id }, req))
      .select({ _id: 1, name: 1, date: 1, address: { line1: 1 } })
      .lean();
    return res.json(results);
  })
);

router.get(
  '/attendance',
  asyncRoute(async (req, res) => {
    const since = new Date();
    since.setMonth(since.getMonth() - 2);
    return res.json(
      await events
        .find(withOrg({ date: { $gte: since } }, req))
        .sort({ date: 1 })
    );
  })
);

router.get(
  '/id/:id',
  asyncRoute(async (req, res) => {
    const event = await events.findOne(withOrg({ _id: req.params.id }, req));
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json(event);
  })
);

router.post(
  '/',
  editor,
  asyncRoute(async (req, res) => {
    const input = eventInput(req.body);
    if (!(await validateServices(input.services, req))) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const event = await events.create({ ...input, org: req.user.orgId });
    return res.status(201).json(event);
  })
);

router.put(
  '/update/:id',
  editor,
  asyncRoute(async (req, res) => {
    const input = eventInput(req.body);
    if (!(await validateServices(input.services, req))) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const event = await events.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req),
      { $set: input },
      { new: true, runValidators: true }
    );
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json(event);
  })
);

router.put(
  '/register',
  editor,
  asyncRoute(async (req, res) => {
    const { event: eventId, client: clientId } = req.query;
    const [event, client] = await Promise.all([
      events.findOne(withOrg({ _id: eventId }, req)),
      clients.findOne(withOrg({ _id: clientId }, req, 'orgs'))
    ]);
    if (!event || !client) {
      return res.status(404).json({ error: 'Client or event not found' });
    }
    const result = await events.updateOne(
      withOrg({ _id: eventId, attendees: { $ne: clientId } }, req),
      { $addToSet: { attendees: clientId } }
    );
    if (!result.modifiedCount) {
      return res.status(200).json({ message: 'Already registered' });
    }
    return res
      .status(200)
      .json(await events.findOne(withOrg({ _id: eventId }, req)));
  })
);

router.put(
  '/deregister',
  editor,
  asyncRoute(async (req, res) => {
    const { event: eventId, client: clientId } = req.query;
    const [event, client] = await Promise.all([
      events.findOne(withOrg({ _id: eventId }, req)),
      clients.findOne(withOrg({ _id: clientId }, req, 'orgs'))
    ]);
    if (!event || !client) {
      return res.status(404).json({ error: 'Client or event not found' });
    }
    const result = await events.updateOne(
      withOrg({ _id: eventId, attendees: clientId }, req),
      { $pull: { attendees: clientId } }
    );
    if (!result.modifiedCount) {
      return res.status(200).json({ message: 'Not registered' });
    }
    return res
      .status(200)
      .json(await events.findOne(withOrg({ _id: eventId }, req)));
  })
);

router.delete(
  '/:id',
  editor,
  asyncRoute(async (req, res) => {
    const filter = withOrg({ _id: req.params.id }, req);
    const event = await events.findOne(filter);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.attendees.length) {
      return res.status(409).json({
        error: "Event has attendees and can't be deleted"
      });
    }
    await events.deleteOne(filter);
    return res.json({ message: 'Event deleted successfully' });
  })
);

module.exports = router;
