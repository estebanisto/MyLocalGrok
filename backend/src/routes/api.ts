import { Router, Response } from 'express';
import { ApiKeyManager } from '../services/ApiKeyManager';
import { ProjectManagerService } from '../services/ProjectManagerService';
import { authMiddleware, AuthRequest } from '../middlewares/authMiddleware';
import * as fs from 'fs';
import * as path from 'path';
const archiver = require('archiver');

export function createApiRoutes(
  keyManager: ApiKeyManager, 
  projectManager: ProjectManagerService
) {
  const router = Router();

  // Apply auth middleware to all API routes
  router.use(authMiddleware);

  router.get('/keys', (req, res) => {
    res.json(keyManager.getPublicKeys());
  });

  router.post('/keys', (req, res) => {
    const { key } = req.body;
    if (key) {
      keyManager.addKey(key);
      res.status(201).json({ message: 'Key added' });
    } else {
      res.status(400).json({ error: 'Key is required' });
    }
  });

  router.delete('/keys/:id', (req, res) => {
    keyManager.removeKey(req.params.id);
    res.json({ message: 'Key removed' });
  });

  // Project Management
  router.get('/projects', (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    res.json(projectManager.getProjectsForUser(userId, role));
  });

  router.post('/projects', (req: AuthRequest, res: Response) => {
    const { name } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;
    
    if (role !== 'admin' && role !== 'team_lead') {
      return res.status(403).json({ error: 'Forbidden: Only Admin or Team Lead can create projects' });
    }
    
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    try {
      const project = projectManager.createProject(name, userId);
      res.status(201).json(project);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/projects/:id/active', (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    try {
      projectManager.loadActiveProject(req.params.id as string, userId, role);
      res.json({ message: 'Active project set', projectId: req.params.id });
    } catch (e: any) {
      res.status(404).json({ error: e.message });
    }
  });

  router.delete('/projects/:id', (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    try {
      projectManager.deleteProject(req.params.id as string, userId, role);
      res.json({ message: 'Project deleted' });
    } catch (e: any) {
      res.status(404).json({ error: e.message });
    }
  });

  router.get('/projects/:id/download', (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const projectId = req.params.id as string;

    try {
      // Use loadActiveProject logic to verify access (it throws if unauthorized)
      projectManager.loadActiveProject(projectId, userId, role);

      const projectDir = path.resolve(process.cwd(), 'workspace', 'projects', projectId);
      
      if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: 'Project directory not found' });
      }

      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=project-${projectId}.zip`
      });

      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err: any) => {
        throw err;
      });

      archive.pipe(res);
      archive.directory(projectDir, false);
      archive.finalize();

    } catch (e: any) {
      res.status(403).json({ error: e.message });
    }
  });

  router.get('/projects/:id/assignments', (req: AuthRequest, res: Response) => {
    try {
      const assignments = projectManager.getProjectAssignments(req.params.id as string);
      res.json(assignments);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/projects/:id/assignments', (req: AuthRequest, res: Response) => {
    const { userId: targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'userId is required' });
    
    try {
      projectManager.assignUserToProject(
        req.params.id as string, 
        targetUserId, 
        req.user!.id, 
        req.user!.role
      );
      res.status(201).json({ message: 'User assigned successfully' });
    } catch (e: any) {
      res.status(403).json({ error: e.message });
    }
  });

  router.delete('/projects/:id/assignments/:userId', (req: AuthRequest, res: Response) => {
    try {
      projectManager.removeUserFromProject(
        req.params.id as string, 
        req.params.userId as string, 
        req.user!.id, 
        req.user!.role
      );
      res.json({ message: 'User removed successfully' });
    } catch (e: any) {
      res.status(403).json({ error: e.message });
    }
  });

  router.get('/state', async (req, res) => {
    try {
      const projectId = req.headers['x-project-id'] as string;
      if (!projectId) return res.status(400).json({ error: 'x-project-id header missing' });
      const ctx = projectManager.getContext(projectId);
      if (!ctx) return res.status(404).json({ error: 'Project not loaded or not found' });
      const state = await ctx.stateService.getState();
      res.json(state);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read state' });
    }
  });

  // Agents CRUD
  router.get('/agents', async (req, res) => {
    try {
      const projectId = req.headers['x-project-id'] as string;
      if (!projectId) return res.json([]);
      const ctx = projectManager.getContext(projectId);
      if (!ctx) return res.json([]);
      const config = await ctx.orchestrator.getAgentsConfig();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read agents config' });
    }
  });

  router.post('/agents', async (req, res) => {
    try {
      const projectId = req.headers['x-project-id'] as string;
      if (!projectId) return res.status(400).json({ error: 'x-project-id header missing' });
      const ctx = projectManager.getContext(projectId);
      if (!ctx) return res.status(404).json({ error: 'Project not loaded or not found' });
      const config = await ctx.orchestrator.getAgentsConfig();
      config.push(req.body);
      await ctx.orchestrator.updateAgentsConfig(config);
      res.status(201).json(req.body);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add agent' });
    }
  });

  router.put('/agents/:id', async (req, res) => {
    try {
      const projectId = req.headers['x-project-id'] as string;
      if (!projectId) return res.status(400).json({ error: 'x-project-id header missing' });
      const ctx = projectManager.getContext(projectId);
      if (!ctx) return res.status(404).json({ error: 'Project not loaded or not found' });
      let config = await ctx.orchestrator.getAgentsConfig();
      config = config.map(a => a.id === req.params.id ? { ...a, ...req.body } : a);
      await ctx.orchestrator.updateAgentsConfig(config);
      res.json({ message: 'Agent updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  router.delete('/agents/:id', async (req, res) => {
    try {
      const projectId = req.headers['x-project-id'] as string;
      if (!projectId) return res.status(400).json({ error: 'x-project-id header missing' });
      const ctx = projectManager.getContext(projectId);
      if (!ctx) return res.status(404).json({ error: 'Project not loaded or not found' });
      let config = await ctx.orchestrator.getAgentsConfig();
      config = config.filter(a => a.id !== req.params.id);
      await ctx.orchestrator.updateAgentsConfig(config);
      res.json({ message: 'Agent deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  });

  return router;
}
