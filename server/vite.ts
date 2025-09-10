import express from 'express';
import { ViteDevServer } from 'vite';
import routes from './routes.js';

export function configureServer(server: ViteDevServer) {
  // Add API routes middleware
  server.middlewares.use('/api', express.json());
  server.middlewares.use('/api', express.urlencoded({ extended: true }));
  server.middlewares.use(routes);
}