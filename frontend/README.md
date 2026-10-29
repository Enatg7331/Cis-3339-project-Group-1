# Frontend

Vue 3, Vue Router, Pinia, and Vite application. See the repository [README](../README.md) for full setup and static deployment instructions.

```powershell
npm install
npm run dev
npm run lint
npm run build
npm run serve
```

Set `VITE_ROOT_API` in `.env` before building. For a deployed static build, `public/config.js` is copied into `dist/config.js`; set `window.__APP_CONFIG__.apiUrl` there to configure the API URL at runtime. Static hosts must rewrite unknown application routes to `index.html`.
