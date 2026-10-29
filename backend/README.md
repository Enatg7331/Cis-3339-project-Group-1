# Backend

Express and Mongoose API. See the repository [README](../README.md) for complete local setup, environment variables, API security, seed accounts, and deployment instructions.

```powershell
npm install
npm run db:init
npm start
```

`npm run db:init` requires `MONGO_URL`, a valid 24-character `ORG_ID`, a `JWT_SECRET` of at least 32 characters, and the four `SEED_*` account values from `.env`. It is idempotent and does not reset collections. The API listens on `PORT` (3000 by default).
