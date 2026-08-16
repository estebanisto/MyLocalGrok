import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';

import { ApiKeyManager } from './services/ApiKeyManager';
import { ProjectManagerService, ProjectContext } from './services/ProjectManagerService';
import { createApiRoutes } from './routes/api';
import { setupChatHandler } from './infrastructure/socket/chatHandler';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const keyManager = new ApiKeyManager();
const projectManager = new ProjectManagerService(keyManager);

app.use('/api', createApiRoutes(keyManager, projectManager));

setupChatHandler(io, projectManager);

keyManager.on('alert:keys_exhausted', () => {
  io.emit('alert:keys_exhausted');
});
keyManager.on('keysUpdated', (keys) => {
  io.emit('keysUpdated', keys);
});

// Broadcast events from the active project context
projectManager.on('activeProjectChanged', (ctx: ProjectContext) => {
  io.emit('activeProjectChanged', ctx.id);
  
  ctx.stateService.on('stateUpdated', (state) => {
    io.emit('stateUpdated', state);
  });
  
  ctx.orchestrator.on('agentsUpdated', (configs) => {
    io.emit('agentsUpdated', configs);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`MyLocalGrok Backend running on port ${PORT}`);
});
