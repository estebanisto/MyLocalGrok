import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { ApiKeyManager } from './services/ApiKeyManager';
import { ProjectManagerService, ProjectContext } from './services/ProjectManagerService';
import { createApiRoutes } from './routes/api';
import { createAuthRoutes } from './routes/auth';
import { setupChatHandler } from './infrastructure/socket/chatHandler';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'workspace', 'uploads')));

const uploadsDir = path.join(process.cwd(), 'workspace', 'uploads', 'thumbnails');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const keyManager = new ApiKeyManager();
const projectManager = new ProjectManagerService(keyManager);

app.use('/api/auth', createAuthRoutes(projectManager));
app.use('/api', createApiRoutes(keyManager, projectManager));


setupChatHandler(io, projectManager);

keyManager.on('alert:keys_exhausted', () => {
  io.emit('alert:keys_exhausted');
});
keyManager.on('keysUpdated', (keys) => {
  io.emit('keysUpdated', keys);
});

// Broadcast events from the active project context
projectManager.on('projectContextLoaded', (ctx: ProjectContext) => {
  // Only register listeners once per context
  if ((ctx as any)._listenersRegistered) return;
  (ctx as any)._listenersRegistered = true;
  
  ctx.stateService.on('stateUpdated', (state) => {
    io.to(`project_${ctx.id}`).emit('stateUpdated', state);
  });
  
  ctx.orchestrator.on('agentsUpdated', (configs) => {
    io.to(`project_${ctx.id}`).emit('agentsUpdated', configs);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`MindForge Backend running on port ${PORT}`);
});
