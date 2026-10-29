require('dotenv').config();

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { clients, events, orgs, services, users } = require('../models/models');

function stableId(label) {
  return new mongoose.Types.ObjectId(
    crypto
      .createHash('sha256')
      .update(`cis3339:${label}`)
      .digest('hex')
      .slice(0, 24)
  );
}

function validateConfiguration() {
  const missing = ['MONGO_URL', 'ORG_ID', 'JWT_SECRET'].filter(
    (key) => !process.env[key]
  );
  if (missing.length) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  if (!/^[a-f\d]{24}$/i.test(process.env.ORG_ID)) {
    throw new Error('ORG_ID must be a 24-character MongoDB ObjectId');
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  if (
    !process.env.SEED_VIEWER_USERNAME ||
    !process.env.SEED_VIEWER_PASSWORD ||
    !process.env.SEED_EDITOR_USERNAME ||
    !process.env.SEED_EDITOR_PASSWORD
  ) {
    throw new Error(
      'All four SEED_VIEWER_* and SEED_EDITOR_* values are required'
    );
  }
  if (process.env.SEED_VIEWER_USERNAME === process.env.SEED_EDITOR_USERNAME) {
    throw new Error('Viewer and editor usernames must be different');
  }
}

async function seedUser(username, password, name, role, orgId) {
  const passwordHash = await bcrypt.hash(password, 10);
  await users.updateOne(
    { username, org: orgId },
    {
      $set: { password: passwordHash, name, role },
      $setOnInsert: {
        _id: stableId(`user:${orgId}:${username}`),
        username,
        org: orgId
      }
    },
    { upsert: true, runValidators: true }
  );
}

async function initialize() {
  validateConfiguration();
  const orgId = new mongoose.Types.ObjectId(process.env.ORG_ID);
  const viewerUsername = process.env.SEED_VIEWER_USERNAME;
  const editorUsername = process.env.SEED_EDITOR_USERNAME;

  await mongoose.connect(process.env.MONGO_URL);
  await Promise.all([
    orgs.updateOne(
      { _id: orgId },
      {
        $setOnInsert: {
          name: process.env.ORG_NAME || 'Community Health Organization'
        }
      },
      { upsert: true }
    ),
    seedUser(
      viewerUsername,
      process.env.SEED_VIEWER_PASSWORD,
      'Demo Viewer',
      'viewer',
      orgId
    ),
    seedUser(
      editorUsername,
      process.env.SEED_EDITOR_PASSWORD,
      'Demo Editor',
      'editor',
      orgId
    )
  ]);

  const sampleIds = Array.from({ length: 15 }, (_, index) => {
    const sampleNumber = String(index + 1).padStart(2, '0');
    return {
      clientId: stableId(`client:${orgId}:sample:${index}`),
      serviceId: stableId(`service:${orgId}:sample:${index}`),
      eventId: stableId(`event:${orgId}:sample:${index}`),
      sampleNumber
    };
  });
  for (const [index, sample] of sampleIds.entries()) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - index);
    await Promise.all([
      clients.updateOne(
        { _id: sample.clientId },
        {
          $setOnInsert: {
            _id: sample.clientId,
            firstName: `Taylor${sample.sampleNumber}`,
            lastName: `Sample${sample.sampleNumber}`,
            phoneNumber: { primary: `555-01${String(index).padStart(2, '0')}` },
            address: {
              city: 'Houston',
              zip: `770${String(index).padStart(2, '0')}`
            },
            orgs: [orgId]
          }
        },
        { upsert: true }
      ),
      services.updateOne(
        { _id: sample.serviceId },
        {
          $setOnInsert: {
            _id: sample.serviceId,
            name: `Community Service ${sample.sampleNumber}`,
            description: `Sample community support service ${sample.sampleNumber}`,
            status: 'Active',
            org: orgId
          }
        },
        { upsert: true }
      ),
      events.updateOne(
        { _id: sample.eventId },
        {
          $setOnInsert: {
            _id: sample.eventId,
            org: orgId,
            name: `Community Event ${sample.sampleNumber}`,
            date,
            address: { city: 'Houston', zip: '77002' },
            description: `Sample event ${sample.sampleNumber} created by db:init`,
            services: [sample.serviceId],
            attendees: []
          }
        },
        { upsert: true }
      )
    ]);
  }
  await events.updateOne(
    { _id: sampleIds[0].eventId, org: orgId },
    { $addToSet: { attendees: sampleIds[0].clientId } }
  );
  await Promise.all([
    orgs.collection.createIndex({ _id: 1 }, { unique: true }),
    users.collection.createIndex({ username: 1, org: 1 }, { unique: true }),
    clients.collection.createIndex({ orgs: 1 }),
    events.collection.createIndex({ org: 1 }),
    services.collection.createIndex({ org: 1 })
  ]);

  console.log('Database initialized successfully.');
  console.log(`Organization: ${orgId}`);
  console.log(`Viewer account: ${viewerUsername}`);
  console.log(`Editor account: ${editorUsername}`);
  console.log(
    'Seeded 15 sample clients, services, events, and an event registration.'
  );
}

initialize()
  .catch((error) => {
    const message =
      error.name === 'MongoServerSelectionError'
        ? 'Unable to connect to MongoDB; check MONGO_URL and network access'
        : error.message;
    console.error('Database initialization failed:', message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
  });
