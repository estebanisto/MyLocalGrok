import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';

import { WorkspaceSandbox } from './services/WorkspaceSandbox';
import { ProjectStateService } from './services/ProjectStateService';
import { ApiKeyManager } from './services/ApiKeyManager';
import { AgentOrchestrator } from './services/AgentOrchestrator';
import { ChatHistoryService } from './services/ChatHistoryService';
import { createApiRoutes } from './routes/api';
import { setupChatHandler } from './infrastructure/socket/chatHandler';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const workspaceRoot = path.resolve(__dirname, '../workspace');
const sandbox = new WorkspaceSandbox(workspaceRoot);
const stateService = new ProjectStateService(sandbox);
const keyManager = new ApiKeyManager();
const historyService = new ChatHistoryService(sandbox);
const orchestrator = new AgentOrchestrator(stateService, sandbox, keyManager);

app.use('/api', createApiRoutes(keyManager, stateService, orchestrator));

setupChatHandler(io, orchestrator, historyService);

keyManager.on('alert:keys_exhausted', () => {
  io.emit('alert:keys_exhausted');
});
keyManager.on('keysUpdated', (keys) => {
  io.emit('keysUpdated', keys);
});

stateService.on('stateUpdated', (state) => {
  io.emit('stateUpdated', state);
});

orchestrator.on('agentsUpdated', (configs) => {
  io.emit('agentsUpdated', configs);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`MyLocalGrok Backend running on port ${PORT}`);
});
