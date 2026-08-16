import { Router } from 'express';
import { ApiKeyManager } from '../services/ApiKeyManager';
import { ProjectManagerService } from '../services/ProjectManagerService';

export function createApiRoutes(
  keyManager: ApiKeyManager, 
  projectManager: ProjectManagerService
) {
  const router = Router();

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
  router.get('/projects', (req, res) => {
    res.json(projectManager.getProjects());
  });

  router.post('/projects', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const project = projectManager.createProject(name);
    res.status(201).json(project);
  });

  router.post('/projects/:id/active', (req, res) => {
    try {
      projectManager.loadActiveProject(req.params.id);
      res.json({ message: 'Active project set', projectId: req.params.id });
    } catch (e: any) {
      res.status(404).json({ error: e.message });
    }
  });

  router.delete('/projects/:id', (req, res) => {
    try {
      projectManager.deleteProject(req.params.id);
      res.json({ message: 'Project deleted' });
    } catch (e: any) {
      res.status(404).json({ error: e.message });
    }
  });

  router.get('/state', async (req, res) => {
    try {
      const ctx = projectManager.getActiveContext();
      if (!ctx) return res.status(400).json({ error: 'No active project' });
      const state = await ctx.stateService.getState();
      res.json(state);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read state' });
    }
  });

  // Agents CRUD
  router.get('/agents', async (req, res) => {
    try {
      const ctx = projectManager.getActiveContext();
      if (!ctx) return res.json([]);
      const config = await ctx.orchestrator.getAgentsConfig();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read agents config' });
    }
  });

  router.post('/agents', async (req, res) => {
    try {
      const ctx = projectManager.getActiveContext();
      if (!ctx) return res.status(400).json({ error: 'No active project' });
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
      const ctx = projectManager.getActiveContext();
      if (!ctx) return res.status(400).json({ error: 'No active project' });
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
      const ctx = projectManager.getActiveContext();
      if (!ctx) return res.status(400).json({ error: 'No active project' });
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
