require('dotenv').config();

const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/clients', require('./routes/clients'));
app.use('/events', require('./routes/events'));
app.use('/org', require('./routes/org'));
app.use('/services', require('./routes/services'));
app.use('/users', require('./routes/users'));

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  console.error(error);
  const status =
    error.statusCode ||
    error.status ||
    (error.name === 'ValidationError' || error.name === 'CastError'
      ? 400
      : 500);
  let message = 'An unexpected server error occurred';
  if (error.statusCode) {
    message = error.message || 'Invalid request';
  } else if (error.name === 'ValidationError') {
    message = 'Request validation failed';
  } else if (error.name === 'CastError') {
    message = 'Invalid identifier';
  } else if (status < 500) {
    message = 'Invalid request';
  }
  return res.status(status).json({ error: message });
});

async function start() {
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
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('Database connection established.'))
    .catch((error) => console.error('Database connection failed:', error.name));
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start the API:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, start };
