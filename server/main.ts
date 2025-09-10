import express from 'express';
import { createServer } from 'vite';
import routes from './routes.js';

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use(routes);

// Setup Vite in middleware mode for development
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'spa',
});

app.use(vite.ssrFixStacktrace);
app.use(vite.middlewares);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});